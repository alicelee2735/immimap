import servicesExpansionJson from "@/data/services-expansion.json";
import servicesJson from "@/data/services.json";
import type { ImmigrationService } from "@/types/immimap";

export function getCatalogServices(): ImmigrationService[] {
  return [
    ...(servicesJson as ImmigrationService[]),
    ...(servicesExpansionJson as ImmigrationService[]),
  ];
}
