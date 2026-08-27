/**
 * Merges a short, explicitly-approved list of cross-source duplicate pairs
 * (a curated `svc-*` row and the `doj-ra-*` row the EOIR sync created for the
 * same real office): the EOIR-sourced row is deleted, and the curated row's
 * legacy_id is backfilled to that EOIR natural key, so every future sync
 * recognizes the curated row directly (an `update`, never a fresh insert or
 * a skip) and its curated fields (name/description/pricing/intake_status)
 * keep being preserved per buildUpdatePayload.
 *
 * Dry run is the default — it only prints the two rows and the exact writes
 * that would happen. Nothing is written without --apply.
 *
 * Usage:
 *   npx tsx scripts/merge-confirmed-duplicates.ts            # dry run
 *   npx tsx scripts/merge-confirmed-duplicates.ts --apply    # write
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createIngestClient } from "../src/lib/ingestion/eoir/client";

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
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile(join(root, ".env.local"));

/**
 * Same-street cross-source pairs from the ≥0.84 audit band. CHIRLA / CARECEN
 * LA were applied earlier (they sat in the 0.48–0.72 band). Different-street
 * matches in the high-confidence band are intentionally omitted — they are
 * other offices of the same org, not a second ingest of the same address.
 */
const MERGES: Array<{
  label: string;
  curatedId: string;
  eoirId: string;
}> = [
  {
    label: "Catholic Charities Corpus Christi Immigration",
    curatedId: "06dabf65-0d74-49df-b908-559fd8dd672e",
    eoirId: "844f3f07-fd08-44bb-a295-f4414e4dda31",
  },
  {
    label: "African Services Committee",
    curatedId: "37ddba6c-2892-4edb-ab56-481d0758291f",
    eoirId: "0877de2e-93e6-4674-a8eb-5838f4d89551",
  },
  {
    label: "Journey's End Refugee Services (2495 Main St)",
    curatedId: "ab4e8282-94b5-451d-9868-43264d1e92e3",
    eoirId: "1307eb61-6398-4a60-8501-858af008be6d",
  },
  {
    label: "American Friends Service Committee Immigrant Rights Program",
    curatedId: "578248f2-0295-449d-8fcd-5512a966e284",
    eoirId: "1ffb58a2-02c3-4b3f-a520-be9a409113f3",
  },
  {
    label: "American Gateways",
    curatedId: "e0642906-466e-4bf4-a0e6-6d14b453ff43",
    eoirId: "3310c727-8868-4cb8-b536-bc4d43ade480",
  },
  {
    label: "Hope CommUnity Center Immigration Program",
    curatedId: "ae98cc00-b89a-4b0e-b021-9ccb1e42d3f4",
    eoirId: "37d2e58e-ae4d-4b37-a177-88dd54141e78",
  },
  {
    label: "Catholic Charities Dallas Immigration Services",
    curatedId: "3fa398da-12b9-473b-bc24-9493d5957ef6",
    eoirId: "cbba9831-5812-4bb4-968c-14e8b4627786",
  },
  {
    label: "Catholic Legal Services Archdiocese of Miami",
    curatedId: "572f5fed-8bf4-4447-b05c-eee271a8734e",
    eoirId: "da7172e8-fb96-4017-864e-26028103eb32",
  },
  {
    label: "Florida Immigrant Coalition",
    curatedId: "907e96ef-3f31-4042-b926-6ae25b3af133",
    eoirId: "600b6e1b-a2b1-4d55-b8d3-d7bf02242e4d",
  },
  {
    label: "Catholic Charities of Santa Clara County",
    curatedId: "dbc51db9-de14-46a0-a144-7fbb548b8ef6",
    eoirId: "64378d04-6f68-4a83-b4e4-418fd215d945",
  },
  {
    label: "Asian Americans Advancing Justice Southern California",
    curatedId: "c6da669c-e98b-4ce2-a867-1ec7f83cbf6c",
    eoirId: "6a746348-3b0a-453b-bbb1-0523d4c0e1c6",
  },
  {
    label: "Hispanic Unity of Florida",
    curatedId: "cf372e41-b9c0-4cf0-bb72-5c6869a1d1f0",
    eoirId: "72fd57fa-4ad7-4d2b-bf05-a9b17949e99e",
  },
  {
    label: "Bronx Legal Services",
    curatedId: "7c984837-54d3-4237-b210-f0361aaabcda",
    eoirId: "f1aad251-2efd-49d2-986f-a9313354df8e",
  },
  {
    label: "Las Americas Immigrant Advocacy Center",
    curatedId: "f51a3a01-e587-4805-a6e7-3c1bcbad0497",
    eoirId: "8c5b252c-e7a1-4b38-8d88-087fddf29e3e",
  },
  {
    label: "Americans for Immigrant Justice",
    curatedId: "a425ccd3-6259-4a1f-9437-f43d3505f6a0",
    eoirId: "a3e52673-d17a-49c0-a64a-3be09d465749",
  },
  {
    label: "Lutheran Services Florida Immigration Services",
    curatedId: "bf938987-4254-4388-b7c8-a7bbd669386b",
    eoirId: "a83ed98d-6287-4208-8944-e2c0e3fe7b19",
  },
  {
    label: "Northern Manhattan Coalition for Immigrant Rights",
    curatedId: "bc6989d0-80ba-4bb0-a9af-fcfc5e6ec1d0",
    eoirId: "b0a44d24-e906-43fd-9625-a3331b565d22",
  },
  {
    label: "Catholic Charities Fort Worth (249 W Thornhill)",
    curatedId: "f8b874bb-404d-44a7-a9bb-ec126ba812ba",
    eoirId: "b611e6d4-f13e-408a-a2c8-32ef08d4a379",
  },
];

type Row = {
  id: string;
  name: string;
  legacy_id: string | null;
  description: string | null;
  catchment_note: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  verified: boolean | null;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const supabase = await createIngestClient();

  const ids = MERGES.flatMap((m) => [m.curatedId, m.eoirId]);
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, legacy_id, description, catchment_note, address, city, state, verified")
    .in("id", ids);
  if (error) throw error;

  const byId = new Map((data as Row[]).map((row) => [row.id, row]));

  console.log(`${"═".repeat(78)}`);
  console.log(apply ? "APPLYING MERGES" : "DRY RUN — no writes (pass --apply to write)");
  console.log(`${"═".repeat(78)}`);

  for (const merge of MERGES) {
    const curated = byId.get(merge.curatedId);
    const eoir = byId.get(merge.eoirId);

    if (!curated || !eoir) {
      console.log(`\n! Missing row(s) for "${merge.label}" — skipping.`);
      continue;
    }

    console.log(`\n${"─".repeat(78)}`);
    console.log(merge.label);
    console.log(`${"─".repeat(78)}`);
    console.log(`  KEEP    [curated] "${curated.name}"`);
    console.log(`          ${curated.address}`);
    console.log(`          legacy_id: ${curated.legacy_id}`);
    console.log(`          verified: ${curated.verified}`);
    console.log(`          description: ${curated.description ?? "—"}`);
    console.log(`          catchment_note: ${curated.catchment_note ?? "—"}`);
    console.log(`  DELETE  [eoir]    "${eoir.name}"`);
    console.log(`          ${eoir.address}`);
    console.log(`          legacy_id: ${eoir.legacy_id}`);

    if (!curated.legacy_id?.startsWith("svc-")) {
      console.log(
        `  ! REFUSING: curated row's legacy_id does not start with "svc-" (${curated.legacy_id}). Aborting this pair.`,
      );
      continue;
    }
    if (!eoir.legacy_id?.startsWith("doj-ra-")) {
      console.log(
        `  ! REFUSING: eoir row's legacy_id does not start with "doj-ra-" (${eoir.legacy_id}). Aborting this pair.`,
      );
      continue;
    }

    console.log(`\n  Would run:`);
    console.log(`    DELETE FROM organizations WHERE id = '${eoir.id}';`);
    console.log(
      `    UPDATE organizations SET legacy_id = '${eoir.legacy_id}' WHERE id = '${curated.id}';`,
    );

    if (!apply) continue;

    const { error: deleteError } = await supabase
      .from("organizations")
      .delete()
      .eq("id", eoir.id);
    if (deleteError) throw deleteError;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ legacy_id: eoir.legacy_id })
      .eq("id", curated.id)
      .eq("legacy_id", curated.legacy_id); // optimistic guard against a concurrent change

    if (updateError) throw updateError;

    console.log(`  ✓ merged.`);
  }

  console.log(`\n${"═".repeat(78)}`);
  console.log(
    apply
      ? "Done. Re-run scripts/audit-duplicate-organizations.ts to confirm these pairs no longer appear."
      : "Nothing was written. Re-run with --apply to perform these writes.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
