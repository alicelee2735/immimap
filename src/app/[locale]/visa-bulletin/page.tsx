import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { VisaBulletinGrid } from "@/components/visa/visa-bulletin-grid";
import { VisaBulletinTimeline } from "@/components/visa/visa-bulletin-timeline";
import {
  getVisaBulletinDataset,
  getLatestBulletinEntries,
} from "@/lib/visa-bulletin-data";

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

  const t = await getTranslations("VisaBulletin");
  const dataset = getVisaBulletinDataset();
  const entries = getLatestBulletinEntries();

  const bulletinMonthName = new Date(
    Date.UTC(dataset.bulletin_year, dataset.bulletin_month - 1, 1),
  ).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <main className="flex-1 bg-slate-50 py-10">
      <PageContainer className="space-y-8">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {t("pageTitle")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">{t("pageLead")}</p>
          <h2 className="text-lg font-medium text-gray-800">
            {t("dataSubtitle", {
              month: bulletinMonthName,
              year: dataset.bulletin_year,
            })}
          </h2>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-6 sm:px-8">
          <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-gray-500">
            {t("timelineSection")}
          </h2>
          <VisaBulletinTimeline
            entries={entries}
            bulletinMonth={dataset.bulletin_month}
            bulletinYear={dataset.bulletin_year}
          />
        </div>

        <VisaBulletinGrid
          entries={entries}
          bulletinMonth={dataset.bulletin_month}
          bulletinYear={dataset.bulletin_year}
        />

        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("disclaimer")}
        </p>
      </PageContainer>
    </main>
  );
}
