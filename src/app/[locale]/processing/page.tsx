import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { ProcessingDashboard } from "@/components/processing/processing-dashboard";
import { formatLocaleDateTime } from "@/lib/format-locale-date";
import { getCachedProcessingTimesData } from "@/lib/official-data";
import { getUniqueFormTypes } from "@/lib/uscis-data";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ form?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("processingTitle"),
    description: t("processingDescription"),
  };
}

export default async function ProcessingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { form } = await searchParams;
  setRequestLocale(locale);

  let payload = null;
  try {
    payload = await getCachedProcessingTimesData();
  } catch {
    payload = null;
  }

  const data = payload?.content;
  const formTypes = data ? getUniqueFormTypes(data) : [];
  const selectedForm =
    form && formTypes.includes(form) ? form : null;
  const formattedLastUpdated = data
    ? formatLocaleDateTime(data.last_updated_iso, locale, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const formattedPreviousPeriod = data?.previous_period_iso
    ? formatLocaleDateTime(data.previous_period_iso, locale, {
        dateStyle: "medium",
      })
    : null;
  const formattedProvenanceUpdatedAt = data
    ? formatLocaleDateTime(
        payload?.record?.updated_at ?? data.last_updated_iso,
        locale,
        {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        },
      )
    : null;

  return (
    <main className="flex-1 bg-slate-50 py-8">
      <PageContainer>
        <ProcessingDashboard
          payload={payload}
          locale={locale}
          selectedForm={selectedForm}
          formattedLastUpdated={formattedLastUpdated}
          formattedPreviousPeriod={formattedPreviousPeriod}
          formattedProvenanceUpdatedAt={formattedProvenanceUpdatedAt}
        />
      </PageContainer>
    </main>
  );
}
