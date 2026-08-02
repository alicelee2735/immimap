import type { ImmigrationService, USState } from "@/types/immimap";
import { US_STATE_NAMES } from "@/lib/us-states";

export type LocationSuggestion = {
  city: string;
  state: USState;
  label: string;
  count: number;
};

export function extractCityFromAddress(address: string): string {
  const parts = address.split(",");
  if (parts.length < 2) {
    return "";
  }
  return parts[1]?.trim() ?? "";
}

export function getServiceCity(service: ImmigrationService): string {
  const fromField = service.city?.trim();
  if (fromField) {
    return fromField;
  }
  return extractCityFromAddress(service.address);
}

export function matchesOrganizationQuery(
  service: ImmigrationService,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const city = getServiceCity(service).toLowerCase();
  const stateName = (US_STATE_NAMES[service.state] ?? "").toLowerCase();
  return (
    service.name.toLowerCase().includes(normalized) ||
    city.includes(normalized) ||
    service.address.toLowerCase().includes(normalized) ||
    service.state.toLowerCase().includes(normalized) ||
    stateName.includes(normalized)
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

export function filterServicesByCity(
  services: ImmigrationService[],
  city: string,
  state?: string | null,
): ImmigrationService[] {
  const normalizedCity = city.trim().toLowerCase();
  if (!normalizedCity) {
    return services;
  }

  return services.filter((service) => {
    if (getServiceCity(service).toLowerCase() !== normalizedCity) {
      return false;
    }
    if (state && service.state !== state) {
      return false;
    }
    return true;
  });
}

export function collectLocationSuggestions(
  services: ImmigrationService[],
  query: string,
  limit = 6,
): LocationSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const byKey = new Map<string, LocationSuggestion>();

  for (const service of services) {
    const city = getServiceCity(service);
    if (!city) continue;

    const label = `${city}, ${service.state}`;
    const haystack = `${city} ${service.state} ${label}`.toLowerCase();
    if (!haystack.includes(normalized)) {
      continue;
    }

    const key = `${city.toLowerCase()}|${service.state}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    byKey.set(key, {
      city,
      state: service.state,
      label,
      count: 1,
    });
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}
