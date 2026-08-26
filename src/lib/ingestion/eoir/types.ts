import type { USState } from "@/types/immimap";

/** One recognized-organization office as published in the roster. */
export type EoirOfficeRecord = {
  /** Organization name as printed. */
  name: string;
  /** "Principal Office", "<City> Extension Office", etc. Null when absent. */
  officeLabel: string | null;
  /** Street address, joined from the roster's wrapped address lines. */
  street: string;
  city: string;
  state: USState;
  zip: string;
  phone: string | null;
  /** MM/DD/YY as printed; null when the row omits it. */
  dateRecognized: string | null;
  expirationDate: string | null;
  status: string | null;
  /** True when the printed expiration carried the pending-renewal asterisk. */
  pendingRenewal: boolean;
  /** 1-based PDF page, kept for troubleshooting bad parses. */
  sourcePage: number;
};

/**
 * A record block the primary parser discarded because a city/state heading
 * (or EOF) arrived before a City/ST/ZIP address anchor. Logged for review so
 * silent under-counts are visible the same way geocode failures are.
 */
export type AbandonedBlock = {
  /** Lines buffered before the block was abandoned. */
  lines: string[];
  /** Best-effort organization name taken from the first buffered line. */
  name: string | null;
  /** 1-based PDF page of the line that closed the block. */
  sourcePage: number;
  /** What closed the block without an address. */
  reason: "state_heading" | "city_heading" | "unsupported_region" | "end_of_section";
};

export type ParseDiagnostics = {
  linesScanned: number;
  /** Lines dropped because a record block ended without an address anchor. */
  abandonedBlocks: number;
  /** The abandoned blocks themselves — for review, not silently counted. */
  abandoned: AbandonedBlock[];
  /** Records missing a resolvable state, city, or ZIP. */
  incompleteRecords: number;
  /** Which parser produced the returned records. */
  parser: "primary" | "fallback";
  /** Report date printed on the roster cover page, if found. */
  reportUpdatedAt: string | null;
};

export type ParsedRoster = {
  records: EoirOfficeRecord[];
  diagnostics: ParseDiagnostics;
};

export type GeocodeStatus = "matched" | "unmatched" | "error";

export type GeocodeResult = {
  lat: number | null;
  lng: number | null;
  status: GeocodeStatus;
  /** Which provider resolved (or failed) the address. */
  provider: string;
  matchedAddress?: string;
  error?: string;
};

export type GeocodeRequest = {
  /** Correlation id echoed back by the provider. */
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

/** Reports batch-level progress on long geocoding runs. */
export type GeocodeProgress = (done: number, total: number) => void;

/**
 * Pluggable geocoder. The Census provider is primary; a paid provider can be
 * dropped in behind the same contract for addresses Census cannot resolve.
 */
export type Geocoder = {
  readonly name: string;
  geocode(
    requests: GeocodeRequest[],
    onProgress?: GeocodeProgress,
  ): Promise<Map<string, GeocodeResult>>;
};

/** What the planner intends to do with one parsed record. */
export type PlannedAction = "insert" | "update" | "rekey" | "duplicate" | "skip";

/** A stored or incoming name that looks like a street address. */
export type AddressLikeNameFlag = {
  name: string;
  city: string | null;
  state: string | null;
  /** Incoming roster record vs an already-stored row. */
  source: "incoming" | "existing";
  existingId?: string;
  legacyId?: string | null;
  reasons: string[];
};

export type PlannedChange = {
  action: PlannedAction;
  naturalKey: string;
  name: string;
  city: string;
  state: string;
  /** Existing row id when the record matched something already stored. */
  existingId?: string;
  /** Prior legacy_id when this is a rekey of a v1-keyed row. */
  previousKey?: string;
  /** Name of the existing row a duplicate candidate collided with. */
  conflictsWith?: string;
  /** Name-similarity score behind a duplicate flag, in [0, 1]. */
  matchScore?: number;
  /** Tokens the duplicate flag rests on, so a reviewer can judge it. */
  matchedOn?: string[];
  geocode?: GeocodeResult;
};

export type SyncSummary = {
  ok: boolean;
  dryRun: boolean;
  sourceUrl: string;
  reportUpdatedAt: string | null;
  parser: ParseDiagnostics["parser"];
  rowsParsed: number;
  rowsProcessed: number;
  inserted: number;
  updated: number;
  rekeyed: number;
  /**
   * Roster records withheld from insertion because they matched an existing
   * row (any legacy_id scheme) above the duplicate-detection threshold. Never
   * inserted and never auto-resolved — a human must resolve the match (e.g.
   * backfill legacy_id onto the existing row) before a future run will
   * insert this record. See duplicateCandidates for what each one matched.
   */
  skipped: number;
  duplicatesFlagged: number;
  geocodeMatched: number;
  geocodeFailed: number;
  regeocodedExisting: number;
  /**
   * Curated field values left in place because the roster has no authority
   * over them (name, description, pricing, intake status).
   */
  curatedPreserved: number;
  /**
   * Roster records that look like an existing row, regardless of whether
   * that row already carries a legacy_id under some other key scheme. Every
   * entry here corresponds to a `skip`-actioned record in `plan` — the sync
   * never mutates the existing row and never inserts the new one.
   */
  duplicateCandidates: PlannedChange[];
  /** Records whose address no geocoder could resolve. */
  geocodeFailures: Array<{ name: string; city: string; state: string; reason: string }>;
  /**
   * Record blocks the parser discarded before an address anchor. Surfaced the
   * same way as geocodeFailures so under-counts are reviewable.
   */
  parseAbandonments: AbandonedBlock[];
  /**
   * Names that look like addresses (digit, Extension/Suite, street suffix).
   * Flagged for review; the sync still writes the row.
   */
  addressLikeNames: AddressLikeNameFlag[];
  /** Full per-record plan. Only populated when explicitly requested. */
  plan?: PlannedChange[];
  /** Non-fatal problems; a populated list still returns ok when rows landed. */
  warnings: string[];
  errors: string[];
  durationMs: number;
};
