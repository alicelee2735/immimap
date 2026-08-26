/**
 * Read-only audit for duplicate organizations across the FULL `organizations`
 * table — not just the key-less rows the EOIR sync's `DuplicateMatcher`
 * considers.
 *
 * The sync's matcher (src/lib/ingestion/eoir/match.ts) only ever compares an
 * incoming roster record against rows with `legacy_id IS NULL`. Any curated
 * row that already carries a legacy_id from an earlier seed (the `svc-*`
 * keys) is invisible to it, no matter how well the name/city match. This
 * script ignores that restriction entirely and pairs every row in the table
 * against every other row, so it surfaces collisions the sync-time matcher
 * structurally cannot see.
 *
 * Nothing is written. Usage:
 *   npx tsx scripts/audit-duplicate-organizations.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createIngestClient } from "../src/lib/ingestion/eoir/client";
import { DuplicateMatcher, zipFromAddress } from "../src/lib/ingestion/eoir/match";
import type { MatchCandidate } from "../src/lib/ingestion/eoir/match";

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

type Row = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  legacy_id: string | null;
  org_type: string | null;
  verified: boolean | null;
};

function source(row: Row): string {
  if (!row.legacy_id) return "curated (keyless)";
  if (row.legacy_id.startsWith("doj-ra-")) return "eoir_organizations";
  if (row.legacy_id.startsWith("svc-")) return "curated (svc- seed)";
  return `curated (${row.legacy_id.split("-")[0]}- seed)`;
}

async function fetchAllRows(supabase: Awaited<ReturnType<typeof createIngestClient>>) {
  const rows: Row[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, city, state, address, legacy_id, org_type, verified")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Row[]));
    if (data.length < pageSize) break;
  }
  return rows;
}

async function main() {
  const supabase = await createIngestClient();
  console.log("Fetching all organizations…");
  const rows = await fetchAllRows(supabase);
  console.log(`  ${rows.length} rows total\n`);

  const byBucket = new Map<string, number>();
  for (const row of rows) {
    const bucket = source(row);
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + 1);
  }
  console.log("Source breakdown:");
  for (const [bucket, count] of [...byBucket.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(5)}  ${bucket}`);
  }

  // Deliberately ignore legacy_id when building the candidate pool — this is
  // the full-dataset audit, not a re-run of the sync-time matcher.
  const candidates: MatchCandidate[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    zip: zipFromAddress(row.address),
  }));

  const matcher = new DuplicateMatcher(rows.map((r) => r.name), candidates);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const seenPairs = new Set<string>();
  const pairs: Array<{ a: Row; b: Row; score: number; sameZip: boolean; matchedOn: string[] }> = [];

  for (const row of rows) {
    const matches = matcher.findMatches({
      name: row.name,
      city: row.city ?? "",
      state: row.state ?? "",
      zip: zipFromAddress(row.address),
    });

    for (const match of matches) {
      if (match.candidate.id === row.id) continue;
      const pairKey = [row.id, match.candidate.id].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const other = byId.get(match.candidate.id);
      if (!other) continue;

      pairs.push({
        a: row,
        b: other,
        score: match.score,
        sameZip: match.sameZip,
        matchedOn: match.matchedOn,
      });
    }
  }

  pairs.sort((x, y) => y.score - x.score);

  const crossSource = pairs.filter((p) => source(p.a) !== source(p.b));
  const sameSource = pairs.filter((p) => source(p.a) === source(p.b));
  const invisibleToSyncMatcher = pairs.filter(
    (p) => p.a.legacy_id !== null && p.b.legacy_id !== null,
  );

  function printPair({ a, b, score, sameZip, matchedOn }: (typeof pairs)[number]) {
    const srcA = source(a);
    const srcB = source(b);
    const bothKeyed = a.legacy_id !== null && b.legacy_id !== null;

    console.log(`\n  score ${score.toFixed(2)}  ${sameZip ? "(same ZIP)" : ""}  matched on: ${matchedOn.join(", ") || "(name only)"}`);
    console.log(`  [${srcA}]`);
    console.log(`    name        ${a.name}`);
    console.log(`    address     ${a.address ?? "—"}`);
    console.log(`    city/state  ${a.city ?? "—"}, ${a.state ?? "—"}`);
    console.log(`    legacy_id   ${a.legacy_id ?? "NULL"}`);
    console.log(`    id          ${a.id}`);
    console.log(`  [${srcB}]`);
    console.log(`    name        ${b.name}`);
    console.log(`    address     ${b.address ?? "—"}`);
    console.log(`    city/state  ${b.city ?? "—"}, ${b.state ?? "—"}`);
    console.log(`    legacy_id   ${b.legacy_id ?? "NULL"}`);
    console.log(`    id          ${b.id}`);
    if (bothKeyed) {
      console.log(`    ⚠ both rows already have a legacy_id — invisible to the EOIR sync's DuplicateMatcher`);
    }
  }

  console.log(`\n${"═".repeat(78)}`);
  console.log(`SECTION 1 — CROSS-SOURCE DUPLICATES (curated × eoir_organizations): ${crossSource.length}`);
  console.log("The same real-world office, ingested twice under two different legacy_id namespaces.");
  console.log(`${"═".repeat(78)}`);
  for (const pair of crossSource) printPair(pair);

  console.log(`\n\n${"═".repeat(78)}`);
  console.log(`SECTION 2 — SAME-SOURCE REPEATS (both eoir_organizations, or both curated): ${sameSource.length}`);
  console.log("Same org name + city, both rows from one ingestion pipeline. Often a");
  console.log("genuinely distinct office at a different street address (check the");
  console.log("address column) — but some may be roster-side duplicates.");
  console.log(`${"═".repeat(78)}`);
  for (const pair of sameSource) printPair(pair);

  console.log(`\n\n${"═".repeat(78)}`);
  console.log("SUMMARY");
  console.log(`${"═".repeat(78)}`);
  console.log(`  total pairs                            ${pairs.length}`);
  console.log(`  cross-source (curated × eoir)          ${crossSource.length}`);
  console.log(`  same-source repeats                    ${sameSource.length}`);
  console.log(`  pairs invisible to the sync matcher     ${invisibleToSyncMatcher.length}`);
  console.log(`  (both rows already carried a legacy_id, so neither was ever`);
  console.log(`   in the sync's key-less candidate pool)`);
  console.log(`${"═".repeat(78)}`);
  console.log("\nRead-only audit. Nothing was written.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
