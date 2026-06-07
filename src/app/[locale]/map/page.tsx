import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { MapDashboard } from "@/components/map/map-dashboard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("mapTitle"),
    description: t("mapDescription"),
  };
}

export default async function MapPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-background">
      <MapDashboard />
    </main>
  );
}
