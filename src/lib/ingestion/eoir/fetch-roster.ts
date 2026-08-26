/**
 * Locates and downloads the current EOIR R&A roster PDF.
 *
 * The download href is a numeric justice.gov media id that changes whenever
 * EOIR republishes the roster, so it is resolved by matching the anchor's
 * visible label. A hardcoded last-known-good URL is only a final fallback.
 */
import {
  EOIR_RA_BY_STATE_FALLBACK_URL,
  EOIR_RA_BY_STATE_LINK_LABEL,
  EOIR_RA_PAGE_URL,
  FETCH_TIMEOUT_MS,
} from "@/lib/ingestion/eoir/constants";

const USER_AGENT =
  "ImmiMap-ingest/1.0 (+https://github.com/immimap; public-data sync)";

export type RosterDownload = {
  data: Uint8Array;
  sourceUrl: string;
  /** Upstream Last-Modified, when the CDN reports one. */
  lastModified: string | null;
  /** True when the URL came from the hardcoded fallback, not the live page. */
  usedFallbackUrl: boolean;
};

async function fetchWithTimeout(
  url: string,
  accept: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: accept, "User-Agent": USER_AGENT },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, " ").trim();
}

/**
 * Scrapes the roster landing page for the anchor whose text matches the
 * by-state roster label. Returns null when no anchor matches.
 */
export async function resolveRosterUrl(): Promise<string | null> {
  const response = await fetchWithTimeout(EOIR_RA_PAGE_URL, "text/html");
  if (!response.ok) {
    throw new Error(
      `EOIR roster page returned HTTP ${response.status}.`,
    );
  }

  const html = await response.text();
  const wanted = normalizeLabel(EOIR_RA_BY_STATE_LINK_LABEL);
  const anchors = html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  );

  for (const match of anchors) {
    const href = match[1];
    const label = normalizeLabel(stripTags(match[2]));
    if (!label || !href) continue;

    // Exact match first, then containment, so minor label edits still resolve.
    if (label === wanted || label.includes(wanted)) {
      return new URL(href, EOIR_RA_PAGE_URL).toString();
    }
  }

  return null;
}

/** Downloads the roster PDF, verifying the response really is a PDF. */
export async function downloadRoster(): Promise<RosterDownload> {
  let sourceUrl: string | null = null;
  let usedFallbackUrl = false;

  try {
    sourceUrl = await resolveRosterUrl();
  } catch {
    // Fall through to the known-good URL below.
  }

  if (!sourceUrl) {
    sourceUrl = EOIR_RA_BY_STATE_FALLBACK_URL;
    usedFallbackUrl = true;
  }

  const response = await fetchWithTimeout(sourceUrl, "application/pdf");
  if (!response.ok) {
    throw new Error(
      `Roster download failed: HTTP ${response.status} from ${sourceUrl}`,
    );
  }

  const data = new Uint8Array(await response.arrayBuffer());

  // justice.gov serves an HTML error page with a 200 when a media id retires.
  const isPdf =
    data.length > 4 &&
    data[0] === 0x25 &&
    data[1] === 0x50 &&
    data[2] === 0x44 &&
    data[3] === 0x46;

  if (!isPdf) {
    throw new Error(
      `Roster download from ${sourceUrl} is not a PDF (got ${
        response.headers.get("content-type") ?? "unknown content-type"
      }).`,
    );
  }

  return {
    data,
    sourceUrl,
    lastModified: response.headers.get("last-modified"),
    usedFallbackUrl,
  };
}
