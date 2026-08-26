import type { ImmigrationService } from "@/types/immimap";
import { getCatalogServices } from "@/lib/catalog-data";
import {
  fetchOrganizations,
  fetchServiceCategoryCounts,
  organizationToImmigrationService,
  type ServiceCategoryCount,
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

function countCategoriesFromCatalog(): ServiceCategoryCount[] {
  const counts = new Map<string, number>();
  for (const service of getCatalogServices()) {
    for (const category of service.services_offered) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Live service-category counts for the homepage wayfinding board. Falls back
 * to counts derived from the static catalog when Supabase isn't configured
 * (local dev without env vars) so the board never shows fake numbers.
 */
export async function getServiceCategoryCounts(): Promise<ServiceCategoryCount[]> {
  if (!isSupabaseConfigured()) {
    return countCategoriesFromCatalog();
  }

  try {
    const counts = await fetchServiceCategoryCounts();
    return counts.length > 0 ? counts : countCategoriesFromCatalog();
  } catch {
    return countCategoriesFromCatalog();
  }
}
