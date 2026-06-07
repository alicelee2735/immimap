/**
 * Immimap local setup
 *
 * 1. Ensures .env.local exists
 * 2. Runs SQL migrations when DATABASE_URL is set
 * 3. Seeds organizations when Supabase keys are set
 * 4. Runs initial official-data sync
 *
 * Usage: npm run setup
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
const migrationsDir = join(root, "supabase/migrations");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
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

function ensureEnvFile() {
  if (existsSync(envPath)) {
    console.log("✓ .env.local already exists");
    return;
  }

  const adminSecret = randomBytes(24).toString("hex");
  const cronSecret = randomBytes(24).toString("hex");

  const template = readFileSync(join(root, ".env.example"), "utf8")
    .replace("your-admin-secret", adminSecret)
    .replace("your-cron-secret", cronSecret);

  writeFileSync(envPath, template, "utf8");
  console.log("✓ Created .env.local with generated ADMIN_SECRET and CRON_SECRET");
  console.log("  → Add your Supabase URL and keys from:");
  console.log("    https://supabase.com/dashboard/project/_/settings/api");
}

function isPlaceholder(value) {
  return (
    !value ||
    value.includes("your-project") ||
    value.includes("[ref]") ||
    value.includes("[password]") ||
    value.includes("your-anon-key") ||
    value.includes("your-service-role-key")
  );
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (isPlaceholder(databaseUrl)) {
    console.log("\n⊘ DATABASE_URL not set — skipping SQL migrations");
    console.log(
      "  Paste supabase/setup-all.sql into the Supabase SQL Editor, or set:",
    );
    console.log(
      "  DATABASE_URL=postgresql://postgres.[ref]:[password]@...supabase.com:5432/postgres",
    );
    return false;
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`  Running ${file}…`);
      await client.query(sql);
    }

    console.log("✓ All migrations applied via DATABASE_URL");
    return true;
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    return false;
  } finally {
    await client.end();
  }
}

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project")) {
    console.log("\n⊘ Supabase not configured — app will use local JSON fallbacks");
    console.log("  Fill in NEXT_PUBLIC_SUPABASE_URL and keys in .env.local");
    return null;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("organizations").select("id").limit(1);
  if (error?.code === "42P01") {
    console.log("\n✗ organizations table missing — run migrations first");
    return null;
  }
  if (error) {
    console.log("\n✗ Supabase connection error:", error.message);
    return null;
  }

  console.log("\n✓ Supabase connection OK");
  return supabase;
}

async function seedIfEmpty(supabase) {
  const { count, error } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.log("⊘ Could not check organizations:", error.message);
    return;
  }

  if (count >= 100) {
    console.log(`✓ Organizations table has ${count} rows — catalog at target size`);
    return;
  }

  console.log(
    `  Seeding/updating organizations (${count ?? 0} present, target 100)…`,
  );
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("node", ["scripts/seed-organizations.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status === 0) {
    console.log("✓ Seed complete");
  } else {
    console.log("✗ Seed failed");
  }
}

async function syncOfficialData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("your-project")) {
    console.log("⊘ Skipping official-data sync (needs service role key)");
    return;
  }

  const { error } = await createClient(url, key)
    .from("official_data_store")
    .select("id")
    .limit(1);

  if (error?.code === "42P01") {
    console.log("⊘ official_data_store missing — run migrations first");
    return;
  }

  console.log("  Running initial official-data sync…");
  const cronSecret = process.env.CRON_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/cron/sync-data`, {
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
    });

    if (response.ok) {
      const body = await response.json();
      console.log("✓ Official data sync:", JSON.stringify(body));
      return;
    }
  } catch {
    // Dev server may not be running — import sync directly below
  }

  console.log("  (Dev server not running — sync will run on first cron or via /admin/sync)");
}

async function main() {
  console.log("ImmiMap setup\n─────────────");
  ensureEnvFile();
  loadEnvFile(envPath);

  await runMigrations();

  const supabase = await checkSupabase();
  if (supabase) {
    await seedIfEmpty(supabase);
    await syncOfficialData();
  }

  console.log("\n─────────────");
  console.log("Next steps:");
  console.log("  1. Add Supabase keys to .env.local (if not done)");
  console.log("  2. Run migrations: paste supabase/setup-all.sql in SQL Editor");
  console.log("     OR set DATABASE_URL and re-run: npm run setup");
  console.log("  3. Start dev server: npm run dev");
  console.log("  4. Admin: /admin/sync (ADMIN_SECRET from .env.local)");
  console.log("  5. On Vercel: add CRON_SECRET + Supabase env vars to project settings");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
