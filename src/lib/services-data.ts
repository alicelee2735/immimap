import type { ImmigrationService } from "@/types/immimap";
import services from "@/data/services.json";

/**
 * Typed accessor for the mock services catalog.
 * Swap `services.json` for a CMS fetch or `getServices()` DB call without changing UI modules.
 */
export function getServices(): ImmigrationService[] {
  return services as ImmigrationService[];
}
