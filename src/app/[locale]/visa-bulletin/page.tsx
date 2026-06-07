import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { VisaBulletinDashboard } from "@/components/visa/visa-bulletin-dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("visaBulletinTitle"),
    description: t("visaBulletinDescription"),
  };
}

export default async function VisaBulletinPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex-1 bg-slate-50 py-10">
      <PageContainer>
        <VisaBulletinDashboard />
      </PageContainer>
    </main>
  );
}
