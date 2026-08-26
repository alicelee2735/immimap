/**
 * Backfills the roster natural key onto the 9 hand-seeded Sacramento rows the
 * EOIR sync flagged as duplicate candidates, then dry-runs the planner against
 * just those 9 records to confirm they become updates with curated fields held.
 *
 * Write scope is intentionally narrow: only `legacy_id` on the listed ids,
 * and only when it is currently NULL. No other columns are touched.
 *
 * Usage:
 *   npx tsx scripts/adopt-eoir-duplicates.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createIngestClient } from "../src/lib/ingestion/eoir/client";
import { downloadRoster } from "../src/lib/ingestion/eoir/fetch-roster";
import { buildNaturalKey, toOrganizationRow } from "../src/lib/ingestion/eoir/normalize";
import { parseRoster } from "../src/lib/ingestion/eoir/parse-roster";
import { extractPdfPages, flattenLines } from "../src/lib/ingestion/eoir/pdf-text";
import {
  buildUpdatePayload,
  planChanges,
} from "../src/lib/ingestion/eoir/sync-organizations";
import type { ExistingRow } from "../src/lib/ingestion/eoir/sync-organizations";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env.local"));

/** The 9 pairs from the last dry-run duplicate report. */
const ADOPTIONS: Array<{ existingId: string; naturalKey: string }> = [
  {
    existingId: "56fdcd53-b40b-4dd0-acda-e3cd43b1af44",
    naturalKey: "doj-ra-asian-resources-inc-sacramento-95824-085ee9e2",
  },
  {
    existingId: "6f2106e8-ca6e-4a53-9113-5b0456ea1c7d",
    naturalKey: "doj-ra-cair-ca-sacramento-95814-bbff6596",
  },
  {
    existingId: "b933dd94-6e25-4694-96d1-25a4a619af23",
    naturalKey:
      "doj-ra-california-immigration-project-cip-sacramento-95816-02f2854e",
  },
  {
    existingId: "c5540727-e37c-43a6-91ef-1bfe483a0007",
    naturalKey:
      "doj-ra-california-rural-legal-assistance-foundation-crlaf-sacramento-95816-0492fc24",
  },
  {
    existingId: "fcced8f0-54b4-4f2d-9caf-e48b253f8f93",
    naturalKey:
      "doj-ra-coalition-for-humane-immigrant-rights-chirla-sacramento-95814-37eff7c5",
  },
  {
    existingId: "838f11f2-17dd-48e5-adb5-c7769dcaacd9",
    naturalKey:
      "doj-ra-international-rescue-committee-inc-sacramento-95825-7a5dccd5",
  },
  {
    existingId: "02ad8353-ffde-48f6-bc30-49537e8a8825",
    naturalKey: "doj-ra-opening-doors-inc-sacramento-95825-3cb3ae79",
  },
  {
    existingId: "d6a423ea-1782-4bab-b5b7-31fcdc07f1be",
    naturalKey: "doj-ra-valorus-sacramento-95814-03492994",
  },
  {
    existingId: "74d9d5de-6947-4e8f-8992-0d0f832b802f",
    naturalKey: "doj-ra-world-relief-sacramento-95825-f8ae93cd",
  },
];

const CURATED = ["name", "description", "pricing", "intake_status"] as const;

async function main() {
  const supabase = await createIngestClient();
  const ids = ADOPTIONS.map((a) => a.existingId);

  const { data: before, error: beforeError } = await supabase
    .from("organizations")
    .select(
      "id, name, description, pricing, intake_status, legacy_id, city, state, address, lat, lng",
    )
    .in("id", ids);

  if (beforeError) throw beforeError;

  const byId = new Map((before ?? []).map((row) => [row.id, row]));
  if (byId.size !== ADOPTIONS.length) {
    throw new Error(
      `Expected ${ADOPTIONS.length} rows; found ${byId.size}. Aborting.`,
    );
  }

  for (const row of before ?? []) {
    if (row.legacy_id) {
      throw new Error(
        `Refusing to overwrite existing legacy_id on ${row.id} (${row.name}): ${row.legacy_id}`,
      );
    }
  }

  console.log(`Backfilling legacy_id on ${ADOPTIONS.length} rows…`);
  for (const { existingId, naturalKey } of ADOPTIONS) {
    const { error } = await supabase
      .from("organizations")
      .update({ legacy_id: naturalKey })
      .eq("id", existingId)
      .is("legacy_id", null);

    if (error) throw error;
    console.log(`  ✓ ${byId.get(existingId)?.name}`);
    console.log(`    → ${naturalKey}`);
  }

  console.log("\nRe-parsing roster and planning just these 9 records…");
  const download = await downloadRoster();
  const pages = await extractPdfPages(download.data);
  const parsed = parseRoster(flattenLines(pages));

  const want = new Set(ADOPTIONS.map((a) => a.naturalKey));
  const records = parsed.records.filter((record) =>
    want.has(buildNaturalKey(record)),
  );

  if (records.length !== ADOPTIONS.length) {
    throw new Error(
      `Roster yielded ${records.length} of ${ADOPTIONS.length} expected keys.`,
    );
  }

  const { data: after, error: afterError } = await supabase
    .from("organizations")
    .select(
      "id, legacy_id, name, city, state, address, lat, lng, description, pricing, intake_status",
    )
    .in("id", ids);

  if (afterError) throw afterError;
  const existing = (after ?? []) as ExistingRow[];

  const { changes, duplicates } = planChanges(records, existing);

  const actions = Object.fromEntries(
    changes.map((c) => [c.action, 0] as const),
  ) as Record<string, number>;
  for (const c of changes) actions[c.action] = (actions[c.action] ?? 0) + 1;

  console.log(`\nPlanner (scoped to ${records.length} records):`);
  console.log(`  inserts     ${actions.insert ?? 0}`);
  console.log(`  updates     ${actions.update ?? 0}`);
  console.log(`  rekeys      ${actions.rekey ?? 0}`);
  console.log(`  duplicates  ${duplicates.length}`);

  let curatedOverwrites = {
    name: 0,
    description: 0,
    pricing: 0,
    intake_status: 0,
  };

  console.log("\nPer-row curated-field check (payload must omit all four):");
  for (const record of records) {
    const key = buildNaturalKey(record);
    const change = changes.find((c) => c.naturalKey === key);
    const previous = existing.find((row) => row.legacy_id === key);
    const row = toOrganizationRow(record, undefined);
    const { payload, preserved } = buildUpdatePayload(row, previous);

    for (const column of CURATED) {
      if (column in payload) curatedOverwrites[column] += 1;
    }

    console.log(
      `  ${change?.action ?? "?"}  "${previous?.name}"  preserved=[${preserved.join(", ")}]`,
    );
  }

  console.log("\nCurated overwrite counts (must be 0/0/0/0):");
  console.log(
    `  name=${curatedOverwrites.name}  description=${curatedOverwrites.description}  pricing=${curatedOverwrites.pricing}  intake_status=${curatedOverwrites.intake_status}`,
  );

  if ((actions.insert ?? 0) !== 0 || (actions.update ?? 0) !== ADOPTIONS.length) {
    process.exitCode = 1;
    console.error("\nFAIL: expected 9 updates and 0 inserts.");
  } else if (Object.values(curatedOverwrites).some((n) => n !== 0)) {
    process.exitCode = 1;
    console.error("\nFAIL: curated fields would be overwritten.");
  } else {
    console.log("\nOK: all 9 adopt as updates; curated fields held.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
