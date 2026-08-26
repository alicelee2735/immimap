/**
 * Geocoding for roster addresses.
 *
 * The US Census Bureau batch geocoder is primary: it is free, needs no API
 * key, and resolves to rooftop/address-range level. `chainGeocoders` lets a
 * paid provider be appended for the residue Census cannot match, without the
 * caller knowing which provider answered.
 */
import {
  CENSUS_BATCH_ATTEMPTS,
  CENSUS_BATCH_LIMIT,
  CENSUS_BENCHMARK,
  CENSUS_GEOCODER_BATCH_URL,
  GEOCODE_TIMEOUT_MS,
} from "@/lib/ingestion/eoir/constants";
import type {
  Geocoder,
  GeocodeRequest,
  GeocodeResult,
} from "@/lib/ingestion/eoir/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Parses one CSV row, honoring quoted fields that contain commas. */
function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell);
  return cells;
}

/**
 * The batch endpoint requires an uploaded CSV of
 * `id,street,city,state,zip` rows with no header.
 */
function buildBatchCsv(requests: GeocodeRequest[], ids: string[]): string {
  return requests
    .map((request, index) =>
      [
        csvCell(ids[index]),
        csvCell(request.street),
        csvCell(request.city),
        csvCell(request.state),
        csvCell(request.zip),
      ].join(","),
    )
    .join("\n");
}

async function postBatch(csv: string): Promise<string> {
  const form = new FormData();
  form.append(
    "addressFile",
    new Blob([csv], { type: "text/csv" }),
    "addresses.csv",
  );
  form.append("benchmark", CENSUS_BENCHMARK);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(CENSUS_GEOCODER_BATCH_URL, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Census geocoder returned HTTP ${response.status}.`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The Census service is intermittently slow and occasionally drops a request
 * outright, so each batch gets a few attempts with backoff before its
 * addresses are written off.
 */
async function postBatchWithRetry(csv: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CENSUS_BATCH_ATTEMPTS; attempt += 1) {
    try {
      return await postBatch(csv);
    } catch (error) {
      lastError = error;
      if (attempt < CENSUS_BATCH_ATTEMPTS) {
        await sleep(attempt * 2000);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Census batch failed.");
}

/**
 * Census batch geocoder.
 *
 * Correlation ids are sequential integers rather than the natural keys,
 * because the endpoint truncates long id fields.
 */
export const censusGeocoder: Geocoder = {
  name: "census",

  async geocode(requests, onProgress) {
    const results = new Map<string, GeocodeResult>();
    if (requests.length === 0) return results;

    let completed = 0;

    for (const batch of chunk(requests, CENSUS_BATCH_LIMIT)) {
      const ids = batch.map((_, index) => String(index));
      const byId = new Map(ids.map((id, index) => [id, batch[index].id]));

      let body: string;
      try {
        body = await postBatchWithRetry(buildBatchCsv(batch, ids));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Census batch failed.";
        for (const request of batch) {
          results.set(request.id, {
            lat: null,
            lng: null,
            status: "error",
            provider: "census",
            error: message,
          });
        }
        completed += batch.length;
        onProgress?.(completed, requests.length);
        continue;
      }

      const seen = new Set<string>();

      for (const row of body.split(/\r?\n/)) {
        if (!row.trim()) continue;

        const cells = parseCsvRow(row);
        const requestId = byId.get(cells[0]);
        if (!requestId) continue;

        seen.add(requestId);

        const indicator = cells[2];
        // Census returns "x,y" — longitude first.
        const coordinates = cells[5] ?? "";
        const [lngText, latText] = coordinates.split(",");
        const lat = Number.parseFloat(latText ?? "");
        const lng = Number.parseFloat(lngText ?? "");

        if (
          indicator === "Match" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        ) {
          results.set(requestId, {
            lat,
            lng,
            status: "matched",
            provider: "census",
            matchedAddress: cells[4] || undefined,
          });
          continue;
        }

        results.set(requestId, {
          lat: null,
          lng: null,
          status: "unmatched",
          provider: "census",
          // "Tie" means multiple candidates; treated as unresolved.
          error: indicator === "Tie" ? "ambiguous match" : undefined,
        });
      }

      // Census silently omits rows it cannot process at all.
      for (const request of batch) {
        if (seen.has(request.id)) continue;
        results.set(request.id, {
          lat: null,
          lng: null,
          status: "unmatched",
          provider: "census",
          error: "omitted from Census response",
        });
      }

      completed += batch.length;
      onProgress?.(completed, requests.length);
    }

    return results;
  },
};

/**
 * Placeholder for a paid provider (Mapbox, Google, Smarty, ...). Wire the real
 * client in here and add it to the chain; the rest of the pipeline is
 * unaffected. Left unimplemented so a missing key degrades to "unmatched"
 * rather than throwing mid-run.
 */
export function createPaidGeocoderStub(
  apiKey: string | undefined,
): Geocoder | null {
  if (!apiKey) return null;

  return {
    name: "paid-stub",
    async geocode(requests) {
      const results = new Map<string, GeocodeResult>();
      for (const request of requests) {
        results.set(request.id, {
          lat: null,
          lng: null,
          status: "error",
          provider: "paid-stub",
          error:
            "Paid geocoder is configured but not implemented; add a client in geocode.ts.",
        });
      }
      return results;
    },
  };
}

/**
 * Runs geocoders in order, passing only unresolved addresses to the next one.
 */
export function chainGeocoders(providers: Geocoder[]): Geocoder {
  const active = providers.filter(Boolean);

  return {
    name: active.map((provider) => provider.name).join("+") || "none",

    async geocode(requests, onProgress) {
      const merged = new Map<string, GeocodeResult>();
      let pending = requests;

      for (const provider of active) {
        if (pending.length === 0) break;

        const batch = await provider.geocode(pending, onProgress);
        const stillPending: GeocodeRequest[] = [];

        for (const request of pending) {
          const result = batch.get(request.id);
          if (result?.status === "matched") {
            merged.set(request.id, result);
            continue;
          }
          // Keep the earliest failure for reporting if nothing later matches.
          if (!merged.has(request.id) && result) merged.set(request.id, result);
          stillPending.push(request);
        }

        pending = stillPending;
      }

      return merged;
    },
  };
}
