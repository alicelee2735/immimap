import servicesExpansionJson from "@/data/services-expansion.json";
import servicesJson from "@/data/services.json";
import type { ImmigrationService } from "@/types/immimap";
import { canonicalizeWebsiteUrl } from "@/lib/website-corrections";

export function getCatalogServices(): ImmigrationService[] {
  const rows = [
    ...(servicesJson as ImmigrationService[]),
    ...(servicesExpansionJson as ImmigrationService[]),
  ];
  return rows.map((service) => ({
    ...service,
    website: canonicalizeWebsiteUrl(service.website) ?? service.website,
  }));
}
