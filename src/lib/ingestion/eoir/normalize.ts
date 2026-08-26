/**
 * Maps parsed roster records onto the `organizations` schema.
 *
 * EOIR publishes no stable organization identifier, so the natural key is
 * synthesized. It must be deterministic across runs (or every sync inserts
 * duplicates) and unique per office (or co-located offices overwrite each
 * other — the roster really does list two distinct "Principal Office" rows
 * for the same organization, city and ZIP).
 */
import { createHash } from "node:crypto";

import {
  EOIR_ASSUMED_LANGUAGES,
  EOIR_DEFAULT_PRICING,
  EOIR_KEY_PREFIX,
  EOIR_SOURCE_ATTRIBUTION,
} from "@/lib/ingestion/eoir/constants";
import type {
  EoirOfficeRecord,
  GeocodeRequest,
  GeocodeResult,
} from "@/lib/ingestion/eoir/types";

/** Row shape written to `organizations`, excluding db-managed columns. */
export type OrganizationUpsert = {
  legacy_id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  org_type: "NGO";
  pricing: string;
  intake_status: "OPEN";
  /**
   * Inserts always land unverified. Updates must never write this column —
   * automated roster data is not a review.
   */
  verified: false;
  /** The English baseline inference — see EOIR_ASSUMED_LANGUAGES. */
  languages: string[];
  /**
   * Always false on a roster-authored row: this is an inference, never a
   * confirmed answer from the office. An update must never flip this back
   * to false once a human has confirmed a real language list (see
   * buildUpdatePayload), and never sets it true either.
   */
  languages_confirmed: false;
};

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Collapses a street address to its semantic content so trivial edits
 * ("Suite"/"Ste.", "117 South Crest" vs "117 Southcrest") do not mint a new
 * key on the next run.
 */
export function normalizeStreet(street: string): string {
  return street
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\b(suite|ste|unit|apt|apartment|room|rm|floor|fl)\b/g, "ste")
    .replace(/\b(street|str)\b/g, "st")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\b(boulevard|blvd)\b/g, "blvd")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(drive|dr)\b/g, "dr")
    .replace(/\b(north|n)\b/g, "n")
    .replace(/\b(south|s)\b/g, "s")
    .replace(/\b(east|e)\b/g, "e")
    .replace(/\b(west|w)\b/g, "w")
    .replace(/\bpo box\b/g, "pobox")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function addressFingerprint(street: string): string {
  return createHash("sha256")
    .update(normalizeStreet(street))
    .digest("hex")
    .slice(0, 8);
}

/**
 * The pre-existing key format, without an address component. Retained so the
 * sync can recognize rows written by the previous ingest and re-key them in
 * place instead of inserting duplicates.
 */
export function buildLegacyKeyV1(record: EoirOfficeRecord): string {
  return [
    EOIR_KEY_PREFIX,
    slugify(record.name),
    slugify(record.city),
    record.zip,
  ].join("-");
}

/** Stable, collision-free natural key for one roster office. */
export function buildNaturalKey(record: EoirOfficeRecord): string {
  return [
    EOIR_KEY_PREFIX,
    slugify(record.name),
    slugify(record.city),
    record.zip,
    addressFingerprint(record.street),
  ].join("-");
}

function buildDescription(record: EoirOfficeRecord): string {
  const office = record.officeLabel ? ` (${record.officeLabel})` : "";
  const recognized = record.dateRecognized
    ? ` Recognized since ${record.dateRecognized}.`
    : "";
  const pending = record.pendingRenewal
    ? " Recognition renewal pending."
    : "";

  return (
    `DOJ-recognized nonprofit immigration legal service provider${office}.` +
    `${recognized}${pending} Source: ${EOIR_SOURCE_ATTRIBUTION}.`
  );
}

/**
 * The roster prints the street separately from the city/state/ZIP, but the
 * detail panel renders `address` on its own with no locality beside it, and
 * hand-seeded rows store the whole thing. Compose it so a roster row reads the
 * same as a curated one.
 */
export function formatAddress(record: EoirOfficeRecord): string {
  return `${record.street}, ${record.city}, ${record.state} ${record.zip}`;
}

export function toGeocodeRequest(record: EoirOfficeRecord): GeocodeRequest {
  return {
    id: buildNaturalKey(record),
    street: record.street,
    city: record.city,
    state: record.state,
    zip: record.zip,
  };
}

/** Builds the row to upsert for one roster office. */
export function toOrganizationRow(
  record: EoirOfficeRecord,
  geocode: GeocodeResult | undefined,
): OrganizationUpsert {
  return {
    legacy_id: buildNaturalKey(record),
    name: record.name,
    description: buildDescription(record),
    address: formatAddress(record),
    city: record.city,
    state: record.state,
    lat: geocode?.lat ?? null,
    lng: geocode?.lng ?? null,
    // Recognition under 8 C.F.R. § 1292.11 is limited to non-profits.
    org_type: "NGO",
    pricing: EOIR_DEFAULT_PRICING,
    intake_status: "OPEN",
    // The Verified badge requires manual ImmiMap review; EOIR is not that.
    verified: false,
    // English is a safe baseline inference (see EOIR_ASSUMED_LANGUAGES doc),
    // but it is not a confirmed answer from the office.
    languages: [...EOIR_ASSUMED_LANGUAGES],
    languages_confirmed: false,
  };
}
