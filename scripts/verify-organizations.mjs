/**
 * Verifies organization records against public web sources.
 *
 * For each org:
 *  1) Web-search by name + location
 *  2) Cross-check services and languages against search snippets + official site text
 *  3) Auto-correct website / services / languages when confidence is high
 *  4) Flag likely hallucinations/placeholders for human deletion approval
 *
 * Usage (dry-run by default — no DB writes):
 *   npm run db:verify-orgs
 *   npm run db:verify-orgs -- --limit 10
 *   npm run db:verify-orgs -- --concurrency 3
 *   npm run db:verify-orgs -- --apply          # write high-confidence corrections
 *   npm run db:verify-orgs -- --only-name "Project RAIN"
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional web search (recommended for strong results):
 *   SERPER_API_KEY    — https://serper.dev  (Google SERP JSON)
 *   BRAVE_SEARCH_API_KEY — https://brave.com/search/api/
 * Without a key, falls back to DuckDuckGo HTML (rate-limited / noisier).
 *
 * Report files are written under scripts/reports/.
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");
const reportsDir = join(__dirname, "reports");

const CANONICAL_SERVICES = [
  "Asylum",
  "Family",
  "DACA",
  "Employment",
  "Citizenship",
  "Removal Defense",
  "Humanitarian Relief",
  "TPS",
];

/** Patterns that map page/snippet text → Immimap service labels. */
const SERVICE_PATTERNS = [
  { name: "Asylum", patterns: [/\basylum\b/i, /\brefugee\b/i] },
  {
    name: "Family",
    patterns: [
      /\bfamily[- ]based\b/i,
      /\bfamily petition/i,
      /\bfamily immigration\b/i,
      /\bI-130\b/i,
      /\bmarriage[- ]based\b/i,
      /\brelative petition/i,
    ],
  },
  {
    name: "DACA",
    patterns: [/\bDACA\b/i, /deferred action for childhood arrivals/i],
  },
  {
    name: "Employment",
    patterns: [
      /\bemployment[- ]based\b/i,
      /\bwork visa\b/i,
      /\bH-1B\b/i,
      /\bemployment authorization\b/i,
      /\blabor certification\b/i,
    ],
  },
  {
    name: "Citizenship",
    patterns: [
      /\bcitizenship\b/i,
      /\bnaturalization\b/i,
      /\bN-400\b/i,
    ],
  },
  {
    name: "Removal Defense",
    patterns: [
      /\bremoval defense\b/i,
      /\bdeportation defense\b/i,
      /\bimmigration court\b/i,
      /\bcancellation of removal\b/i,
      /\bEOIR\b/i,
    ],
  },
  {
    name: "Humanitarian Relief",
    patterns: [
      /\bhumanitarian\b/i,
      /\bU[- ]visa\b/i,
      /\bT[- ]visa\b/i,
      /\bVAWA\b/i,
      /\bviolence against women\b/i,
      /\bspecial immigrant juvenile\b/i,
      /\bSIJS\b/i,
    ],
  },
  {
    name: "TPS",
    patterns: [/\bTPS\b/, /temporary protected status/i],
  },
];

const LANGUAGE_PATTERNS = [
  { name: "English", patterns: [/\benglish\b/i] },
  { name: "Spanish", patterns: [/\bspanish\b/i, /\bespañol\b/i, /\bespanol\b/i] },
  {
    name: "Mandarin",
    patterns: [/\bmandarin\b/i, /\bchinese\b/i, /\bputonghua\b/i],
  },
  { name: "Cantonese", patterns: [/\bcantonese\b/i] },
  { name: "Korean", patterns: [/\bkorean\b/i] },
  { name: "Vietnamese", patterns: [/\bvietnamese\b/i] },
  { name: "Tagalog", patterns: [/\btagalog\b/i, /\bfilipino\b/i] },
  {
    name: "Portuguese",
    patterns: [/\bportuguese\b/i, /\bportuguês\b/i],
  },
  {
    name: "Haitian Creole",
    patterns: [/\bhaitian creole\b/i, /\bkreyol\b/i, /\bcreole\b/i],
  },
  { name: "Arabic", patterns: [/\barabic\b/i] },
  { name: "French", patterns: [/\bfrench\b/i] },
  { name: "Russian", patterns: [/\brussian\b/i] },
  { name: "Hindi", patterns: [/\bhindi\b/i] },
];

const PLACEHOLDER_HOSTS = [
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "localhost",
  "placeholder",
];

const FETCH_HEADERS = {
  "User-Agent":
    "ImmimapOrgVerifier/1.0 (+https://immimap.org; data quality audit)",
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(envPath);

function parseArgs(argv) {
  const options = {
    apply: false,
    concurrency: 2,
    limit: null,
    onlyName: null,
    timeoutMs: 12_000,
    sleepMs: 400,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--concurrency") {
      options.concurrency = Math.max(1, Number(argv[++i]) || 2);
    } else if (arg === "--limit") {
      const n = Number(argv[++i]);
      options.limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    } else if (arg === "--only-name") {
      options.onlyName = argv[++i] ?? null;
    } else if (arg === "--timeout") {
      options.timeoutMs = Math.max(3000, Number(argv[++i]) || 12_000);
    } else if (arg === "--sleep") {
      options.sleepMs = Math.max(0, Number(argv[++i]) || 0);
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: npm run db:verify-orgs -- [options]

Options:
  --apply            Write high-confidence corrections to Supabase
  --dry-run          Report only (default)
  --limit N          Cap organizations processed
  --only-name TEXT   Case-insensitive name substring filter
  --concurrency N    Parallel workers (default 2; keep low for search rate limits)
  --timeout MS       HTTP timeout (default 12000)
  --sleep MS         Delay after each org (default 400)
`);
      process.exit(0);
    }
  }
  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(withProtocol);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Strip tracking noise
    u.hash = "";
    return u.toString().replace(/\/$/, "") || u.origin;
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isPlaceholderHost(url) {
  const host = hostOf(url);
  return PLACEHOLDER_HOSTS.some(
    (p) => host === p || host.endsWith(`.${p}`) || host.includes(p),
  );
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function detectFromText(text, patternRows) {
  if (!text) return [];
  const found = [];
  for (const row of patternRows) {
    if (row.patterns.some((re) => re.test(text))) {
      found.push(row.name);
    }
  }
  return found;
}

function sameStringSet(a, b) {
  const aa = [...new Set(a ?? [])].map(String).sort();
  const bb = [...new Set(b ?? [])].map(String).sort();
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function nameTokens(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length > 2 &&
        ![
          "inc",
          "llc",
          "the",
          "and",
          "for",
          "of",
          "law",
          "office",
          "group",
          "center",
          "services",
          "legal",
          "immigration",
        ].includes(t),
    );
}

function resultMentionsOrg(result, org) {
  const hay = `${result.title ?? ""} ${result.snippet ?? ""} ${result.link ?? ""}`.toLowerCase();
  const tokens = nameTokens(org.name);
  if (tokens.length === 0) return hay.includes(org.name.toLowerCase());
  const hit = tokens.filter((t) => hay.includes(t)).length;
  return hit >= Math.min(2, tokens.length);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Web search providers ──────────────────────────────────────────────────────

async function searchSerper(query, timeoutMs) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  const res = await fetchWithTimeout(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 8 }),
    },
    timeoutMs,
  );
  if (!res.ok) {
    throw new Error(`Serper HTTP ${res.status}`);
  }
  const data = await res.json();
  const organic = Array.isArray(data.organic) ? data.organic : [];
  return organic.map((r) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    snippet: r.snippet ?? "",
  }));
}

async function searchBrave(query, timeoutMs) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
    },
    timeoutMs,
  );
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data = await res.json();
  const results = data.web?.results ?? [];
  return results.map((r) => ({
    title: r.title ?? "",
    link: r.url ?? "",
    snippet: r.description ?? "",
  }));
}

async function searchDuckDuckGo(query, timeoutMs) {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        ...FETCH_HEADERS,
        Accept: "text/html",
      },
      redirect: "follow",
    },
    timeoutMs,
  );
  if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  // Result blocks: <a class="result__a" href="...">title</a>
  const linkRe =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html)) && results.length < 8) {
    let link = match[1];
    // DDG sometimes wraps redirects
    const uddg = link.match(/[?&]uddg=([^&]+)/);
    if (uddg) {
      try {
        link = decodeURIComponent(uddg[1]);
      } catch {
        // keep
      }
    }
    const title = stripHtml(match[2]);
    results.push({ title, link, snippet: "" });
  }
  // Snippets
  const snipRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  const snips = [];
  while ((match = snipRe.exec(html)) && snips.length < 8) {
    snips.push(stripHtml(match[1]));
  }
  for (let i = 0; i < results.length; i++) {
    if (snips[i]) results[i].snippet = snips[i];
  }
  return results;
}

async function webSearch(query, timeoutMs) {
  const errors = [];
  for (const provider of [
    { name: "serper", fn: searchSerper },
    { name: "brave", fn: searchBrave },
    { name: "duckduckgo", fn: searchDuckDuckGo },
  ]) {
    try {
      const results = await provider.fn(query, timeoutMs);
      if (results && results.length > 0) {
        return { provider: provider.name, results, error: null };
      }
      if (results === null) continue; // key not configured
      errors.push(`${provider.name}: empty`);
    } catch (error) {
      errors.push(
        `${provider.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return {
    provider: null,
    results: [],
    error: errors.join("; ") || "No search provider returned results",
  };
}

// ── Website fetch ─────────────────────────────────────────────────────────────

async function fetchSiteText(url, timeoutMs) {
  const normalized = normalizeUrl(url);
  if (!normalized || isPlaceholderHost(normalized)) {
    return { url: normalized, ok: false, text: "", error: "Invalid/placeholder URL" };
  }
  try {
    const res = await fetchWithTimeout(
      normalized,
      { headers: FETCH_HEADERS, redirect: "follow" },
      timeoutMs,
    );
    if (!res.ok) {
      return {
        url: normalized,
        ok: false,
        text: "",
        error: `HTTP ${res.status}`,
        finalUrl: res.url,
      };
    }
    const html = await res.text();
    const text = stripHtml(html).slice(0, 80_000);
    return {
      url: normalized,
      finalUrl: res.url,
      ok: true,
      text,
      error: null,
    };
  } catch (error) {
    return {
      url: normalized,
      ok: false,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ── Official website selection ────────────────────────────────────────────────

const BLOCKED_RESULT_HOSTS = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "yelp.com",
  "yellowpages.com",
  "mapquest.com",
  "google.com",
  "bing.com",
  "youtube.com",
  "wikipedia.org",
  "guide.star",
  "guidestar.org",
  "propublica.org",
  "bbb.org",
  "manta.com",
  "zoominfo.com",
  "bloomberg.com",
  "findlaw.com",
  "justia.com",
  "avvo.com",
  "martindale.com",
  "superlawyers.com",
  "nolo.com",
  "reddit.com",
];

function isLikelyDirectoryHost(host) {
  return BLOCKED_RESULT_HOSTS.some(
    (b) => host === b || host.endsWith(`.${b}`),
  );
}

function pickOfficialWebsite(org, searchResults) {
  const scored = [];
  for (const r of searchResults) {
    const link = normalizeUrl(r.link);
    if (!link || isPlaceholderHost(link)) continue;
    const host = hostOf(link);
    if (!host || isLikelyDirectoryHost(host)) continue;
    if (!resultMentionsOrg(r, org)) continue;

    let score = 0;
    const title = (r.title ?? "").toLowerCase();
    const snippet = (r.snippet ?? "").toLowerCase();
    if (title.includes(org.name.toLowerCase().slice(0, 18))) score += 3;
    if (org.city && (title.includes(org.city.toLowerCase()) || snippet.includes(org.city.toLowerCase())))
      score += 1;
    if (org.state && new RegExp(`\\b${org.state}\\b`, "i").test(`${title} ${snippet}`))
      score += 1;
    if (host.includes("immigrat")) score += 1;
    if (/\.(org|gov)$/i.test(host)) score += 1;
    if (/attorney|law|legal|clinic|aid/i.test(host + title)) score += 1;
    // Prefer root marketing sites
    try {
      const path = new URL(link).pathname;
      if (path === "/" || path === "") score += 1;
    } catch {
      // ignore
    }
    scored.push({ link, score, host, title: r.title });
  }
  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;
  if (scored[0].score < 2) return null;
  return scored[0].link;
}

// ── Evidence aggregation ──────────────────────────────────────────────────────

function buildCorpus(org, searchResults, siteText) {
  const parts = [
    org.name,
    org.description ?? "",
    ...(searchResults ?? []).flatMap((r) => [
      r.title ?? "",
      r.snippet ?? "",
      r.link ?? "",
    ]),
    siteText ?? "",
  ];
  return parts.join(" \n ");
}

function assessHallucination(org, ctx) {
  /** @type {string[]} */
  const flags = [];
  let risk = 0;

  const website = org.website_url ? normalizeUrl(org.website_url) : null;

  if (!website) {
    flags.push("no_website");
    risk += 1;
  } else if (isPlaceholderHost(website)) {
    flags.push("placeholder_website");
    risk += 5;
  }

  if (ctx.siteFetch && !ctx.siteFetch.ok && website && !isPlaceholderHost(website)) {
    flags.push(`website_unreachable:${ctx.siteFetch.error ?? "unknown"}`);
    risk += 2;
  }

  if (!ctx.search.provider || ctx.search.results.length === 0) {
    flags.push("no_web_results");
    risk += 3;
  } else {
    const relevant = ctx.search.results.filter((r) => resultMentionsOrg(r, org));
    if (relevant.length === 0) {
      flags.push("search_results_unrelated");
      risk += 4;
    } else {
      // Promote if official directory / news mentions exist
      const trusted = relevant.some((r) => {
        const h = hostOf(r.link);
        return (
          h.includes("justice.gov") ||
          h.includes("calbar.ca.gov") ||
          h.endsWith(".gov") ||
          h.includes("legal-aid") ||
          h.includes("legalaid") ||
          h.includes("charitynavigator") ||
          h.includes("guidestar")
        );
      });
      if (trusted) risk -= 2;
    }
  }

  // Expansion-style random language pools are a smell when site contradicts
  if (
    ctx.detectedLanguages.length > 0 &&
    org.languages?.length &&
    !org.languages.some((l) => ctx.detectedLanguages.includes(l))
  ) {
    flags.push("languages_not_supported_by_public_evidence");
    risk += 1;
  }

  if (
    ctx.detectedServices.length > 0 &&
    org.services?.length &&
    !org.services.some((s) => ctx.detectedServices.includes(s))
  ) {
    flags.push("services_not_supported_by_public_evidence");
    risk += 1;
  }

  // Synthetic suite names that never appear online
  if (/project rain/i.test(org.name) && risk >= 3) {
    flags.push("known_questionable_label_pattern");
    risk += 2;
  }

  risk = Math.max(0, risk);

  let verdict = "verified";
  if (risk >= 6) verdict = "flag_for_deletion";
  else if (risk >= 3) verdict = "needs_review";

  return { risk, flags, verdict };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadOrganizations(supabase, { onlyName, limit }) {
  const pageSize = 200;
  let from = 0;
  const rows = [];

  while (true) {
    let query = supabase
      .from("organizations")
      .select(
        `
        id,
        name,
        description,
        website_url,
        is_website_active,
        address,
        city,
        state,
        languages,
        org_type,
        legacy_id,
        org_services ( services ( id, name ) )
      `,
      )
      .order("name")
      .range(from, from + pageSize - 1);

    if (onlyName) {
      query = query.ilike("name", `%${onlyName}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    if (limit != null && rows.length >= limit) break;
  }

  const mapped = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    website_url: row.website_url,
    is_website_active: row.is_website_active,
    address: row.address,
    city: row.city,
    state: row.state,
    languages: row.languages ?? [],
    org_type: row.org_type,
    legacy_id: row.legacy_id,
    services: (row.org_services ?? [])
      .map((link) => link.services?.name)
      .filter(Boolean),
  }));

  return limit != null ? mapped.slice(0, limit) : mapped;
}

async function ensureServiceIds(supabase, names, cache) {
  const ids = [];
  for (const name of names) {
    if (cache.has(name)) {
      ids.push(cache.get(name));
      continue;
    }
    const { data: existing, error: selectError } = await supabase
      .from("services")
      .select("id")
      .eq("name", name)
      .maybeSingle();
    if (selectError) throw selectError;
    if (existing) {
      cache.set(name, existing.id);
      ids.push(existing.id);
      continue;
    }
    const { data: created, error } = await supabase
      .from("services")
      .insert({ name })
      .select("id")
      .single();
    if (error) throw error;
    cache.set(name, created.id);
    ids.push(created.id);
  }
  return ids;
}

async function applyOrgUpdates(supabase, org, proposed, serviceIdCache) {
  const patch = {};
  if (proposed.website_url !== undefined) {
    patch.website_url = proposed.website_url;
    patch.is_website_active = proposed.is_website_active ?? true;
    patch.website_checked_at = new Date().toISOString();
    patch.website_check_error = proposed.website_check_error ?? null;
  }
  if (proposed.languages !== undefined) {
    patch.languages = proposed.languages;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("organizations")
      .update(patch)
      .eq("id", org.id);
    if (error) throw error;
  }

  if (proposed.services !== undefined) {
    const serviceIds = await ensureServiceIds(
      supabase,
      proposed.services,
      serviceIdCache,
    );
    const { error: delError } = await supabase
      .from("org_services")
      .delete()
      .eq("org_id", org.id);
    if (delError) throw delError;
    if (serviceIds.length > 0) {
      const { error: insError } = await supabase.from("org_services").insert(
        serviceIds.map((service_id) => ({
          org_id: org.id,
          service_id,
        })),
      );
      if (insError) throw insError;
    }
  }
}

// ── Core per-org verification ─────────────────────────────────────────────────

async function verifyOrganization(org, options) {
  const location = [org.city, org.state].filter(Boolean).join(", ");
  const query = `"${org.name}" ${location} immigration legal services`.trim();

  const search = await webSearch(query, options.timeoutMs);

  // Prefer listed site for on-page evidence; also search-chosen official site
  const candidateOfficial = pickOfficialWebsite(org, search.results);
  const listedWebsite = normalizeUrl(org.website_url);

  let siteFetch = null;
  let evidenceUrl = null;

  // Fetch listed site if present and not placeholder
  if (listedWebsite && !isPlaceholderHost(listedWebsite)) {
    siteFetch = await fetchSiteText(listedWebsite, options.timeoutMs);
    if (siteFetch.ok) evidenceUrl = siteFetch.finalUrl || listedWebsite;
  }

  // If listed is bad/missing, try discovered official homepage
  if (
    (!siteFetch || !siteFetch.ok) &&
    candidateOfficial &&
    normalizeUrl(candidateOfficial) !== listedWebsite
  ) {
    const alt = await fetchSiteText(candidateOfficial, options.timeoutMs);
    if (alt.ok) {
      siteFetch = alt;
      evidenceUrl = alt.finalUrl || candidateOfficial;
    } else if (!siteFetch) {
      siteFetch = alt;
    }
  }

  // Site text only for specialty/language corrections (search corpus is noisy).
  const siteText = siteFetch?.ok ? siteFetch.text : "";
  const searchCorpus = buildCorpus(org, search.results, "");
  const fullCorpus = `${searchCorpus}\n${siteText}`;

  const siteServices = detectFromText(siteText, SERVICE_PATTERNS).filter((s) =>
    CANONICAL_SERVICES.includes(s),
  );
  const siteLanguages = detectFromText(siteText, LANGUAGE_PATTERNS);
  // Search corpus helps hallucination scoring (org mentioned with immigration terms)
  const searchServices = detectFromText(searchCorpus, SERVICE_PATTERNS);

  const ctx = {
    search,
    siteFetch,
    detectedServices: siteServices.length ? siteServices : searchServices,
    detectedLanguages: siteLanguages,
    candidateOfficial,
    evidenceUrl,
    fullCorpus,
  };

  const hallucination = assessHallucination(org, ctx);

  /** @type {Record<string, unknown>} */
  const proposed = {};
  /** @type {string[]} */
  const changes = [];

  // Website correction
  const listedIsBad =
    !listedWebsite ||
    isPlaceholderHost(listedWebsite) ||
    (siteFetch && !siteFetch.ok && Boolean(listedWebsite));

  if (candidateOfficial) {
    const official = normalizeUrl(candidateOfficial);
    if (
      official &&
      official !== listedWebsite &&
      (listedIsBad || isPlaceholderHost(listedWebsite))
    ) {
      const probe =
        evidenceUrl && hostOf(evidenceUrl) === hostOf(official)
          ? { ok: true }
          : await fetchSiteText(official, options.timeoutMs);
      if (probe.ok) {
        proposed.website_url = official;
        proposed.is_website_active = true;
        proposed.website_check_error = null;
        changes.push(
          `website: ${listedWebsite ?? "(none)"} → ${official}`,
        );
      }
    }
  }

  // If listed site works and is_website_active is false, clear flag
  if (
    listedWebsite &&
    !isPlaceholderHost(listedWebsite) &&
    siteFetch?.ok &&
    org.is_website_active === false &&
    !proposed.website_url
  ) {
    proposed.website_url = listedWebsite;
    proposed.is_website_active = true;
    proposed.website_check_error = null;
    changes.push("is_website_active: false → true (site reachable)");
  }

  // Services: only correct from reachable official-site page text when web
  // identity checks aren't in high-risk territory.
  if (
    siteFetch?.ok &&
    siteServices.length >= 1 &&
    hallucination.risk < 3
  ) {
    const merged = [...new Set(siteServices)].sort();
    const confident =
      siteServices.length >= 2 ||
      (siteServices.length >= 1 && siteText.length > 1500);
    if (confident && !sameStringSet(merged, org.services)) {
      proposed.services = merged;
      changes.push(
        `services: [${org.services.join(", ")}] → [${merged.join(", ")}]`,
      );
    }
  }

  // Languages: require site evidence of language offerings (not header chrome alone).
  if (
    siteFetch?.ok &&
    siteLanguages.length >= 1 &&
    hallucination.risk < 3
  ) {
    const langSection =
      /language|hablamos|we speak|bilingual|interpret|served in/i.test(
        siteText,
      );
    const multi = siteLanguages.length >= 2 || langSection;
    if (multi) {
      const langs = [...new Set(siteLanguages)];
      if (
        !langs.includes("English") &&
        (org.languages ?? []).includes("English")
      ) {
        langs.unshift("English");
      }
      if (!sameStringSet(langs, org.languages)) {
        proposed.languages = langs;
        changes.push(
          `languages: [${(org.languages ?? []).join(", ")}] → [${langs.join(", ")}]`,
        );
      }
    }
  }

  let status = "verified";
  if (hallucination.verdict === "flag_for_deletion") {
    status = "flagged_fake";
  } else if (hallucination.verdict === "needs_review") {
    status = "needs_review";
  } else if (changes.length > 0) {
    status = "updated";
  }

  return {
    id: org.id,
    name: org.name,
    city: org.city,
    state: org.state,
    status,
    risk: hallucination.risk,
    flags: hallucination.flags,
    searchProvider: search.provider,
    searchResultCount: search.results.length,
    searchError: search.error,
    listedWebsite,
    recommendedWebsite: proposed.website_url ?? listedWebsite ?? candidateOfficial,
    detectedServices: siteServices,
    detectedLanguages: siteLanguages,
    currentServices: org.services,
    currentLanguages: org.languages ?? [],
    proposed,
    changes,
    notes: [],
  };
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, () =>
      run(),
    ),
  );
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

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

  const searchMode = process.env.SERPER_API_KEY
    ? "serper"
    : process.env.BRAVE_SEARCH_API_KEY
      ? "brave"
      : "duckduckgo-fallback";

  console.log(
    `\nOrganization verification` +
      (options.apply ? " (APPLY mode)" : " (dry-run)") +
      `\n  search=${searchMode} concurrency=${options.concurrency}` +
      (options.limit != null ? ` limit=${options.limit}` : "") +
      (options.onlyName ? ` only-name=${options.onlyName}` : "") +
      "\n",
  );

  if (searchMode === "duckduckgo-fallback") {
    console.log(
      "Tip: set SERPER_API_KEY or BRAVE_SEARCH_API_KEY in .env.local for more reliable search.\n",
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });

  const orgs = await loadOrganizations(supabase, options);
  console.log(`Loaded ${orgs.length} organization(s).\n`);

  if (orgs.length === 0) {
    console.log("Nothing to verify.");
    return;
  }

  const serviceIdCache = new Map();
  let done = 0;

  const records = await mapPool(orgs, options.concurrency, async (org) => {
    try {
      const result = await verifyOrganization(org, options);

      if (
        options.apply &&
        result.status === "updated" &&
        Object.keys(result.proposed).length > 0
      ) {
        await applyOrgUpdates(supabase, org, result.proposed, serviceIdCache);
        result.notes.push("applied_to_database");
      } else if (options.apply && result.status === "flagged_fake") {
        // Never auto-delete; optional soft-flag by deactivating website
        if (isPlaceholderHost(org.website_url)) {
          await supabase
            .from("organizations")
            .update({
              is_website_active: false,
              website_check_error:
                "Flagged as likely placeholder/hallucination",
              website_checked_at: new Date().toISOString(),
            })
            .eq("id", org.id);
          result.notes.push("soft_flagged_inactive_website_only");
        }
        result.notes.push("not_deleted_awaiting_human_approval");
      } else if (
        options.apply &&
        result.status === "needs_review" &&
        Object.keys(result.proposed).length > 0
      ) {
        result.notes.push("proposed_changes_held_for_review_not_applied");
      }

      done += 1;
      const tag =
        result.status === "verified"
          ? "OK   "
          : result.status === "updated"
            ? "UPD  "
            : result.status === "flagged_fake"
              ? "FAKE "
              : "REV  ";
      process.stdout.write(
        `[${String(done).padStart(String(orgs.length).length)}/${orgs.length}] ${tag} ${org.name}` +
          (result.changes.length ? ` — ${result.changes.join("; ")}` : "") +
          (result.flags.length ? `  flags=${result.flags.join(",")}` : "") +
          "\n",
      );

      if (options.sleepMs) await sleep(options.sleepMs);
      return result;
    } catch (error) {
      done += 1;
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(
        `[${String(done).padStart(String(orgs.length).length)}/${orgs.length}] ERR   ${org.name} — ${message}\n`,
      );
      if (options.sleepMs) await sleep(options.sleepMs);
      return {
        id: org.id,
        name: org.name,
        city: org.city,
        state: org.state,
        status: "error",
        risk: 0,
        flags: ["runtime_error"],
        error: message,
        changes: [],
        proposed: {},
        notes: [],
      };
    }
  });

  const verified = records.filter((r) => r.status === "verified");
  const updated = records.filter((r) => r.status === "updated");
  const flagged = records.filter((r) => r.status === "flagged_fake");
  const review = records.filter((r) => r.status === "needs_review");
  const errors = records.filter((r) => r.status === "error");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, `org-verification-${stamp}.json`);
  const summaryPath = join(reportsDir, `org-verification-${stamp}.md`);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply" : "dry-run",
    searchMode,
    counts: {
      total: records.length,
      verified: verified.length,
      updated: updated.length,
      flagged_fake: flagged.length,
      needs_review: review.length,
      error: errors.length,
    },
    flagged_for_deletion: flagged.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      state: r.state,
      risk: r.risk,
      flags: r.flags,
      listedWebsite: r.listedWebsite,
    })),
    updated: updated.map((r) => ({
      id: r.id,
      name: r.name,
      changes: r.changes,
      proposed: r.proposed,
    })),
    needs_review: review.map((r) => ({
      id: r.id,
      name: r.name,
      risk: r.risk,
      flags: r.flags,
      changes: r.changes,
    })),
    verified: verified.map((r) => ({
      id: r.id,
      name: r.name,
      website: r.recommendedWebsite,
    })),
    records,
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const md = [
    `# Organization verification report`,
    ``,
    `- Generated: ${report.generatedAt}`,
    `- Mode: **${report.mode}**`,
    `- Search: ${searchMode}`,
    ``,
    `## Summary`,
    ``,
    `| Status | Count |`,
    `| --- | ---: |`,
    `| Verified | ${verified.length} |`,
    `| Updated | ${updated.length} |`,
    `| Flagged (fake/hallucination) | ${flagged.length} |`,
    `| Needs review | ${review.length} |`,
    `| Errors | ${errors.length} |`,
    `| **Total** | **${records.length}** |`,
    ``,
    `## Flagged for deletion (approve manually)`,
    ``,
    ...(flagged.length
      ? flagged.map(
          (r) =>
            `- **${r.name}** (${[r.city, r.state].filter(Boolean).join(", ")}) — risk ${r.risk}; flags: ${r.flags.join(", ")}; website: ${r.listedWebsite ?? "—"}`,
        )
      : ["_None_"]),
    ``,
    `## Updated`,
    ``,
    ...(updated.length
      ? updated.map(
          (r) =>
            `- **${r.name}**: ${r.changes.join("; ") || "(see JSON)"}`,
        )
      : ["_None_"]),
    ``,
    `## Needs review`,
    ``,
    ...(review.length
      ? review.map(
          (r) =>
            `- **${r.name}** — risk ${r.risk}; ${r.flags.join(", ")}${r.changes.length ? `; pending: ${r.changes.join("; ")}` : ""}`,
        )
      : ["_None_"]),
    ``,
    `Full machine-readable report: \`${reportPath}\``,
    ``,
  ].join("\n");

  writeFileSync(summaryPath, md, "utf8");

  console.log("\n── Summary ──────────────────────────────────────────");
  console.log(`Verified:       ${verified.length}`);
  console.log(`Updated:        ${updated.length}`);
  console.log(`Flagged fake:   ${flagged.length}`);
  console.log(`Needs review:   ${review.length}`);
  console.log(`Errors:         ${errors.length}`);
  if (!options.apply) {
    console.log("(dry-run — re-run with --apply to write high-confidence fixes)");
  }
  console.log(`\nReport JSON: ${reportPath}`);
  console.log(`Report MD:   ${summaryPath}`);

  if (flagged.length) {
    console.log("\n── Flagged for deletion (human approval required) ──");
    for (const r of flagged) {
      console.log(
        `- ${r.name} (${[r.city, r.state].filter(Boolean).join(", ")}) risk=${r.risk} flags=${r.flags.join(",")}`,
      );
    }
  }
}

main().catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});
