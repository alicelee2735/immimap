import {
  USCIS_FORMS_TO_SYNC,
  USCIS_PROCESSING_API_BASE,
  VISA_BULLETIN_SOURCE_URL,
} from "@/lib/ingestion/constants";
import {
  getBundledVisaBulletinDataset,
  normalizeProcessingApiRows,
  normalizeVisaBulletinDataset,
} from "@/lib/ingestion/normalize";
import type {
  UscisProcessingRow,
  VisaBulletinDataset,
} from "@/types/immimap";

export type FetchResult<T> =
  | { ok: true; data: T; sourceUrl: string }
  | { ok: false; error: string };

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/html;q=0.9",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Attempts to verify the State Dept bulletin page is reachable.
 * Full HTML parsing is not yet implemented; returns bundled normalized data
 * when the official source responds successfully.
 */
export async function fetchVisaBulletinFromSource(): Promise<
  FetchResult<VisaBulletinDataset>
> {
  try {
    const response = await fetchWithTimeout(VISA_BULLETIN_SOURCE_URL, {
      method: "GET",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Visa bulletin source returned ${response.status}.`,
      };
    }

    const bundled = getBundledVisaBulletinDataset();
    return {
      ok: true,
      data: normalizeVisaBulletinDataset(bundled),
      sourceUrl: VISA_BULLETIN_SOURCE_URL,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reach visa bulletin source.",
    };
  }
}

export async function fetchProcessingTimesFromSource(): Promise<
  FetchResult<UscisProcessingRow[]>
> {
  const rows: UscisProcessingRow[] = [];
  const errors: string[] = [];

  for (const form of USCIS_FORMS_TO_SYNC) {
    try {
      const response = await fetchWithTimeout(
        `${USCIS_PROCESSING_API_BASE}/${form}`,
      );

      if (!response.ok) {
        errors.push(`${form}: HTTP ${response.status}`);
        continue;
      }

      const payload = (await response.json()) as {
        processing_time_data?: Array<{
          serviceCenter?: string;
          office?: string;
          total?: string;
          months?: string | number;
        }>;
      };

      rows.push(...normalizeProcessingApiRows(form, payload));
    } catch (error) {
      errors.push(
        `${form}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: errors.join("; ") || "No USCIS processing rows fetched.",
    };
  }

  return {
    ok: true,
    data: rows,
    sourceUrl: USCIS_PROCESSING_API_BASE,
  };
}
