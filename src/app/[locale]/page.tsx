import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { HomeHero } from "@/components/home/home-hero";
import { getServiceCategoryCounts } from "@/lib/services-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categoryCounts = await getServiceCategoryCounts();

  return (
    <main className="flex flex-1 flex-col bg-background">
      <HomeHero categoryCounts={categoryCounts} />
    </main>
  );
}
