import type { Embassy } from "@/types/immimap";
import raw from "@/data/embassies.json";

/**
 * Mock embassy interview-wait dataset.
 * Replace with a live scraper reading from travel.state.gov appointment data.
 */
export function getEmbassies(): Embassy[] {
  return raw as Embassy[];
}

export type EmbassyWaitTier = "critical" | "elevated" | "normal";

/** Colour-tier for the map pin based on average wait days. */
export function getWaitTier(avgDays: number): EmbassyWaitTier {
  if (avgDays >= 300) return "critical";
  if (avgDays >= 30) return "elevated";
  return "normal";
}
