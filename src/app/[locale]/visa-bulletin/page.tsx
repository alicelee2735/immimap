import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { VisaBulletinDashboard } from "@/components/visa/visa-bulletin-dashboard";
import { formatLocaleDateTime } from "@/lib/format-locale-date";
import { getCachedVisaBulletinData } from "@/lib/official-data";

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

  let payload = null;
  try {
    payload = await getCachedVisaBulletinData();
  } catch {
    payload = null;
  }

  const dataset = payload?.content;
  const formattedProvenanceUpdatedAt = dataset
    ? formatLocaleDateTime(
        payload?.record?.updated_at ?? dataset.last_updated_iso,
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
    <main className="flex-1 bg-slate-50 py-10">
      <PageContainer>
        <VisaBulletinDashboard
          payload={payload}
          locale={locale}
          formattedProvenanceUpdatedAt={formattedProvenanceUpdatedAt}
        />
      </PageContainer>
    </main>
  );
}
