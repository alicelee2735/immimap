import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

type Props = {
  params: Promise<{ locale: string }>;
};

const SECTION_KEYS = [
  "informational",
  "noRelationship",
  "verifyCredentials",
  "uplWarning",
  "liability",
] as const;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("legalTitle"),
    description: t("legalDescription"),
  };
}

export default async function LegalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Legal");
  const sections = SECTION_KEYS.map((key) => ({
    key,
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
    emphasize: key === "uplWarning",
  }));

  return (
    <main className="flex-1 bg-slate-50 py-12 sm:py-16">
      <PageContainer>
        <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
          {t("lead")}
        </p>
        {t("lastUpdated") ? (
          <p className="mt-3 text-sm text-slate-500">{t("lastUpdated")}</p>
        ) : null}

        <div className="mt-10 max-w-3xl space-y-6">
          {sections.map((section) => (
            <section
              key={section.key}
              className={
                section.emphasize
                  ? "rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
                  : "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
              }
            >
              <h2
                className={
                  section.emphasize
                    ? "text-xl font-semibold tracking-tight text-amber-950"
                    : "text-xl font-semibold tracking-tight text-slate-900"
                }
              >
                {section.title}
              </h2>
              <p
                className={
                  section.emphasize
                    ? "mt-3 text-sm leading-7 text-amber-950/90 sm:text-base sm:leading-8"
                    : "mt-3 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8"
                }
              >
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 max-w-3xl border-t border-slate-200 pt-8 text-sm leading-7 text-slate-500">
          {t("contact")}
        </p>
      </PageContainer>
    </main>
  );
}
