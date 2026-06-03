import type { UscisProcessingDataset, UscisProcessingRow } from "@/types/immimap";
import raw from "@/data/uscis-processing-times.json";

/**
 * USCIS processing snapshot. Replace this import with a server loader that
 * reads from Postgres, KV, or a nightly scraper artifact.
 */
export function getUscisProcessingDataset(): UscisProcessingDataset {
  return raw as UscisProcessingDataset;
}

/**
 * Returns the directional velocity delta for a single row.
 * Negative = faster (improved), positive = slower (regressed), 0 = stable.
 * Returns null when there is no previous-period data available.
 */
export function getDeltaMonths(row: UscisProcessingRow): number | null {
  if (row.previous_estimated_months === undefined) return null;
  return row.estimated_months - row.previous_estimated_months;
}

/** Distinct form codes present in the dataset, preserving insertion order. */
export function getUniqueFormTypes(data: UscisProcessingDataset): string[] {
  return [...new Set(data.rows.map((r) => r.form_type))];
}

/** Short display label for a service center name. */
export function shortOfficeName(office: string): string {
  return office
    .replace("Service Center", "SC")
    .replace("National Benefits Center", "NBC")
    .replace("Asylum Office — ", "AO ")
    .replace(" Field Office", "");
}
