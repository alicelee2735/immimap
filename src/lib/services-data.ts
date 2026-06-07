import type { ImmigrationService } from "@/types/immimap";
import { getCatalogServices } from "@/lib/catalog-data";
import {
  fetchOrganizations,
  organizationToImmigrationService,
} from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

/**
 * Server-side catalog loader. Prefer the organizations API on the map page.
 */
export async function getServices(): Promise<ImmigrationService[]> {
  if (!isSupabaseConfigured()) {
    return getCatalogServices();
  }

  try {
    const organizations = await fetchOrganizations();
    const mapped = organizations
      .map((org) => organizationToImmigrationService(org))
      .filter((service): service is ImmigrationService => service !== null);

    return mapped.length > 0 ? mapped : getCatalogServices();
  } catch {
    return getCatalogServices();
  }
}
