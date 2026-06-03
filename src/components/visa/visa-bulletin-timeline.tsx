"use client";

import { useState, useMemo, useId } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  VISA_CATEGORIES,
  VISA_BULLETIN_COUNTRIES,
  formatCategoryLabel,
  getFinalActionDate,
} from "@/lib/visa-bulletin-data";
import type {
  VisaBulletinEntry,
  VisaCategory,
  VisaBulletinCountry,
} from "@/types/immimap";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Fixed timeline axis: Jan 1 2000 → Jan 1 2030.
 * Covers every realistic priority date for both family and employment-based.
 */
const AXIS_START = new Date("2000-01-01T00:00:00Z");
const AXIS_END = new Date("2030-01-01T00:00:00Z");
const AXIS_MS = AXIS_END.getTime() - AXIS_START.getTime();

const COUNTRIES = VISA_BULLETIN_COUNTRIES;

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateToPct(date: Date): number {
  return Math.max(
    0,
    Math.min(100, ((date.getTime() - AXIS_START.getTime()) / AXIS_MS) * 100),
  );
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

function monthDiff(a: Date, b: Date): number {
  return Math.round(
    (b.getTime() - a.getTime()) / (30.44 * 24 * 60 * 60 * 1000),
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  entries: VisaBulletinEntry[];
  bulletinMonth: number;
  bulletinYear: number;
};

export function VisaBulletinTimeline({
  entries,
  bulletinMonth,
  bulletinYear,
}: Props) {
  const t = useTranslations("VisaBulletin");
  const categoryId = useId();
  const countryId = useId();
  const dateId = useId();

  const [category, setCategory] = useState<VisaCategory>("EB1");
  const [country, setCountry] = useState<VisaBulletinCountry>(
    "All Chargeability",
  );
  const [priorityDateStr, setPriorityDateStr] = useState<string>("");

  const cutoff = useMemo(
    () => getFinalActionDate(entries, category, country),
    [entries, category, country],
  );

  const computed = useMemo(() => {
    if (!cutoff || cutoff === "U" || cutoff === "C") return null;
    if (!priorityDateStr) return null;

    const userDate = new Date(`${priorityDateStr}T00:00:00Z`);
    const cutoffDate = new Date(`${cutoff}T00:00:00Z`);

    if (isNaN(userDate.getTime())) return null;

    const isCurrent = userDate <= cutoffDate;
    const cutoffPct = dateToPct(cutoffDate);
    const userPct = dateToPct(userDate);
    const waitMonths = isCurrent ? 0 : monthDiff(cutoffDate, userDate);

    return { isCurrent, cutoffPct, userPct, cutoffDate, userDate, waitMonths };
  }, [cutoff, priorityDateStr]);

  const MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <div className="space-y-8">
      {/* ── Selectors ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor={categoryId}
            className="block text-sm font-medium text-gray-700"
          >
            {t("categoryLabel")}
          </label>
          <select
            id={categoryId}
            value={category}
            onChange={(e) => setCategory(e.target.value as VisaCategory)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {VISA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatCategoryLabel(c)} — {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={countryId}
            className="block text-sm font-medium text-gray-700"
          >
            {t("countryLabel")}
          </label>
          <select
            id={countryId}
            value={country}
            onChange={(e) =>
              setCountry(e.target.value as VisaBulletinCountry)
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c === "All Chargeability"
                  ? t("allChargeabilityExceptListed")
                  : t(`countries.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={dateId}
            className="block text-sm font-medium text-gray-700"
          >
            {t("priorityDateLabel")}
          </label>
          <input
            id={dateId}
            type="date"
            value={priorityDateStr}
            onChange={(e) => setPriorityDateStr(e.target.value)}
            min="1990-01-01"
            max="2030-12-31"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* ── Cutoff info (always shown) ───────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
          {MONTH_NAMES[bulletinMonth]} {bulletinYear} — {t("cutoffLabel")}
        </p>
        {cutoff === "C" ? (
          <p className="mt-1 text-2xl font-semibold text-emerald-600">
            {t("current")}
          </p>
        ) : cutoff === "U" ? (
          <p className="mt-1 text-2xl font-semibold text-red-600">
            {t("unavailable")}
          </p>
        ) : cutoff ? (
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatDate(cutoff)}
          </p>
        ) : (
          <p className="mt-1 text-xl text-gray-400">{t("noData")}</p>
        )}
      </div>

      {/* ── Special states: C or U ───────────────────────────────────────── */}
      {cutoff === "C" && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
          <span className="mt-0.5 text-lg" aria-hidden>
            ✅
          </span>
          <p className="text-sm leading-6 text-emerald-800">
            {t("currentDescription", { category, country })}
          </p>
        </div>
      )}
      {cutoff === "U" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4">
          <span className="mt-0.5 text-lg" aria-hidden>
            🚫
          </span>
          <p className="text-sm leading-6 text-red-800">
            {t("unavailableDescription", { category, country })}
          </p>
        </div>
      )}

      {/* ── Timeline visualization ───────────────────────────────────────── */}
      {cutoff && cutoff !== "C" && cutoff !== "U" && (
        <div className="space-y-6">
          {/* Progress bar */}
          <div>
            <div className="mb-3 flex items-end justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">
                {t("timelineLabel")}
              </p>
              <p className="text-xs text-gray-400">
                2000 — 2030
              </p>
            </div>

            {/* The ruler */}
            <div className="relative h-7">
              {/* Track */}
              <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-100" />

              {/* Filled bar: axis start → cutoff */}
              <div
                className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${computed ? computed.cutoffPct : dateToPct(new Date(`${cutoff}T00:00:00Z`))}%`,
                }}
              />

              {/* Cutoff marker */}
              {(() => {
                const pct = dateToPct(new Date(`${cutoff}T00:00:00Z`));
                return (
                  <div
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pct}%` }}
                  >
                    <div className="h-5 w-1 rounded-full bg-blue-700" />
                  </div>
                );
              })()}

              {/* User date marker — only when input is provided */}
              {computed && (
                <div
                  className={cn(
                    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
                  )}
                  style={{ left: `${computed.userPct}%` }}
                >
                  <div
                    className={cn(
                      "h-5 w-3 rounded-full border-2 border-white shadow",
                      computed.isCurrent ? "bg-emerald-500" : "bg-amber-400",
                    )}
                  />
                </div>
              )}
            </div>

            {/* Labels below the ruler */}
            <div className="relative mt-4 h-12 text-xs text-gray-500">
              {/* Cutoff label */}
              {(() => {
                const pct = dateToPct(new Date(`${cutoff}T00:00:00Z`));
                const rightAlign = pct > 70;
                return (
                  <div
                    className="absolute flex flex-col items-center gap-0.5"
                    style={{
                      left: rightAlign ? "auto" : `${pct}%`,
                      right: rightAlign ? `${100 - pct}%` : "auto",
                      transform: rightAlign ? "none" : "translateX(-50%)",
                    }}
                  >
                    <span className="whitespace-nowrap font-medium text-blue-700">
                      {t("cutoffMarker")}
                    </span>
                    <span className="whitespace-nowrap">
                      {formatDate(cutoff)}
                    </span>
                  </div>
                );
              })()}

              {/* User label */}
              {computed && (
                <div
                  className={cn(
                    "absolute flex flex-col items-center gap-0.5",
                    computed.userPct > 50
                      ? "items-end"
                      : "items-start",
                  )}
                  style={{
                    left:
                      computed.userPct <= 50
                        ? `${computed.userPct}%`
                        : "auto",
                    right:
                      computed.userPct > 50
                        ? `${100 - computed.userPct}%`
                        : "auto",
                  }}
                >
                  <span
                    className={cn(
                      "whitespace-nowrap font-medium",
                      computed.isCurrent
                        ? "text-emerald-600"
                        : "text-amber-600",
                    )}
                  >
                    {t("yourDateMarker")}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatDate(priorityDateStr)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status card */}
          {computed && (
            <div
              className={cn(
                "rounded-lg border px-5 py-4",
                computed.isCurrent
                  ? "border-emerald-200 bg-emerald-50"
                  : computed.waitMonths <= 24
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50",
              )}
            >
              {computed.isCurrent ? (
                <div className="flex items-start gap-3">
                  <span className="text-lg" aria-hidden>
                    ✅
                  </span>
                  <div>
                    <p className="font-semibold text-emerald-800">
                      {t("statusCurrent")}
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      {t("statusCurrentDetail", { category, country })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="text-lg" aria-hidden>
                    ⏳
                  </span>
                  <div>
                    <p
                      className={cn(
                        "font-semibold",
                        computed.waitMonths <= 24
                          ? "text-amber-800"
                          : "text-red-800",
                      )}
                    >
                      {t("statusWaiting", { months: computed.waitMonths })}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        computed.waitMonths <= 24
                          ? "text-amber-700"
                          : "text-red-700",
                      )}
                    >
                      {t("statusWaitingDetail", {
                        cutoff: formatDate(cutoff),
                        userDate: formatDate(priorityDateStr),
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state — no date entered yet */}
          {!computed && !priorityDateStr && (
            <p className="text-sm text-gray-400 italic">
              {t("enterDatePrompt")}
            </p>
          )}
        </div>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <p className="text-xs leading-5 text-gray-400">{t("disclaimer")}</p>
    </div>
  );
}
