/**
 * Audits organization website_url values and updates is_website_active.
 *
 * Usage:
 *   npm run db:check-links
 *   npm run db:check-links -- --dry-run
 *   npm run db:check-links -- --concurrency 8 --timeout 12000
 *   npm run db:check-links -- --only-unchecked
 *   npm run db:check-links -- --limit 50
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional (to auto-apply migration 006 if columns are missing):
 *   DATABASE_URL
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
const migrationPath = join(
  root,
  "supabase/migrations/006_website_link_status.sql",
);

const DEFAULT_HEADERS = {
  "User-Agent":
    "ImmimapLinkChecker/1.0 (+https://immimap.org; website availability audit)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    concurrency: 6,
    timeoutMs: 10_000,
    onlyUnchecked: false,
    limit: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--only-unchecked") options.onlyUnchecked = true;
    else if (arg === "--concurrency") {
      options.concurrency = Math.max(1, Number(argv[++i]) || 6);
    } else if (arg === "--timeout") {
      options.timeoutMs = Math.max(1000, Number(argv[++i]) || 10_000);
    } else if (arg === "--limit") {
      const n = Number(argv[++i]);
      options.limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npm run db:check-links -- [options]

Options:
  --dry-run           Check without writing status back to the database
  --only-unchecked    Only orgs with website_checked_at IS NULL
  --concurrency N     Parallel probes (default 6)
  --timeout MS        Per-request timeout (default 10000)
  --limit N           Cap number of organizations to check
`);
      process.exit(0);
    }
  }

  return options;
}

/** @param {string | null | undefined} raw */
function normalizeWebsiteUrl(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** @param {number} status */
function isSuccessStatus(status) {
  if (status >= 200 && status < 400) return true;
  // Common anti-bot / WAF / auth responses still mean the host is alive
  if (status === 401 || status === 403 || status === 405 || status === 429) {
    return true;
  }
  return false;
}

/** @param {unknown} error */
function classifyNetworkError(error) {
  if (!(error instanceof Error)) {
    return "Unknown network error";
  }

  const message = error.message || error.name || "Unknown network error";
  const cause =
    "cause" in error && error.cause instanceof Error
      ? error.cause.message
      : "";
  const combined = `${message} ${cause}`.toLowerCase();

  if (
    combined.includes("enotfound") ||
    combined.includes("getaddrinfo") ||
    combined.includes("nxdomain") ||
    combined.includes("name not resolved") ||
    combined.includes("dns")
  ) {
    return `DNS resolution failed: ${message}`;
  }
  if (
    combined.includes("timeout") ||
    combined.includes("aborted") ||
    combined.includes("etimedout")
  ) {
    return `Timeout: ${message}`;
  }
  if (
    combined.includes("econnrefused") ||
    combined.includes("connection refused")
  ) {
    return `Connection refused: ${message}`;
  }
  if (
    combined.includes("cert") ||
    combined.includes("ssl") ||
    combined.includes("tls")
  ) {
    return `TLS/SSL error: ${message}`;
  }
  if (combined.includes("econnreset") || combined.includes("socket hang up")) {
    return `Connection reset: ${message}`;
  }

  return message;
}

/**
 * @param {string} url
 * @param {"HEAD" | "GET"} method
 * @param {number} timeoutMs
 * @param {Record<string, string>} headers
 */
async function fetchOnce(url, method, timeoutMs, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} rawUrl
 * @param {{ timeoutMs?: number }} [options]
 */
async function checkWebsiteUrl(rawUrl, options = {}) {
  const checkedAt = new Date().toISOString();
  const timeoutMs = options.timeoutMs ?? 10_000;

  const url = normalizeWebsiteUrl(rawUrl);
  if (!url) {
    return {
      url: rawUrl,
      active: false,
      statusCode: null,
      error: "Invalid or empty URL",
      checkedAt,
    };
  }

  try {
    let response;
    try {
      response = await fetchOnce(url, "HEAD", timeoutMs, DEFAULT_HEADERS);
      if (response.status === 405 || response.status === 501) {
        response = await fetchOnce(url, "GET", timeoutMs, DEFAULT_HEADERS);
      }
    } catch {
      response = await fetchOnce(url, "GET", timeoutMs, DEFAULT_HEADERS);
    }

    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        // ignore
      }
    }

    const active = isSuccessStatus(response.status);
    return {
      url,
      active,
      statusCode: response.status,
      error: active ? null : `HTTP ${response.status}`,
      checkedAt,
    };
  } catch (error) {
    return {
      url,
      active: false,
      statusCode: null,
      error: classifyNetworkError(error),
      checkedAt,
    };
  }
}

function isPlaceholderDatabaseUrl(databaseUrl) {
  return (
    !databaseUrl ||
    databaseUrl.includes("your-project") ||
    databaseUrl.includes("[password]") ||
    databaseUrl.includes("[ref]")
  );
}

function isMissingLinkStatusColumnError(error) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    message.includes("is_website_active") ||
    message.includes("website_checked_at") ||
    message.includes("website_check_error") ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

/**
 * @returns {Promise<"writable" | "readonly">}
 */
async function ensureColumns(supabase) {
  const { error } = await supabase
    .from("organizations")
    .select("id, is_website_active, website_checked_at, website_check_error")
    .limit(1);

  if (!error) return "writable";

  if (!isMissingLinkStatusColumnError(error)) {
    throw error;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!isPlaceholderDatabaseUrl(databaseUrl)) {
    console.log("Applying migration 006_website_link_status.sql…");
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query(readFileSync(migrationPath, "utf8"));
      console.log("✓ Migration applied");
    } finally {
      await client.end();
    }

    const verify = await supabase
      .from("organizations")
      .select("id, is_website_active")
      .limit(1);
    if (!verify.error) return "writable";
  }

  console.warn(
    "⚠️  Link-status columns are not in the database yet.\n" +
      "   Paste supabase/migrations/006_website_link_status.sql into the Supabase SQL Editor,\n" +
      "   or set a real DATABASE_URL (not a [ref] placeholder) in .env.local.\n" +
      "   Continuing in report-only mode (no status writes).\n",
  );
  return "readonly";
}

async function loadAllOrganizations(
  supabase,
  { onlyUnchecked, limit, writable },
) {
  const pageSize = 500;
  let from = 0;
  const rows = [];
  const fields = writable
    ? "id, name, website_url, city, state, is_website_active, website_checked_at"
    : "id, name, website_url, city, state";

  while (true) {
    let query = supabase
      .from("organizations")
      .select(fields)
      .not("website_url", "is", null)
      .neq("website_url", "")
      .order("name")
      .range(from, from + pageSize - 1);

    if (onlyUnchecked && writable) {
      query = query.is("website_checked_at", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;

    if (limit != null && rows.length >= limit) break;
  }

  return limit != null ? rows.slice(0, limit) : rows;
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length || 1) },
    () => run(),
  );
  await Promise.all(workers);
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });

  const mode = await ensureColumns(supabase);
  const canWrite = mode === "writable" && !options.dryRun;

  console.log(
    `\nAuditing organization website links` +
      (!canWrite ? " (report-only)" : "") +
      `…\n  concurrency=${options.concurrency} timeout=${options.timeoutMs}ms` +
      (options.onlyUnchecked ? " only-unchecked" : "") +
      (options.limit != null ? ` limit=${options.limit}` : "") +
      "\n",
  );

  const orgs = await loadAllOrganizations(supabase, {
    ...options,
    writable: mode === "writable",
  });
  console.log(`Found ${orgs.length} organization(s) with a website_url.\n`);

  if (orgs.length === 0) {
    console.log("Nothing to check.");
    return;
  }

  let activeCount = 0;
  let inactiveCount = 0;
  const dead = [];
  let done = 0;

  await mapPool(orgs, options.concurrency, async (org) => {
    const result = await checkWebsiteUrl(org.website_url, {
      timeoutMs: options.timeoutMs,
    });

    done += 1;
    const label = result.active ? "OK  " : "DEAD";
    const detail = result.active
      ? `HTTP ${result.statusCode ?? "—"}`
      : (result.error ?? "unknown error");
    process.stdout.write(
      `[${String(done).padStart(String(orgs.length).length)}/${orgs.length}] ${label}  ${org.name} — ${detail}\n`,
    );

    if (result.active) {
      activeCount += 1;
    } else {
      inactiveCount += 1;
      dead.push({
        id: org.id,
        name: org.name,
        city: org.city,
        state: org.state,
        website_url: org.website_url,
        error: result.error,
        statusCode: result.statusCode,
      });
    }

    if (canWrite) {
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          is_website_active: result.active,
          website_checked_at: result.checkedAt,
          website_check_error: result.error,
        })
        .eq("id", org.id);

      if (updateError) {
        console.error(
          `  ! Failed to update ${org.name}: ${updateError.message}`,
        );
      }
    }
  });

  console.log("\n── Summary ──────────────────────────────────────────");
  console.log(`Checked:   ${orgs.length}`);
  console.log(`Active:    ${activeCount}`);
  console.log(`Inactive:  ${inactiveCount}`);
  if (!canWrite) {
    console.log(
      options.dryRun
        ? "(dry-run — no database writes)"
        : "(report-only — apply migration 006 to persist is_website_active)",
    );
  }

  if (dead.length > 0) {
    console.log("\n── Organizations with dead/broken website links ──");
    for (const row of dead) {
      const place = [row.city, row.state].filter(Boolean).join(", ");
      console.log(
        `- ${row.name}${place ? ` (${place})` : ""}\n` +
          `    id: ${row.id}\n` +
          `    url: ${row.website_url}\n` +
          `    error: ${row.error}`,
      );
    }
  } else {
    console.log("\nAll checked website links appear reachable.");
  }
}

main().catch((error) => {
  console.error("Link audit failed:", error);
  process.exit(1);
});
