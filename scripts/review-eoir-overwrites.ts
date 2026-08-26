/**
 * Shows, field by field, what an EOIR update would do to the existing rows the
 * sync flagged as duplicate candidates.
 *
 * The sync writes a fixed set of columns, so anything outside that payload is
 * left alone no matter what the roster says. This report separates the three
 * cases that matter before deciding to adopt a row: values the roster would
 * replace, values it would rewrite identically, and curated columns it never
 * touches.
 *
 * Read-only. Requires a plan from: npm run db:sync-eoir -- --report
 *
 * Usage:
 *   npx tsx scripts/review-eoir-overwrites.ts [path-to-plan.json]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createIngestClient } from "../src/lib/ingestion/eoir/client";
import { downloadRoster } from "../src/lib/ingestion/eoir/fetch-roster";
import { buildNaturalKey, toOrganizationRow } from "../src/lib/ingestion/eoir/normalize";
import { parseRoster } from "../src/lib/ingestion/eoir/parse-roster";
import { extractPdfPages, flattenLines } from "../src/lib/ingestion/eoir/pdf-text";
import { buildUpdatePayload } from "../src/lib/ingestion/eoir/sync-organizations";
import type { ExistingRow } from "../src/lib/ingestion/eoir/sync-organizations";
import type { SyncSummary } from "../src/lib/ingestion/eoir/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env.local"));

function show(value: unknown, width = 66): string {
  if (value === null || value === undefined) return "NULL";
  if (Array.isArray(value)) {
    return value.length === 0 ? "[]" : `[${value.join(", ")}]`;
  }
  if (typeof value === "object") return JSON.stringify(value);

  const text = String(value);
  return text.length > width ? `${text.slice(0, width - 1)}…` : text;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    // Coordinates are re-geocoded, so compare at ~1m rather than exactly.
    return Math.abs(a - b) < 1e-5;
  }
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function main() {
  const planPath =
    process.argv[2] ?? join(root, "scripts", "reports", "eoir-sync-plan.json");

  if (!existsSync(planPath)) {
    console.error(
      `No plan at ${planPath}.\nRun: npm run db:sync-eoir -- --report`,
    );
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(planPath, "utf8")) as SyncSummary;
  const candidates = report.duplicateCandidates ?? [];

  if (candidates.length === 0) {
    console.log("No duplicate candidates in this plan; nothing to review.");
    return;
  }

  const geocodes = new Map(
    (report.plan ?? []).map((change) => [change.naturalKey, change.geocode]),
  );

  console.log(`Re-parsing the roster to rebuild ${candidates.length} proposed rows…`);
  const download = await downloadRoster();
  const pages = await extractPdfPages(download.data);
  const parsed = parseRoster(flattenLines(pages));
  const byKey = new Map(
    parsed.records.map((record) => [buildNaturalKey(record), record]),
  );

  const supabase = await createIngestClient();

  for (const candidate of candidates) {
    const record = byKey.get(candidate.naturalKey);
    if (!record || !candidate.existingId) {
      console.log(`\n! could not rebuild ${candidate.naturalKey}; skipping`);
      continue;
    }

    const { data: current, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", candidate.existingId)
      .single();

    if (error) throw error;
    const row = current as Record<string, unknown>;

    // Run the record through the same payload builder the sync uses, so this
    // reflects the curated-wins policy rather than the raw roster row.
    const { payload, preserved } = buildUpdatePayload(
      toOrganizationRow(record, geocodes.get(candidate.naturalKey)),
      row as unknown as ExistingRow,
    );
    const proposed = payload as Record<string, unknown>;

    const changed: string[][] = [];
    const identical: string[] = [];

    for (const [column, next] of Object.entries(proposed)) {
      if (sameValue(row[column], next)) {
        identical.push(column);
        continue;
      }
      changed.push([column, show(row[column]), show(next)]);
    }

    const untouched = Object.keys(row).filter(
      (column) => !(column in proposed) && !preserved.includes(column),
    );
    const populated = untouched.filter(
      (column) =>
        row[column] !== null &&
        row[column] !== undefined &&
        !(Array.isArray(row[column]) && row[column].length === 0),
    );

    console.log(`\n${"═".repeat(74)}`);
    console.log(`${row.name}  —  ${row.city}, ${row.state}`);
    console.log(`roster: ${record.name}  —  ${record.city}, ${record.state}`);
    console.log(`${"═".repeat(74)}`);

    console.log(`\n  WOULD CHANGE (${changed.length})`);
    for (const [column, before, after] of changed) {
      console.log(`    ${column}`);
      console.log(`      now  ${before}`);
      console.log(`      new  ${after}`);
    }

    if (identical.length > 0) {
      console.log(
        `\n  REWRITTEN IDENTICALLY (${identical.length})  ${identical.join(", ")}`,
      );
    }

    if (preserved.length > 0) {
      console.log(`\n  CURATED, LEFT ALONE (${preserved.length})`);
      for (const column of preserved) {
        console.log(`    ${column} = ${show(row[column])}`);
      }
    }

    console.log(`\n  NEVER TOUCHED (${untouched.length})`);
    console.log(`    ${untouched.join(", ")}`);
    if (populated.length > 0) {
      console.log(`\n    of those, currently populated:`);
      for (const column of populated) {
        console.log(`      ${column} = ${show(row[column])}`);
      }
    }
  }

  console.log(`\n${"═".repeat(74)}`);
  console.log(
    "Nothing above was written; this report only reads the database.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
