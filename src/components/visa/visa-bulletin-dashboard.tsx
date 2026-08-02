import { getTranslations } from "next-intl/server";

import { DataMaintenanceState } from "@/components/data/DataMaintenanceState";
import { DataProvenanceFooter } from "@/components/data/DataProvenanceFooter";
import { VisaBulletinGrid } from "@/components/visa/visa-bulletin-grid";
import { VisaBulletinTimeline } from "@/components/visa/visa-bulletin-timeline";
import { formatLocaleDateTime } from "@/lib/format-locale-date";
import {
  VISA_BULLETIN_OFFICIAL_PDF_BASE,
  VISA_BULLETIN_SOURCE_URL,
} from "@/lib/ingestion/constants";
import { getBulletinEntriesFromDataset } from "@/lib/visa-bulletin-data";
import type { OfficialDataRecord } from "@/types/database.types";
import type { VisaBulletinDataset } from "@/types/immimap";

export type VisaBulletinDataPayload = {
  record: OfficialDataRecord | null;
  content: VisaBulletinDataset;
  stale: boolean;
  fromFallback: boolean;
};

type Props = {
  payload: VisaBulletinDataPayload | null;
  locale: string;
  formattedProvenanceUpdatedAt: string | null;
};

export async function VisaBulletinDashboard({
  payload,
  locale,
  formattedProvenanceUpdatedAt,
}: Props) {
  const t = await getTranslations("VisaBulletin");

  const dataset = payload?.content;
  const entries = dataset ? getBulletinEntriesFromDataset(dataset) : [];

  if (!dataset || entries.length === 0) {
    return (
      <DataMaintenanceState
        officialUrl={VISA_BULLETIN_SOURCE_URL}
        className="py-4"
      />
    );
  }

  const bulletinMonthIso = `${dataset.bulletin_year}-${String(dataset.bulletin_month).padStart(2, "0")}-01T00:00:00.000Z`;
  const bulletinMonthName = formatLocaleDateTime(bulletinMonthIso, locale, {
    month: "long",
  });
  const bulletinMonthShort = formatLocaleDateTime(bulletinMonthIso, locale, {
    month: "short",
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
        <div
          className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
          role="note"
        >
          {t("dataAccuracyDisclaimer")}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-6 py-6 sm:px-8">
        <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-gray-500">
          {t("timelineSection")}
        </h2>
        <VisaBulletinTimeline
          entries={entries}
          bulletinMonth={dataset.bulletin_month}
          bulletinYear={dataset.bulletin_year}
          bulletinMonthLabel={bulletinMonthShort}
        />
      </div>

      <VisaBulletinGrid
        entries={entries}
        bulletinYear={dataset.bulletin_year}
        bulletinMonthLabel={bulletinMonthName}
      />

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      <DataProvenanceFooter
        sourceLabel="U.S. Department of State — Visa Bulletin"
        sourceUrl={payload?.record?.source_url ?? VISA_BULLETIN_SOURCE_URL}
        updatedAt={payload?.record?.updated_at ?? dataset.last_updated_iso}
        formattedUpdatedAt={formattedProvenanceUpdatedAt}
        officialLinkLabel={t("officialBulletinLink")}
        officialLinkUrl={officialPdfUrl}
        stale={payload?.stale}
      />
    </div>
  );
}
