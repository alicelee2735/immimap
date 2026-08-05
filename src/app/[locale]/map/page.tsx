import { Suspense } from "react";
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
    <main className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        }
      >
        <MapDashboard />
      </Suspense>
    </main>
  );
}
