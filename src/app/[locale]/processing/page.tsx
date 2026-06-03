import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { ProcessingVelocityTable } from "@/components/processing/processing-velocity-table";
import { getUscisProcessingDataset } from "@/lib/uscis-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("processingTitle"),
    description: t("processingDescription"),
  };
}

export default async function ProcessingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Processing");
  const data = getUscisProcessingDataset();

  return (
    <main className="flex-1 bg-slate-50 py-8">
      <PageContainer className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            {t("sourceLine")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
            {t("pageTitle")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">{t("pageLead")}</p>
        </div>

        {/* ── Velocity index table ─────────────────────────────────────── */}
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
      </PageContainer>
    </main>
  );
}
