import type { ImmigrationService } from "@/types/immimap";

export function extractCityFromAddress(address: string): string {
  const parts = address.split(",");
  if (parts.length < 2) {
    return "";
  }
  return parts[1]?.trim() ?? "";
}

export function matchesOrganizationQuery(
  service: ImmigrationService,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const city = extractCityFromAddress(service.address).toLowerCase();
  return (
    service.name.toLowerCase().includes(normalized) ||
    city.includes(normalized) ||
    service.address.toLowerCase().includes(normalized)
  );
}

export function filterServicesByQuery(
  services: ImmigrationService[],
  query: string,
): ImmigrationService[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return services;
  }

  return services.filter((service) =>
    matchesOrganizationQuery(service, normalized),
  );
}
