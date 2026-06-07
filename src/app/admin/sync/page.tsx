"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SyncStatusSnapshot } from "@/types/database.types";

export default function AdminSyncPage() {
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/sync-status");
      if (!response.ok) {
        throw new Error("Failed to load sync status.");
      }

      const payload = (await response.json()) as SyncStatusSnapshot;
      setStatus(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load sync status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleManualSync() {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/sync-data", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Sync failed.");
      }

      await loadStatus();
    } catch (syncError) {
      setError(
        syncError instanceof Error ? syncError.message : "Sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Official data sync
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor cron ingestion for visa bulletin and USCIS processing times.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void handleManualSync()}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <RefreshCw aria-hidden />
          )}
          Run sync now
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading sync status…
        </div>
      ) : status ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusCard label="Syncing" value={status.isSyncing ? "Yes" : "No"} />
          <StatusCard
            label="Last run"
            value={
              status.lastRunAt
                ? new Date(status.lastRunAt).toLocaleString()
                : "Never"
            }
          />
          <StatusCard label="Last status" value={status.lastStatus ?? "—"} />
          <StatusCard
            label="Consecutive failures"
            value={String(status.consecutiveFailures)}
          />
          <StatusCard
            label="Circuit breaker"
            value={status.circuitBreakerOpen ? "Open" : "Closed"}
          />
          <StatusCard
            label="Visa bulletin updated"
            value={
              status.visaBulletinUpdatedAt
                ? new Date(status.visaBulletinUpdatedAt).toLocaleString()
                : "—"
            }
          />
          <StatusCard
            label="Processing times updated"
            value={
              status.processingTimesUpdatedAt
                ? new Date(status.processingTimesUpdatedAt).toLocaleString()
                : "—"
            }
          />
          {status.lastError ? (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Last error: {status.lastError}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
