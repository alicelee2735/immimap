"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { DataMaintenanceState } from "@/components/data/DataMaintenanceState";
import { DataProvenanceFooter } from "@/components/data/DataProvenanceFooter";
import { ProcessingVelocityTable } from "@/components/processing/processing-velocity-table";
import { USCIS_PROCESSING_SOURCE_URL } from "@/lib/ingestion/constants";
import type { OfficialDataRecord } from "@/types/database.types";
import type { UscisProcessingDataset } from "@/types/immimap";

type ApiPayload = {
  record: OfficialDataRecord | null;
  content: UscisProcessingDataset;
  stale: boolean;
  fromFallback: boolean;
};

export function ProcessingDashboard() {
  const t = useTranslations("Processing");
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
        const response = await fetch("/api/processing-times");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("loading")}
      </div>
    );
  }

  const data = payload?.content;

  if (failed || !data || data.rows.length === 0) {
    return (
      <DataMaintenanceState
        officialUrl={USCIS_PROCESSING_SOURCE_URL}
        className="py-4"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          {t("sourceLine")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
          {t("pageTitle")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{t("pageLead")}</p>
        <div
          className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
          role="note"
        >
          {t("dataAccuracyDisclaimer")}
        </div>
      </div>

      <div className="overflow-hidden border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900">
            {t("tableCardTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("velocityIndexLead")}
          </p>
        </div>
        <ProcessingVelocityTable data={data} locale={locale} />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      <DataProvenanceFooter
        sourceLabel="U.S. Citizenship and Immigration Services"
        sourceUrl={payload?.record?.source_url ?? USCIS_PROCESSING_SOURCE_URL}
        updatedAt={payload?.record?.updated_at ?? data.last_updated_iso}
        officialLinkLabel={t("officialProcessingLink")}
        officialLinkUrl={USCIS_PROCESSING_SOURCE_URL}
        stale={payload?.stale}
      />
    </div>
  );
}
