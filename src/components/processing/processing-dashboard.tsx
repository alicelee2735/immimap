import { getTranslations } from "next-intl/server";

import { DataMaintenanceState } from "@/components/data/DataMaintenanceState";
import { DataProvenanceFooter } from "@/components/data/DataProvenanceFooter";
import { ProcessingFormFilters } from "@/components/processing/processing-form-filters";
import { ProcessingVelocityTable } from "@/components/processing/processing-velocity-table";
import { USCIS_PROCESSING_SOURCE_URL } from "@/lib/ingestion/constants";
import { getUniqueFormTypes } from "@/lib/uscis-data";
import type { OfficialDataRecord } from "@/types/database.types";
import type { UscisProcessingDataset } from "@/types/immimap";

export type ProcessingDataPayload = {
  record: OfficialDataRecord | null;
  content: UscisProcessingDataset;
  stale: boolean;
  fromFallback: boolean;
};

type Props = {
  payload: ProcessingDataPayload | null;
  locale: string;
  selectedForm: string | null;
  formattedLastUpdated: string | null;
  formattedPreviousPeriod: string | null;
  formattedProvenanceUpdatedAt: string | null;
};

export async function ProcessingDashboard({
  payload,
  locale,
  selectedForm,
  formattedLastUpdated,
  formattedPreviousPeriod,
  formattedProvenanceUpdatedAt,
}: Props) {
  const t = await getTranslations("Processing");

  const data = payload?.content;

  if (!data || data.rows.length === 0) {
    return (
      <DataMaintenanceState
        officialUrl={USCIS_PROCESSING_SOURCE_URL}
        className="py-4"
      />
    );
  }

  const formTypes = getUniqueFormTypes(data);

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

      <div className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900">
            {t("tableCardTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("velocityIndexLead")}
          </p>
        </div>
        <ProcessingFormFilters
          locale={locale}
          formTypes={formTypes}
          selectedForm={selectedForm}
        />
        <ProcessingVelocityTable
          data={data}
          selectedForm={selectedForm}
          formattedLastUpdated={formattedLastUpdated}
          formattedPreviousPeriod={formattedPreviousPeriod}
        />
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      <DataProvenanceFooter
        sourceLabel="U.S. Citizenship and Immigration Services"
        sourceUrl={payload?.record?.source_url ?? USCIS_PROCESSING_SOURCE_URL}
        updatedAt={payload?.record?.updated_at ?? data.last_updated_iso}
        formattedUpdatedAt={formattedProvenanceUpdatedAt}
        officialLinkLabel={t("officialProcessingLink")}
        officialLinkUrl={USCIS_PROCESSING_SOURCE_URL}
        stale={payload?.stale}
      />
    </div>
  );
}
