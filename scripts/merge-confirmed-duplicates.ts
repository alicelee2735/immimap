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
 * Explicitly approved, one pair at a time. Do not add to this list without a
 * fresh human sign-off per pair — see scripts/audit-duplicate-organizations.ts
 * and the 0.48–0.72 confidence band, which is intentionally NOT in this list.
 */
const MERGES: Array<{
  label: string;
  curatedId: string;
  eoirId: string;
}> = [
  {
    label: "CHIRLA (Los Angeles)",
    curatedId: "765fcdde-d279-487e-8923-43d8f70fb95d",
    eoirId: "ea02ab44-8fa4-4ca2-a953-5a5ea1a4ba5f",
  },
  {
    label: "CARECEN of Los Angeles",
    curatedId: "6304caab-de68-4b0b-af51-b8644d197d81",
    eoirId: "1fe1c278-440e-42dd-80b9-88285596082e",
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
