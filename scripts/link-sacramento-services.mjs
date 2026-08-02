/**
 * Links org_services for Greater Sacramento organizations inserted via SQL seed.
 * Map filters require at least one of: Asylum, Family, DACA, Employment.
 *
 * Usage: node scripts/link-sacramento-services.mjs
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

/** Per-org service assignments based on public program descriptions. */
const SERVICES_BY_ORG_NAME = {
  "Opening Doors, Inc.": [
    "Asylum",
    "DACA",
    "Family",
    "Removal Defense",
    "Humanitarian Relief",
  ],
  "California Rural Legal Assistance Foundation": [
    "Asylum",
    "DACA",
    "Family",
    "Removal Defense",
    "Humanitarian Relief",
  ],
  "California Rural Legal Assistance Sacramento": [
    "Asylum",
    "Removal Defense",
    "Humanitarian Relief",
  ],
  "Sacramento Food Bank & Family Services": [
    "DACA",
    "Family",
    "Humanitarian Relief",
    "Employment",
  ],
  "World Relief Sacramento": [
    "Family",
    "DACA",
    "Employment",
    "Humanitarian Relief",
  ],
  "International Rescue Committee in Sacramento": [
    "Family",
    "DACA",
    "Employment",
    "Humanitarian Relief",
  ],
  "McGeorge School of Law Immigration Clinic": [
    "Asylum",
    "Removal Defense",
    "Family",
    "Humanitarian Relief",
  ],
  "Coalition for Humane Immigrant Rights (CHIRLA) Sacramento": [
    "DACA",
    "Family",
    "Employment",
    "Humanitarian Relief",
  ],
  "WEAVE Legal Services": [
    "Humanitarian Relief",
    "Family",
    "Removal Defense",
  ],
  "Legal Services of Northern California (Sacramento Office)": [
    "Humanitarian Relief",
    "Family",
  ],
  "California Immigration Project": [
    "Asylum",
    "Removal Defense",
    "Family",
    "Humanitarian Relief",
  ],
  "Asian Resources, Inc.": ["Family", "Employment", "DACA"],
  "CAIR California Sacramento Valley": [
    "Asylum",
    "Family",
    "Humanitarian Relief",
    "Removal Defense",
  ],
  "ValorUs Sacramento": ["Humanitarian Relief", "Family"],
  "La Familia Counseling Center": ["Family", "Humanitarian Relief"],
  "Wilner & O'Reilly, APLC": [
    "Family",
    "Employment",
    "Asylum",
    "Removal Defense",
  ],
  "Morris Law Group": [
    "Asylum",
    "Humanitarian Relief",
    "Family",
    "Removal Defense",
  ],
  "Law Office of Thi D Do": ["Family", "Employment", "Removal Defense"],
  "Mendoza Immigration": ["Family", "Employment", "Removal Defense"],
  "KILO Immigration": ["Family", "Asylum", "DACA", "Employment"],
  "Schoenleber & Waltermire, P.C.": [
    "Family",
    "Removal Defense",
    "Humanitarian Relief",
  ],
  "Law Office of Maryam Kia": [
    "Family",
    "Asylum",
    "DACA",
    "Employment",
  ],
  "Landerholm Immigration, A.P.C.": [
    "Family",
    "Asylum",
    "DACA",
    "Removal Defense",
  ],
  "Martinez Law Group": [
    "Family",
    "Asylum",
    "Humanitarian Relief",
    "Removal Defense",
  ],
  "Law Office of Clemente Montano Jimenez": [
    "Removal Defense",
    "Family",
    "Humanitarian Relief",
  ],
  "Law Office of Hitomi Lisa Kobayashi": [
    "Asylum",
    "Removal Defense",
    "Family",
    "Humanitarian Relief",
  ],
  "Carey Acree Law": ["Family", "Employment", "Asylum"],
  "Wigon Law": ["Removal Defense", "Family", "Humanitarian Relief"],
  "Yasrebi Law": ["Family", "Employment", "Asylum"],
  "Schach Law Group": [
    "Family",
    "Asylum",
    "Removal Defense",
    "Humanitarian Relief",
  ],
  "Acquest Law, Inc.": ["Family", "Employment", "Humanitarian Relief"],
};

const ALL_SERVICE_NAMES = [
  ...new Set(Object.values(SERVICES_BY_ORG_NAME).flat()),
];

async function upsertService(name) {
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
  const serviceIds = new Map();
  for (const name of ALL_SERVICE_NAMES) {
    serviceIds.set(name, await upsertService(name));
  }

  const { data: orgs, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, lat, lng, state")
    .eq("state", "CA")
    .gte("lat", 38.5)
    .lte("lat", 38.7)
    .gte("lng", -121.6)
    .lte("lng", -121.3);

  if (orgError) throw orgError;

  let linked = 0;
  let skipped = 0;

  for (const org of orgs ?? []) {
    const serviceNames = SERVICES_BY_ORG_NAME[org.name];
    if (!serviceNames) {
      console.warn(`No mapping for: ${org.name}`);
      skipped += 1;
      continue;
    }

    await supabase.from("org_services").delete().eq("org_id", org.id);

    const links = serviceNames.map((name) => ({
      org_id: org.id,
      service_id: serviceIds.get(name),
    }));

    const { error: linkError } = await supabase.from("org_services").insert(links);
    if (linkError) throw linkError;

    console.log(`Linked ${serviceNames.length} services → ${org.name}`);
    linked += 1;
  }

  console.log(`Done. Linked ${linked} organizations, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
