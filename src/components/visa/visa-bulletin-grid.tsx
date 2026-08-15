"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  VISA_BULLETIN_COUNTRIES,
  formatCategoryLabel,
  getCategoryCardsForCountry,
  getEntryChartDate,
  getEntryStatus,
} from "@/lib/visa-bulletin-data";
import type {
  VisaBulletinCountry,
  VisaBulletinDateValue,
  VisaBulletinEntry,
  VisaCategory,
  VisaChartType,
} from "@/types/immimap";

type Props = {
  entries: VisaBulletinEntry[];
  bulletinYear: number;
  bulletinMonthLabel: string;
};

function formatBulletinDate(value: string, _locale: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function VisaBulletinGrid({
  entries,
  bulletinYear,
  bulletinMonthLabel,
}: Props) {
  const t = useTranslations("VisaBulletin");
  const locale = useLocale();
  const [selectedCountry, setSelectedCountry] =
    useState<VisaBulletinCountry>("All Chargeability");
  const [chartType, setChartType] = useState<VisaChartType>("finalAction");

  const countryTabLabel = (country: VisaBulletinCountry) => {
    if (country === "All Chargeability") return t("allOthersTab");
    return t(`countries.${country}`);
  };

  const countrySelectLabel = (country: VisaBulletinCountry) => {
    if (country === "All Chargeability") {
      return t("allChargeabilityExceptListed");
    }
    return t(`countries.${country}`);
  };

  const cards = useMemo(
    () => getCategoryCardsForCountry(entries, selectedCountry),
    [entries, selectedCountry],
  );

  const activeChartLabel = t(`chartTypes.${chartType}`);

  return (
    <div className="overflow-hidden border border-slate-200 bg-slate-50/40">
      <div className="space-y-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t("gridTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("gridSubtitle", { month: bulletinMonthLabel, year: bulletinYear })}
          </p>
        </div>

        {/* Country filter — mobile */}
        <div className="md:hidden">
          <label
            htmlFor="visa-bulletin-country"
            className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-gray-500"
          >
            {t("countryFilterLabel")}
          </label>
          <select
            id="visa-bulletin-country"
            value={selectedCountry}
            onChange={(e) =>
              setSelectedCountry(e.target.value as VisaBulletinCountry)
            }
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {VISA_BULLETIN_COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {countrySelectLabel(country)}
              </option>
            ))}
          </select>
        </div>

        {/* Country filter — desktop tabs */}
        <div className="hidden md:block">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
            {t("countryFilterLabel")}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label={t("countryFilterLabel")}
          >
            {VISA_BULLETIN_COUNTRIES.map((country) => (
              <button
                key={country}
                type="button"
                role="tab"
                aria-selected={selectedCountry === country}
                onClick={() => setSelectedCountry(country)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedCountry === country
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                {countryTabLabel(country)}
              </button>
            ))}
          </div>
        </div>

        {/* Chart type toggle */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            {t("chartTypeLabel")}
          </p>
          <div
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
            role="group"
            aria-label={t("chartTypeLabel")}
          >
            {(["finalAction", "filing"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setChartType(type)}
                aria-pressed={chartType === type}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  chartType === type
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900",
                )}
              >
                {t(`chartTypes.${type}`)}
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-blue-700">
            {t("viewingChart", { chart: activeChartLabel })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start justify-items-start gap-6 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {cards.map(({ category, entry }) => (
          <BulletinCard
            key={`${category}-${selectedCountry}-${chartType}`}
            category={category}
            entry={entry}
            chartType={chartType}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

function BulletinCard({
  category,
  entry,
  chartType,
  locale,
}: {
  category: VisaCategory;
  entry: VisaBulletinEntry | null;
  chartType: VisaChartType;
  locale: string;
}) {
  const t = useTranslations("VisaBulletin");

  const chartDate: VisaBulletinDateValue | null = entry
    ? getEntryChartDate(entry, chartType)
    : null;

  const isUnavailable =
    !entry || chartDate === null || chartDate === "U";
  const isCurrent = !isUnavailable && chartDate === "C";
  const status = entry ? getEntryStatus(entry) : null;

  const primaryMetric = isUnavailable
    ? "—"
    : isCurrent
      ? t("currentShort")
      : formatBulletinDate(chartDate as string, locale);

  return (
    <article className="w-full self-start rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-mono text-lg font-semibold text-gray-900">
            {formatCategoryLabel(category)}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {t(`categories.${category}`)}
          </p>
        </div>
        {isUnavailable ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {t("statusBadgeUnavailable")}
          </span>
        ) : status === "Current" || isCurrent ? (
          <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            {t("statusBadgeCurrent")}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {t("statusBadgeBacklog")}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-bold tracking-tight tabular-nums",
          isUnavailable ? "text-gray-400" : "text-blue-600",
        )}
        aria-label={
          isUnavailable ? t("statusBadgeUnavailable") : undefined
        }
      >
        {primaryMetric}
      </p>
      <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-500">
        <p>{t(`chartTypes.${chartType}`)}</p>
      </div>
    </article>
  );
}
