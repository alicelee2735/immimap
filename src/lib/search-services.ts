import type { ImmigrationService, USState } from "@/types/immimap";
import { US_STATE_NAMES } from "@/lib/us-states";

export type LocationSuggestion = {
  city: string;
  state: USState;
  label: string;
  count: number;
};

/** Match quality for ranking — lower is better. */
export type MatchRank = 0 | 1 | 2;

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

/**
 * The street-line portion of a full address, with the trailing city/state/ZIP
 * stripped. Distinct offices of the same organization in the same city share
 * a name and a city — the street is what actually tells them apart, so list
 * views show it alongside the city rather than repeating the full address.
 */
export function extractStreetFromAddress(
  address: string,
  city?: string | null,
): string {
  const trimmed = address.trim();
  if (!trimmed) return "";

  if (city?.trim()) {
    const marker = `, ${city.trim()},`;
    const idx = trimmed.toLowerCase().indexOf(marker.toLowerCase());
    if (idx !== -1) return trimmed.slice(0, idx).trim();
  }

  const parts = trimmed.split(",");
  if (parts.length <= 2) return parts[0]?.trim() ?? "";
  return parts.slice(0, -2).join(",").trim();
}

export function getServiceStreet(service: ImmigrationService): string {
  return extractStreetFromAddress(service.address, getServiceCity(service));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s,./_()\-]+/)
    .filter(Boolean);
}

/**
 * Prefix-first text match.
 * - Rank 0: whole-string prefix (`startsWith`)
 * - Rank 1: prefix of any whitespace/punctuation token
 * - Rank 2: mid-string substring (only when query length >= 3)
 * Short queries (< 3) never use mid-word substring matching.
 */
export function rankTextMatch(
  haystack: string,
  query: string,
): MatchRank | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;

  const target = haystack.trim().toLowerCase();
  if (!target) return null;

  if (target.startsWith(normalized)) return 0;

  const tokens = tokenize(target);
  if (tokens.some((token) => token.startsWith(normalized))) return 1;

  // No typo-tolerance / mid-word substring for very short queries.
  if (normalized.length < 3) return null;

  if (target.includes(normalized)) return 2;
  return null;
}

export function matchesText(haystack: string, query: string): boolean {
  return rankTextMatch(haystack, query) !== null;
}

/** State abbreviations must be an exact 2-letter match. */
export function matchesStateCode(code: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length !== 2) return false;
  return code.toLowerCase() === normalized;
}

export function matchesStateName(name: string, query: string): boolean {
  return rankTextMatch(name, query) !== null;
}

export function matchesOrganizationQuery(
  service: ImmigrationService,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const city = getServiceCity(service);
  const stateName = US_STATE_NAMES[service.state] ?? "";

  return (
    matchesText(service.name, normalized) ||
    matchesText(city, normalized) ||
    matchesText(service.address, normalized) ||
    matchesStateCode(service.state, normalized) ||
    matchesStateName(stateName, normalized)
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

  return services
    .map((service) => {
      const city = getServiceCity(service);
      const stateName = US_STATE_NAMES[service.state] ?? "";
      const ranks = [
        rankTextMatch(service.name, normalized),
        rankTextMatch(city, normalized),
        matchesStateCode(service.state, normalized) ? 0 : null,
        rankTextMatch(stateName, normalized),
        rankTextMatch(service.address, normalized),
      ].filter((rank): rank is MatchRank => rank !== null);

      if (ranks.length === 0) return null;
      return { service, rank: Math.min(...ranks) as MatchRank };
    })
    .filter((entry): entry is { service: ImmigrationService; rank: MatchRank } =>
      Boolean(entry),
    )
    .sort((a, b) => a.rank - b.rank || a.service.name.localeCompare(b.service.name))
    .map((entry) => entry.service);
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

  const byKey = new Map<
    string,
    LocationSuggestion & { rank: MatchRank }
  >();

  for (const service of services) {
    const city = getServiceCity(service);
    if (!city) continue;

    const stateName = US_STATE_NAMES[service.state] ?? "";
    const cityRank = rankTextMatch(city, normalized);
    const stateCodeMatch = matchesStateCode(service.state, normalized);
    const stateNameRank = rankTextMatch(stateName, normalized);

    const ranks: MatchRank[] = [];
    if (cityRank !== null) ranks.push(cityRank);
    if (stateCodeMatch) ranks.push(0);
    if (stateNameRank !== null) ranks.push(stateNameRank);
    if (ranks.length === 0) continue;

    const rank = Math.min(...ranks) as MatchRank;
    const key = `${city.toLowerCase()}|${service.state}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      existing.rank = Math.min(existing.rank, rank) as MatchRank;
      continue;
    }

    byKey.set(key, {
      city,
      state: service.state,
      label: `${city}, ${service.state}`,
      count: 1,
      rank,
    });
  }

  return Array.from(byKey.values())
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.count - a.count ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit)
    .map((entry) => ({
      city: entry.city,
      state: entry.state,
      label: entry.label,
      count: entry.count,
    }));
}
