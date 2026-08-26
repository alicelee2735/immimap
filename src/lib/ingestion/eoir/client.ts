/**
 * Service-role Supabase client for ingestion writes.
 *
 * Deliberately separate from `getSupabaseAdminClient`, which falls back to the
 * anon key. An ingest running on the anon key would be blocked by RLS, so this
 * factory requires the service-role key and refuses to construct without it.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export async function createIngestClient(): Promise<SupabaseClient> {
  // The service-role key bypasses RLS; it must never reach a browser bundle.
  if (typeof window !== "undefined") {
    throw new Error(
      "The ingestion client is server-only and must not run in a browser.",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Organization ingestion writes " +
        "require the service-role key; the anon key is blocked by RLS.",
    );
  }

  // supabase-js constructs a realtime client eagerly and Node < 22 ships no
  // native WebSocket, so importing this module would throw before any query
  // runs. Ingestion never subscribes to realtime; polyfilling the global is
  // enough to get past construction, and is a no-op on Node 22+ / Vercel.
  if (typeof globalThis.WebSocket === "undefined") {
    // @ts-expect-error no bundled types for ws
    const ws = await import("ws");
    (globalThis as { WebSocket?: unknown }).WebSocket = ws.default;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
