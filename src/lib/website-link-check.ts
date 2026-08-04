/**
 * Shared website reachability checks for organization website_url values.
 * Used by the audit script and any future server-side rechecks.
 */

export type WebsiteCheckResult = {
  url: string;
  active: boolean;
  statusCode: number | null;
  error: string | null;
  checkedAt: string;
};

export type CheckUrlOptions = {
  /** Request timeout in milliseconds. Default 10_000. */
  timeoutMs?: number;
  /** Extra headers. Defaults include a browser-like User-Agent. */
  headers?: Record<string, string>;
};

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "ImmimapLinkChecker/1.0 (+https://immimap.org; website availability audit)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/** Normalize a stored website string into an absolute http(s) URL, or null. */
export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
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

/**
 * True when an HTTP status indicates the host is still serving the site
 * (including bot walls / auth gates), vs a definitive broken page.
 */
export function isSuccessStatus(status: number): boolean {
  if (status >= 200 && status < 400) return true;
  // Common anti-bot / WAF / auth responses still mean the host is alive
  if (status === 401 || status === 403 || status === 405 || status === 429) {
    return true;
  }
  return false;
}

function classifyNetworkError(error: unknown): string {
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
  if (
    combined.includes("econnreset") ||
    combined.includes("socket hang up")
  ) {
    return `Connection reset: ${message}`;
  }

  return message;
}

async function fetchOnce(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
  headers: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: controller.signal,
      // Avoid browser-only defaults when run under Node/undici
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe a website URL with HEAD (fallback GET) and a timeout.
 * Treats DNS failures, timeouts, 404/410, and 5xx as inactive.
 */
export async function checkWebsiteUrl(
  rawUrl: string,
  options: CheckUrlOptions = {},
): Promise<WebsiteCheckResult> {
  const checkedAt = new Date().toISOString();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const headers = { ...DEFAULT_HEADERS, ...options.headers };

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
    let response: Response;
    try {
      response = await fetchOnce(url, "HEAD", timeoutMs, headers);
      // Some hosts reject HEAD; retry with GET
      if (response.status === 405 || response.status === 501) {
        response = await fetchOnce(url, "GET", timeoutMs, headers);
      }
    } catch {
      response = await fetchOnce(url, "GET", timeoutMs, headers);
    }

    // Discard body promptly on GET to free the connection
    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        // ignore cancel failures
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
