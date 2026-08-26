/**
 * Orchestrates the EOIR roster → `organizations` sync.
 *
 * Design notes:
 *  - Idempotent by construction: every row is addressed by a deterministic
 *    natural key stored in `organizations.legacy_id` (UNIQUE), so repeat runs
 *    update in place instead of inserting.
 *  - Dry run is the default. Nothing is written unless `apply` is set.
 *  - Rows written by the previous ingest used a key format without an address
 *    component. Those are re-keyed in place rather than duplicated.
 *  - Every existing row — regardless of which legacy_id scheme it already
 *    carries, or whether it has one at all — is eligible for fuzzy matching.
 *    A record that fuzzy-matches an existing row above the matcher's own
 *    acceptance threshold is never inserted: it is skipped and logged to
 *    `duplicateCandidates` for a human to resolve (typically by backfilling
 *    legacy_id onto the existing row), and will keep being skipped on every
 *    future run until that happens.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { MIN_EXPECTED_RECORDS } from "@/lib/ingestion/eoir/constants";
import { createIngestClient } from "@/lib/ingestion/eoir/client";
import { downloadRoster } from "@/lib/ingestion/eoir/fetch-roster";
import {
  censusGeocoder,
  chainGeocoders,
  createPaidGeocoderStub,
} from "@/lib/ingestion/eoir/geocode";
import {
  DuplicateMatcher,
  zipFromAddress,
  type MatchCandidate,
} from "@/lib/ingestion/eoir/match";
import {
  buildLegacyKeyV1,
  buildNaturalKey,
  toGeocodeRequest,
  toOrganizationRow,
  type OrganizationUpsert,
} from "@/lib/ingestion/eoir/normalize";
import { parseRoster } from "@/lib/ingestion/eoir/parse-roster";
import { extractPdfPages, flattenLines } from "@/lib/ingestion/eoir/pdf-text";
import type {
  AddressLikeNameFlag,
  EoirOfficeRecord,
  GeocodeResult,
  PlannedChange,
  SyncSummary,
} from "@/lib/ingestion/eoir/types";
import { addressLikeNameReasons } from "@/lib/ingestion/eoir/validate-name";

export type SyncOptions = {
  /** Write to the database. When false (default) the run only reports. */
  apply?: boolean;
  /** Cap records processed; useful for smoke tests. */
  limit?: number;
  /** Skip geocoding entirely (parse/plan only). */
  skipGeocode?: boolean;
  /**
   * Replace coordinates on rows that already exist. Existing rows were
   * seeded from ZIP centroids with synthetic jitter, so refreshing them is
   * usually desirable.
   */
  regeocodeExisting?: boolean;
  /** Emit progress lines. */
  verbose?: boolean;
  /** Include the full per-record plan in the summary (for report files). */
  includePlan?: boolean;
};

export type ExistingRow = {
  id: string;
  legacy_id: string | null;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  pricing: string | null;
  intake_status: string | null;
  languages: string[] | null;
};

const WRITE_CHUNK_SIZE = 200;

const EXISTING_ROW_COLUMNS =
  "id, legacy_id, name, city, state, address, lat, lng, description, pricing, intake_status, languages";

/**
 * Columns the roster has no authority over. EOIR publishes neither a price nor
 * an intake status — the pipeline defaults both — and its description is
 * generated boilerplate. Overwriting a human's value with any of those would
 * assert something the source does not say, so an update only fills them in
 * when the row has nothing there.
 *
 * `name` belongs here for a different reason. EOIR prints the legal entity
 * name, identically for every office of a multi-site organization, so a
 * curated name carrying its locality ("World Relief Sacramento") is strictly
 * more useful in a list than the roster's ("World Relief"). Nothing is lost by
 * keeping it: the natural key embeds the name slug, so a genuine EOIR rename
 * mints a new key and inserts a row rather than updating this one — an update
 * only ever runs when the roster name already matches.
 *
 * `languages` belongs here so the roster's English baseline only ever fills
 * an empty gap. It must never clobber a real, human-confirmed language list
 * (see the `languages_confirmed` handling below, which travels with it).
 */
const CURATED_COLUMNS = [
  "name",
  "description",
  "pricing",
  "intake_status",
  "languages",
] as const;

/** Treats an empty array the same as null/undefined/"" — nothing curated stored yet. */
function isPopulated(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export type OrganizationUpdate = Partial<OrganizationUpsert> & {
  legacy_id: string;
};

/** Drops roster values that would clobber a curated one. */
export function buildUpdatePayload(
  row: OrganizationUpsert,
  previous: ExistingRow | undefined,
): { payload: OrganizationUpdate; preserved: string[] } {
  const payload: OrganizationUpdate = { ...row };
  const preserved: string[] = [];

  // Roster data is never a manual review. Inserts send verified: false;
  // updates must not touch a human's later decision.
  delete payload.verified;
  preserved.push("verified");

  for (const column of CURATED_COLUMNS) {
    const current = previous?.[column];
    if (!isPopulated(current)) continue;

    delete payload[column];
    preserved.push(column);
  }

  // languages_confirmed travels with languages: it only ever transitions
  // empty → "English, unconfirmed" alongside a freshly-filled languages gap.
  // It never overwrites a value a human (or an earlier sync run) already
  // set, and a sync never marks anything confirmed on its own.
  if (isPopulated(previous?.languages)) {
    delete payload.languages_confirmed;
  } else {
    payload.languages_confirmed = false;
  }

  return { payload, preserved };
}

function flagAddressLikeNames(
  records: EoirOfficeRecord[],
  existing: ExistingRow[],
): AddressLikeNameFlag[] {
  const flags: AddressLikeNameFlag[] = [];

  for (const row of existing) {
    const reasons = addressLikeNameReasons(row.name);
    if (reasons.length === 0) continue;
    flags.push({
      name: row.name,
      city: row.city,
      state: row.state,
      source: "existing",
      existingId: row.id,
      legacyId: row.legacy_id,
      reasons,
    });
  }

  for (const record of records) {
    const reasons = addressLikeNameReasons(record.name);
    if (reasons.length === 0) continue;
    flags.push({
      name: record.name,
      city: record.city,
      state: record.state,
      source: "incoming",
      reasons,
    });
  }

  return flags;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function fetchExistingRows(
  supabase: SupabaseClient,
): Promise<ExistingRow[]> {
  const rows: ExistingRow[] = [];
  const pageSize = 1000;

  // Supabase caps rows per response; page until exhausted.
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("organizations")
      .select(EXISTING_ROW_COLUMNS)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as ExistingRow[]));
    if (data.length < pageSize) break;
  }

  return rows;
}

/**
 * Decides insert / update / rekey per record and flags — then blocks — likely
 * duplicates of existing rows. Pure so it can be reasoned about without a
 * database.
 */
export function planChanges(
  records: EoirOfficeRecord[],
  existing: ExistingRow[],
): { changes: PlannedChange[]; duplicates: PlannedChange[] } {
  const byKey = new Map<string, ExistingRow>();

  for (const row of existing) {
    if (row.legacy_id) byKey.set(row.legacy_id, row);
  }

  // Every existing row is a fuzzy-match candidate, regardless of whether it
  // already carries a legacy_id under some other key scheme. A `svc-*` row
  // being resolved against the hand-seed scheme says nothing about whether
  // it has ever been reconciled against the EOIR (`doj-ra-*`) scheme — that
  // gap is exactly what let curated and EOIR-synced rows for the same real
  // organization coexist undetected (see
  // scripts/audit-duplicate-organizations.ts). Exact-key lookups below still
  // short-circuit same-scheme matches before any fuzzy comparison runs, so a
  // row already reconciled under its own scheme is never double-flagged
  // against itself.
  const candidates: MatchCandidate[] = existing.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    zip: zipFromAddress(row.address),
  }));

  // Rarity weights come from the roster itself, so "immigration" is discounted
  // and an acronym like "CRLAF" carries weight.
  const matcher = new DuplicateMatcher(
    records.map((record) => record.name),
    candidates,
  );

  const changes: PlannedChange[] = [];
  const duplicates: PlannedChange[] = [];
  // A v1 key can describe several offices; only the first may claim the row.
  const claimedV1 = new Set<string>();

  for (const record of records) {
    const naturalKey = buildNaturalKey(record);
    const v1Key = buildLegacyKeyV1(record);

    const base = {
      naturalKey,
      name: record.name,
      city: record.city,
      state: record.state,
    };

    const exact = byKey.get(naturalKey);
    if (exact) {
      changes.push({ ...base, action: "update", existingId: exact.id });
      continue;
    }

    const v1Row = byKey.get(v1Key);
    if (v1Row && !claimedV1.has(v1Key)) {
      claimedV1.add(v1Key);
      changes.push({
        ...base,
        action: "rekey",
        existingId: v1Row.id,
        previousKey: v1Key,
      });
      continue;
    }

    // Hard gate: a record that resembles an existing row above the matcher's
    // own acceptance threshold (near-total name containment, or a partial
    // overlap corroborated by a shared ZIP) is never inserted. Missing a real
    // duplicate silently doubles a listing forever; holding an insert back
    // is fully recoverable — a human resolves the match (typically by
    // backfilling legacy_id onto the existing row) and the very next run
    // picks the record up normally. So this leans toward skipping.
    const matches = matcher.findMatches({
      name: record.name,
      city: record.city,
      state: record.state,
      zip: record.zip,
    });

    if (matches.length > 0) {
      changes.push({ ...base, action: "skip" });
      for (const match of matches) {
        duplicates.push({
          ...base,
          action: "duplicate",
          existingId: match.candidate.id,
          conflictsWith: match.candidate.name,
          matchScore: Number(match.score.toFixed(3)),
          matchedOn: match.matchedOn,
        });
      }
      continue;
    }

    changes.push({ ...base, action: "insert" });
  }

  return { changes, duplicates };
}

/**
 * Records the run outcome. Tolerates a `data_ingestion_log` that predates the
 * `source`/`details` columns so logging never breaks the sync itself.
 */
async function logRun(
  supabase: SupabaseClient,
  summary: SyncSummary,
): Promise<void> {
  const status = summary.ok ? "success" : "failed";
  const errorMessage =
    [...summary.errors, ...summary.warnings].join(" | ") || undefined;

  // Keep the audit row small: counts and provenance, not the per-record plan.
  // Abandoned blocks are few and the whole point of capturing them, so keep
  // the full list rather than a sample.
  const details = {
    ...summary,
    plan: undefined,
    duplicateCandidates: undefined,
    geocodeFailures: undefined,
    addressLikeNames: undefined,
    duplicateCandidateCount: summary.duplicateCandidates.length,
    duplicateCandidateSample: summary.duplicateCandidates.slice(0, 25),
    geocodeFailureSample: summary.geocodeFailures.slice(0, 25),
    addressLikeNameCount: summary.addressLikeNames.length,
    addressLikeNameSample: summary.addressLikeNames.slice(0, 50),
    parseAbandonmentCount: summary.parseAbandonments.length,
  };

  const { error } = await supabase.from("data_ingestion_log").insert({
    status,
    error_message: errorMessage,
    source: "eoir_organizations",
    details,
  });

  if (!error) return;

  const { error: fallbackError } = await supabase
    .from("data_ingestion_log")
    .insert({ status, error_message: errorMessage });

  if (fallbackError) {
    console.warn(
      `[eoir] could not write ingestion log: ${fallbackError.message}`,
    );
  }
}

export async function syncEoirOrganizations(
  options: SyncOptions = {},
): Promise<SyncSummary> {
  const {
    apply = false,
    limit,
    skipGeocode = false,
    regeocodeExisting = true,
    verbose = false,
    includePlan = false,
  } = options;

  const startedAt = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  const log = (message: string) => {
    if (verbose) console.log(`[eoir] ${message}`);
  };

  const summary: SyncSummary = {
    ok: false,
    dryRun: !apply,
    sourceUrl: "",
    reportUpdatedAt: null,
    parser: "primary",
    rowsParsed: 0,
    rowsProcessed: 0,
    inserted: 0,
    updated: 0,
    rekeyed: 0,
    skipped: 0,
    duplicatesFlagged: 0,
    geocodeMatched: 0,
    geocodeFailed: 0,
    regeocodedExisting: 0,
    curatedPreserved: 0,
    duplicateCandidates: [],
    geocodeFailures: [],
    parseAbandonments: [],
    addressLikeNames: [],
    warnings,
    errors,
    durationMs: 0,
  };

  const supabase = await createIngestClient();

  try {
    log("resolving and downloading roster PDF…");
    const download = await downloadRoster();
    summary.sourceUrl = download.sourceUrl;
    if (download.usedFallbackUrl) {
      warnings.push(
        "Could not resolve the roster link by label; used the last-known-good URL. The EOIR page layout may have changed.",
      );
    }

    log(`extracting text (${(download.data.length / 1024).toFixed(0)} KB)…`);
    const pages = await extractPdfPages(download.data);
    const parsed = parseRoster(flattenLines(pages));

    summary.parser = parsed.diagnostics.parser;
    summary.reportUpdatedAt = parsed.diagnostics.reportUpdatedAt;
    summary.rowsParsed = parsed.records.length;
    summary.parseAbandonments = parsed.diagnostics.abandoned;

    if (parsed.diagnostics.parser === "fallback") {
      warnings.push(
        "Primary parser under-produced; used the heading-agnostic fallback parser. Roster layout likely changed.",
      );
    }
    if (parsed.diagnostics.abandonedBlocks > 0) {
      warnings.push(
        `${parsed.diagnostics.abandonedBlocks} record block(s) ended without an address and were skipped — see parseAbandonments.`,
      );
    }

    if (parsed.records.length === 0) {
      errors.push("Parsed zero records from the roster; aborting.");
      summary.durationMs = Date.now() - startedAt;
      await logRun(supabase, summary);
      return summary;
    }

    if (parsed.records.length < MIN_EXPECTED_RECORDS) {
      warnings.push(
        `Parsed only ${parsed.records.length} records (expected at least ${MIN_EXPECTED_RECORDS}); treating this run as suspect.`,
      );
    }

    const records = typeof limit === "number"
      ? parsed.records.slice(0, limit)
      : parsed.records;
    summary.rowsProcessed = records.length;
    log(`parsed ${parsed.records.length} records via ${summary.parser} parser`);

    const existing = await fetchExistingRows(supabase);
    const { changes, duplicates } = planChanges(records, existing);
    summary.duplicatesFlagged = duplicates.length;
    summary.duplicateCandidates = duplicates;
    summary.skipped = changes.filter((c) => c.action === "skip").length;
    summary.addressLikeNames = flagAddressLikeNames(records, existing);
    if (includePlan) summary.plan = changes;

    if (summary.addressLikeNames.length > 0) {
      warnings.push(
        `${summary.addressLikeNames.length} name(s) look address-like (digit, Extension/Suite, or street suffix); flagged for review, not rewritten.`,
      );
    }

    if (summary.skipped > 0) {
      warnings.push(
        `${summary.skipped} roster record(s) withheld from insertion — they matched ${duplicates.length} existing row(s) above the duplicate-detection threshold. They will keep being skipped on every future run until a human resolves the match (e.g. backfilling legacy_id onto the existing row); see duplicateCandidates.`,
      );
    }

    const byKeyAction = new Map(changes.map((c) => [c.naturalKey, c]));
    const existingById = new Map(existing.map((row) => [row.id, row]));

    // Geocode everything being inserted, plus existing rows when refreshing
    // the ZIP-centroid coordinates they were seeded with.
    const geocodeTargets = records.filter((record) => {
      const change = byKeyAction.get(buildNaturalKey(record));
      if (!change) return false;
      // Never geocode a record that will not be written.
      if (change.action === "skip") return false;
      if (change.action === "insert") return true;
      if (regeocodeExisting) return true;

      // Otherwise only fill gaps, leaving good coordinates untouched.
      const row = change.existingId
        ? existingById.get(change.existingId)
        : undefined;
      return !row || row.lat == null || row.lng == null;
    });

    let geocodes = new Map<string, GeocodeResult>();
    if (!skipGeocode && geocodeTargets.length > 0) {
      log(`geocoding ${geocodeTargets.length} addresses via Census batch…`);
      const geocoder = chainGeocoders(
        [
          censusGeocoder,
          createPaidGeocoderStub(process.env.PAID_GEOCODER_API_KEY),
        ].filter((provider): provider is NonNullable<typeof provider> =>
          Boolean(provider),
        ),
      );

      geocodes = await geocoder.geocode(
        geocodeTargets.map(toGeocodeRequest),
        (done, total) => log(`  …geocoded ${done}/${total}`),
      );

      const targetsByKey = new Map(
        geocodeTargets.map((record) => [buildNaturalKey(record), record]),
      );

      for (const [key, result] of geocodes) {
        if (result.status === "matched") {
          summary.geocodeMatched += 1;
          continue;
        }

        summary.geocodeFailed += 1;
        const record = targetsByKey.get(key);
        if (record) {
          summary.geocodeFailures.push({
            name: record.name,
            city: record.city,
            state: record.state,
            reason: result.error ?? `${result.provider}: ${result.status}`,
          });
        }
      }
      log(
        `geocoded ${summary.geocodeMatched} matched / ${summary.geocodeFailed} failed`,
      );
    } else if (skipGeocode) {
      warnings.push("Geocoding skipped by option; coordinates left unchanged.");
    }

    const inserts: OrganizationUpsert[] = [];
    const updates: Array<{ id: string; row: OrganizationUpdate }> = [];

    for (const record of records) {
      const key = buildNaturalKey(record);
      const change = byKeyAction.get(key);
      if (!change) continue;
      // Blocked pending human resolution — never write, never geocode.
      if (change.action === "skip") continue;

      const geocode = geocodes.get(key);
      // Attach the outcome so reports can show which addresses failed and why.
      if (geocode) change.geocode = geocode;
      const row = toOrganizationRow(record, geocode);

      if (change.action === "insert") {
        inserts.push(row);
        continue;
      }

      const previous = change.existingId
        ? existingById.get(change.existingId)
        : undefined;

      // Never blank out a known coordinate because a geocode failed.
      if (row.lat == null || row.lng == null) {
        row.lat = previous?.lat ?? null;
        row.lng = previous?.lng ?? null;
      } else if (
        previous &&
        (previous.lat !== row.lat || previous.lng !== row.lng)
      ) {
        summary.regeocodedExisting += 1;
      }

      if (change.existingId) {
        const { payload, preserved } = buildUpdatePayload(row, previous);
        summary.curatedPreserved += preserved.length;
        updates.push({ id: change.existingId, row: payload });
      }
    }

    const isRekey = (row: OrganizationUpdate) =>
      byKeyAction.get(row.legacy_id)?.action === "rekey";

    if (!apply) {
      // Dry run reports the plan, so these are intended counts.
      summary.inserted = inserts.length;
      summary.rekeyed = updates.filter((u) => isRekey(u.row)).length;
      summary.updated = updates.length - summary.rekeyed;

      log("dry run — no writes performed");
      summary.ok = true;
      summary.durationMs = Date.now() - startedAt;
      return summary;
    }

    // Updates and re-keys are addressed by primary key, so a changed
    // legacy_id cannot collide with the row it is replacing.
    for (const batch of chunk(updates, WRITE_CHUNK_SIZE)) {
      for (const { id, row } of batch) {
        const { error } = await supabase
          .from("organizations")
          .update(row)
          .eq("id", id);

        if (error) {
          errors.push(`update ${row.legacy_id}: ${error.message}`);
          continue;
        }

        if (isRekey(row)) summary.rekeyed += 1;
        else summary.updated += 1;
      }
    }
    log(`updated ${summary.updated} rows, re-keyed ${summary.rekeyed}`);

    for (const batch of chunk(inserts, WRITE_CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from("organizations")
        .upsert(batch, { onConflict: "legacy_id" })
        .select("id");

      if (error) {
        errors.push(`insert batch: ${error.message}`);
        continue;
      }

      summary.inserted += data?.length ?? 0;
    }
    log(`inserted ${summary.inserted} rows`);

    // The roster has no practice-area field. Do not invent service tags.

    summary.ok = errors.length === 0;
    summary.durationMs = Date.now() - startedAt;
    await logRun(supabase, summary);
    return summary;
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Unknown ingestion failure.",
    );
    summary.ok = false;
    summary.durationMs = Date.now() - startedAt;

    try {
      await logRun(supabase, summary);
    } catch {
      // Logging must not mask the original failure.
    }

    return summary;
  }
}
