"use client";

import { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  getDeltaMonths,
  getUniqueFormTypes,
  shortOfficeName,
} from "@/lib/uscis-data";
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
  if (delta === null) {
    return <span className="text-xs text-slate-300">—</span>;
  }
  if (delta < 0) {
    return (
      <span className="tabular-nums text-xs font-medium text-emerald-600">
        ▲ {Math.abs(delta)} mo faster
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="tabular-nums text-xs font-medium text-amber-600">
        ▼ {delta} mo slower
      </span>
    );
  }
  return <span className="text-xs font-medium text-slate-400">• Stable</span>;
}

// ── Cross-center comparison strip ─────────────────────────────────────────────

function CenterComparisonStrip({
  rows,
}: {
  rows: UscisProcessingDataset["rows"];
}) {
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
                  {" "}mo
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
  locale: string;
};

export function ProcessingVelocityTable({ data, locale }: Props) {
  const t = useTranslations("Processing");
  const formTypes = useMemo(() => getUniqueFormTypes(data), [data]);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

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

  const lastUpdated = new Date(data.last_updated_iso);
  const previousPeriod = data.previous_period_iso
    ? new Date(data.previous_period_iso)
    : null;

  return (
    <div>
      {/* ── Sticky form-code filter ──────────────────────────────────────── */}
      <div className="sticky top-[80px] z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedForm(null)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              !selectedForm
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            All forms
          </button>
          {formTypes.map((form) => (
            <button
              key={form}
              type="button"
              onClick={() =>
                setSelectedForm((prev) => (prev === form ? null : form))
              }
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 font-mono text-sm font-medium transition-colors",
                selectedForm === form
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900",
              )}
            >
              {form}
            </button>
          ))}
        </div>
      </div>

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
                  mo
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
            <p className="text-xs font-medium text-slate-500">
              Database state current as of:{" "}
              <time
                dateTime={data.last_updated_iso}
                className="tabular-nums text-slate-700"
              >
                {lastUpdated.toLocaleString(
                  locale === "zh" ? "zh-CN" : "en-US",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  },
                )}{" "}
                UTC
              </time>
            </p>
            {previousPeriod && (
              <p className="text-xs text-slate-400">
                Compared to:{" "}
                <time
                  dateTime={data.previous_period_iso}
                  className="tabular-nums"
                >
                  {previousPeriod.toLocaleString(
                    locale === "zh" ? "zh-CN" : "en-US",
                    { dateStyle: "medium", timeZone: "UTC" },
                  )}
                </time>
              </p>
            )}
            {data.sync_cadence && (
              <p className="text-xs text-slate-400">
                Automated sync cycle: {data.sync_cadence}
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
              View source data
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
