import servicesExpansionJson from "@/data/services-expansion.json";
import servicesJson from "@/data/services.json";
import type { ImmigrationService } from "@/types/immimap";
import { canonicalizeWebsiteUrl } from "@/lib/website-corrections";
import { isEoirLegacyId } from "@/lib/ingestion/eoir/constants";

export function getCatalogServices(): ImmigrationService[] {
  const rows = [
    ...(servicesJson as ImmigrationService[]),
    ...(servicesExpansionJson as ImmigrationService[]),
  ];
  return rows.map((service) => ({
    ...service,
    website: canonicalizeWebsiteUrl(service.website) ?? service.website,
    // Static catalog rows went through initial cataloging (manual review).
    verified: service.type === "NGO",
    eoirSourced: isEoirLegacyId(service.id),
  }));
}
