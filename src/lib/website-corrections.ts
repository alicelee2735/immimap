/**
 * Known broken / parked organization website hosts mapped to the official URLs.
 * Used when reading org data so the UI never links to domain parking pages.
 */
const HOST_CORRECTIONS: Record<string, string> = {
  // WeCount! (Homestead, FL) — wecount.org is a GoDaddy for-sale park;
  // official site is hyphenated we-count.org (Squarespace).
  "wecount.org": "https://www.we-count.org",
  "www.wecount.org": "https://www.we-count.org",
};

/** Hosts / URL markers that indicate a domain sale or parking page. */
const PARKED_HOST_MARKERS = [
  "forsale.godaddy.com",
  "sedo.com",
  "dan.com",
  "afternic.com",
  "hugedomains.com",
  "godaddy.com/domainsearch",
  "parkingcrew.net",
];

export function canonicalizeWebsiteUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.toLowerCase();
    const correction = HOST_CORRECTIONS[host];
    if (correction) return correction;
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function isParkedOrForSaleUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return PARKED_HOST_MARKERS.some((marker) => lower.includes(marker));
}

/** Spot domain-parking landers even when they return HTTP 200. */
export function looksLikeParkedPage(html: string, finalUrl?: string): boolean {
  if (finalUrl && isParkedOrForSaleUrl(finalUrl)) return true;
  const sample = html.slice(0, 8000).toLowerCase();
  if (sample.includes("forsale.godaddy.com")) return true;
  if (sample.includes("this domain is for sale")) return true;
  if (sample.includes("domain is parked")) return true;
  if (sample.includes("buy this domain")) return true;
  // GoDaddy parking stub seen on dead orgs: onload → /lander
  if (
    sample.includes('window.location.href="/lander"') ||
    sample.includes("window.location.href='/lander'") ||
    sample.includes('location.href="/lander"')
  ) {
    return true;
  }
  if (html.length < 400 && /window\.location\s*=/.test(sample)) {
    return true;
  }
  return false;
}
