import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { MapDashboard } from "@/components/map/map-dashboard";
import { getServices } from "@/lib/services-data";

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

  const t = await getTranslations("Home");
  const services = getServices();

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="border-b border-border/80 bg-gradient-to-b from-primary/10 via-background to-background px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-[1600px] space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t("heroEyebrow")}
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col">
        <MapDashboard services={services} />
      </div>
    </main>
  );
}
