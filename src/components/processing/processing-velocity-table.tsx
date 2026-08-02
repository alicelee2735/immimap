"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { getDeltaMonths, shortOfficeName } from "@/lib/uscis-data";
import type { UscisProcessingDataset } from "@/types/immimap";

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({
  variant,
  label,
}: {
  variant: "current" | "backlog";
  label: string;
}) {
  if (variant === "current") {
    return (
      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        {label}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      {label}
    </span>
  );
}

// ── Velocity badge ────────────────────────────────────────────────────────────

function VelocityBadge({ delta }: { delta: number | null }) {
  const t = useTranslations("Processing");

  if (delta === null) {
    return <span className="text-xs text-slate-300">—</span>;
  }
  if (delta < 0) {
    return (
      <span className="tabular-nums text-xs font-medium text-emerald-600">
        {t("velocityFaster", { count: Math.abs(delta) })}
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="tabular-nums text-xs font-medium text-amber-600">
        {t("velocitySlower", { count: delta })}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-400">
      {t("velocityStable")}
    </span>
  );
}

// ── Cross-center comparison strip ─────────────────────────────────────────────

function CenterComparisonStrip({
  rows,
}: {
  rows: UscisProcessingDataset["rows"];
}) {
  const t = useTranslations("Processing");

  if (rows.length < 2) return null;

  const sorted = [...rows].sort(
    (a, b) => a.estimated_months - b.estimated_months,
  );

  return (
    <div className="border-b border-slate-100 bg-slate-50/60">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {sorted.map((row, i) => {
          const delta = getDeltaMonths(row);
          return (
            <div
              key={row.office}
              className={cn(
                "px-4 py-4",
                i < sorted.length - 1 && "border-b border-slate-100 md:border-b-0 md:border-r",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                {shortOfficeName(row.office)}
              </p>
              <p className="mt-1 font-variant-numeric tabular-nums text-2xl font-semibold text-gray-950">
                {row.estimated_months}
                <span className="ml-0.5 text-sm font-normal text-slate-400">
                  {" "}
                  {t("monthsUnit")}
                </span>
              </p>
              <div className="mt-0.5">
                <VelocityBadge delta={delta} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = {
  data: UscisProcessingDataset;
  selectedForm: string | null;
  formattedLastUpdated: string | null;
  formattedPreviousPeriod: string | null;
};

export function ProcessingVelocityTable({
  data,
  selectedForm,
  formattedLastUpdated,
  formattedPreviousPeriod,
}: Props) {
  const t = useTranslations("Processing");

  const visibleRows = useMemo(
    () =>
      selectedForm
        ? data.rows.filter((r) => r.form_type === selectedForm)
        : data.rows,
    [data.rows, selectedForm],
  );

  const comparisonRows = useMemo(
    () =>
      selectedForm
        ? data.rows.filter((r) => r.form_type === selectedForm)
        : null,
    [data.rows, selectedForm],
  );

  return (
    <div>
      {/* ── Cross-center comparison ──────────────────────────────────────── */}
      {comparisonRows && <CenterComparisonStrip rows={comparisonRows} />}

      {/* ── Card grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleRows.map((row) => {
          const delta = getDeltaMonths(row);
          const isBacklog = delta !== null && delta > 0;
          return (
            <article
              key={`${row.form_type}-${row.office}`}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-mono text-lg font-semibold text-gray-900">
                  {row.form_type}
                </h3>
                <StatusPill
                  variant={isBacklog ? "backlog" : "current"}
                  label={
                    isBacklog
                      ? t("statusBadgeBacklog")
                      : t("statusBadgeCurrent")
                  }
                />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-blue-600 tabular-nums">
                {row.estimated_months}
                <span className="ml-1 text-base font-semibold text-blue-600/80">
                  {t("monthsUnit")}
                </span>
              </p>
              <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-500">
                <p>{row.office}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {row.previous_estimated_months != null && (
                    <p className="tabular-nums">
                      {t("priorPeriod", {
                        months: row.previous_estimated_months,
                      })}
                    </p>
                  )}
                  <VelocityBadge delta={delta} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Provenance footer ────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-0.5">
            {formattedLastUpdated && (
              <p className="text-xs font-medium text-slate-500">
                {t("dbCurrentAsOf")}{" "}
                <time
                  dateTime={data.last_updated_iso}
                  className="tabular-nums text-slate-700"
                >
                  {formattedLastUpdated} {t("utc")}
                </time>
              </p>
            )}
            {formattedPreviousPeriod && data.previous_period_iso && (
              <p className="text-xs text-slate-400">
                {t("comparedTo")}{" "}
                <time
                  dateTime={data.previous_period_iso}
                  className="tabular-nums"
                >
                  {formattedPreviousPeriod}
                </time>
              </p>
            )}
            {data.sync_cadence && (
              <p className="text-xs text-slate-400">
                {t("automatedSyncCycle", { cadence: data.sync_cadence })}
              </p>
            )}
          </div>
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              {t("viewSourceData")}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
