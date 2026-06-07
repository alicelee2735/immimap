export const OFFICIAL_DATA_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=3600";

export function jsonWithCache<T>(payload: T, init?: ResponseInit): Response {
  return Response.json(payload, {
    ...init,
    headers: {
      "Cache-Control": OFFICIAL_DATA_CACHE_CONTROL,
      ...(init?.headers ?? {}),
    },
  });
}
