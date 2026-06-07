import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { ProcessingDashboard } from "@/components/processing/processing-dashboard";

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

  return (
    <main className="flex-1 bg-slate-50 py-8">
      <PageContainer>
        <ProcessingDashboard />
      </PageContainer>
    </main>
  );
}
