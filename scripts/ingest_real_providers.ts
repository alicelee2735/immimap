/**
 * Ingest 500+ VERIFIED DOJ EOIR Recognition & Accreditation (R&A) providers
 * into Supabase. Data is parsed from the official public roster — not synthetic.
 *
 * Source roster (saved locally for reproducible builds):
 *   scripts/data/doj-ra-roster-by-state.md
 *   https://www.justice.gov/eoir/recognition-accreditation-roster-reports
 *
 * Parsed providers:
 *   scripts/data/doj-ra-providers.json
 *
 * Usage:
 *   npx tsx scripts/ingest_real_providers.ts
 *   # or:
 *   npm run db:ingest-real
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error no bundled types for ws in this script context
import ws from "ws";

type RawProvider = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string | null;
  pricing: string;
  type: "NGO" | "Law Firm";
  services_offered: string[];
  description: string;
  source: string;
};

type GeoPoint = { lat: number; lng: number };

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
const providersPath = join(__dirname, "data", "doj-ra-providers.json");
const geoCachePath = join(__dirname, "data", "zip-geo-cache.json");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(envPath);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env / .env.local",
  );
  process.exit(1);
}

if (!existsSync(providersPath)) {
  console.error(`Missing provider file: ${providersPath}`);
  process.exit(1);
}

const providers = JSON.parse(
  readFileSync(providersPath, "utf8"),
) as RawProvider[];

if (providers.length < 500) {
  console.error(
    `Expected 500+ verified providers, found ${providers.length}. Aborting.`,
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadGeoCache(): Record<string, GeoPoint> {
  if (!existsSync(geoCachePath)) return {};
  try {
    return JSON.parse(readFileSync(geoCachePath, "utf8")) as Record<
      string,
      GeoPoint
    >;
  } catch {
    return {};
  }
}

function saveGeoCache(cache: Record<string, GeoPoint>) {
  writeFileSync(geoCachePath, JSON.stringify(cache, null, 2));
}

/** Resolve ZIP → lat/lng via Zippopotam (real USPS zip centroids). */
async function geocodeZip(
  zip: string,
  cache: Record<string, GeoPoint>,
): Promise<GeoPoint | null> {
  const key = zip.slice(0, 5);
  if (cache[key]) return cache[key];

  const response = await fetch(`https://api.zippopotam.us/us/${key}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Zippopotam ${key}: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    places?: Array<{ latitude: string; longitude: string }>;
  };
  const place = payload.places?.[0];
  if (!place) return null;

  const point = {
    lat: Number.parseFloat(place.latitude),
    lng: Number.parseFloat(place.longitude),
  };
  cache[key] = point;
  return point;
}

async function upsertServiceOffering(name: string): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("services")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("services")
    .insert({ name })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function main() {
  console.log(
    `Loaded ${providers.length} verified DOJ R&A providers from ${providersPath}`,
  );

  const offeringIds = new Map<string, string>();
  const allOfferings = new Set<string>();
  for (const provider of providers) {
    for (const offering of provider.services_offered) {
      allOfferings.add(offering);
    }
  }
  for (const offering of allOfferings) {
    offeringIds.set(offering, await upsertServiceOffering(offering));
  }
  console.log(`Resolved ${offeringIds.size} service offerings`);

  const geoCache = loadGeoCache();
  const uniqueZips = [...new Set(providers.map((p) => p.zip.slice(0, 5)))];
  console.log(`Geocoding ${uniqueZips.length} unique ZIP codes…`);

  let geocoded = 0;
  for (const zip of uniqueZips) {
    if (geoCache[zip]) {
      geocoded += 1;
      continue;
    }
    try {
      const point = await geocodeZip(zip, geoCache);
      if (point) geocoded += 1;
      await sleep(80);
    } catch (error) {
      console.warn(`Geocode failed for ${zip}:`, error);
      await sleep(250);
    }
    if (geocoded % 50 === 0) {
      saveGeoCache(geoCache);
      console.log(`  …${geocoded}/${uniqueZips.length} ZIPs resolved`);
    }
  }
  saveGeoCache(geoCache);
  console.log(`ZIP geocode cache size: ${Object.keys(geoCache).length}`);

  let upserted = 0;
  let skipped = 0;

  for (const provider of providers) {
    const point = geoCache[provider.zip.slice(0, 5)];
    if (!point) {
      skipped += 1;
      console.warn(`Skipping (no coords): ${provider.name} (${provider.zip})`);
      continue;
    }

    // Small deterministic jitter so co-located ZIP pins do not fully stack.
    const hash = [...provider.id].reduce(
      (acc, ch) => acc + ch.charCodeAt(0),
      0,
    );
    const lat = point.lat + ((hash % 17) - 8) * 0.00015;
    const lng = point.lng + ((Math.floor(hash / 17) % 17) - 8) * 0.00015;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .upsert(
        {
          legacy_id: provider.id,
          name: provider.name,
          description: provider.description,
          website_url: provider.website,
          address: provider.address,
          city: provider.city,
          state: provider.state,
          lat,
          lng,
          org_type: provider.type,
          pricing: provider.pricing,
          thumbnail_image_url: null,
          intake_status: "OPEN",
          languages: ["English", "Spanish"],
          catchment_note: null,
        },
        { onConflict: "legacy_id" },
      )
      .select("id")
      .single();

    if (orgError) {
      console.error(`Upsert failed for ${provider.name}:`, orgError.message);
      throw orgError;
    }

    await supabase.from("org_services").delete().eq("org_id", org.id);

    const links = provider.services_offered
      .map((offering) => offeringIds.get(offering))
      .filter((id): id is string => Boolean(id))
      .map((service_id) => ({ org_id: org.id, service_id }));

    if (links.length > 0) {
      const { error: linkError } = await supabase
        .from("org_services")
        .insert(links);
      if (linkError) throw linkError;
    }

    upserted += 1;
    if (upserted % 100 === 0) {
      console.log(`  …upserted ${upserted} providers`);
    }
  }

  console.log(
    `Successfully upserted ${upserted} verified providers (skipped ${skipped} without geocode).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
