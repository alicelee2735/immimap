import type { UscisProcessingDataset } from "@/types/immimap";
import raw from "@/data/uscis-processing-times.json";

/**
 * Mock USCIS processing snapshot. Replace this import with a server loader that
 * reads from Postgres, KV, or a nightly scraper artifact.
 */
export function getUscisProcessingDataset(): UscisProcessingDataset {
  return raw as UscisProcessingDataset;
}
