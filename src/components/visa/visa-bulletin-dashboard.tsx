"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { DataMaintenanceState } from "@/components/data/DataMaintenanceState";
import { DataProvenanceFooter } from "@/components/data/DataProvenanceFooter";
import { VisaBulletinGrid } from "@/components/visa/visa-bulletin-grid";
import { VisaBulletinTimeline } from "@/components/visa/visa-bulletin-timeline";
import {
  VISA_BULLETIN_OFFICIAL_PDF_BASE,
  VISA_BULLETIN_SOURCE_URL,
} from "@/lib/ingestion/constants";
import type { OfficialDataRecord } from "@/types/database.types";
import type { VisaBulletinDataset } from "@/types/immimap";

type ApiPayload = {
  record: OfficialDataRecord | null;
  content: VisaBulletinDataset;
  stale: boolean;
  fromFallback: boolean;
  error?: string;
};

export function VisaBulletinDashboard() {
  const t = useTranslations("VisaBulletin");
  const locale = useLocale();
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFailed(false);

      try {
        const response = await fetch("/api/visa-bulletin");
        if (!response.ok) {
          throw new Error("API unavailable");
        }

        const data = (await response.json()) as ApiPayload;
        if (!cancelled) {
          setPayload(data);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setPayload(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
  }, []);

  const dataset = payload?.content;
  const entries = useMemo(
    () => (dataset ? getLatestBulletinEntriesFromDataset(dataset) : []),
    [dataset],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    );
  }

  if (failed || !dataset || entries.length === 0) {
    return (
      <DataMaintenanceState
        officialUrl={VISA_BULLETIN_SOURCE_URL}
        className="py-4"
      />
    );
  }

  const bulletinMonthName = new Date(
    Date.UTC(dataset.bulletin_year, dataset.bulletin_month - 1, 1),
  ).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    timeZone: "UTC",
  });

  const officialPdfUrl = `${VISA_BULLETIN_OFFICIAL_PDF_BASE}${dataset.bulletin_year}/visabulletin_${dataset.bulletin_year}${String(dataset.bulletin_month).padStart(2, "0")}.html`;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {t("pageTitle")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{t("pageLead")}</p>
        <h2 className="text-lg font-medium text-gray-800">
          {t("dataSubtitle", {
            month: bulletinMonthName,
            year: dataset.bulletin_year,
          })}
        </h2>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-6 py-6 sm:px-8">
        <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-gray-500">
          {t("timelineSection")}
        </h2>
        <VisaBulletinTimeline
          entries={entries}
          bulletinMonth={dataset.bulletin_month}
          bulletinYear={dataset.bulletin_year}
        />
      </div>

      <VisaBulletinGrid
        entries={entries}
        bulletinMonth={dataset.bulletin_month}
        bulletinYear={dataset.bulletin_year}
      />

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      <DataProvenanceFooter
        sourceLabel="U.S. Department of State — Visa Bulletin"
        sourceUrl={payload?.record?.source_url ?? VISA_BULLETIN_SOURCE_URL}
        updatedAt={payload?.record?.updated_at ?? dataset.last_updated_iso}
        officialLinkLabel={t("officialBulletinLink")}
        officialLinkUrl={officialPdfUrl}
        stale={payload?.stale}
      />
    </div>
  );
}

function getLatestBulletinEntriesFromDataset(dataset: VisaBulletinDataset) {
  const { entries, bulletin_month, bulletin_year } = dataset;
  return entries.filter(
    (entry) => entry.year === bulletin_year && entry.month === bulletin_month,
  );
}
