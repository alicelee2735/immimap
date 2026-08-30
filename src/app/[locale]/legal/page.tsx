import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

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

const FLAG_ACCENTS = ["border-l-route-blue", "border-l-signal-amber"] as const;

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
  const sections = SECTION_KEYS.map((key, index) => ({
    key,
    number: String(index + 1).padStart(2, "0"),
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
    emphasize: key === "uplWarning",
  }));

  return (
    <main className="flex-1 bg-paper pb-16 pt-12 sm:pt-16">
      <PageContainer>
        <p className="text-sm font-medium uppercase tracking-widest text-route-blue">
          {t("eyebrow")}
        </p>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold tracking-[-0.01em] text-ink-navy sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-charcoal sm:text-lg">
          {t("lead")}
        </p>
        {t("lastUpdated") ? (
          <p className="mt-3 text-sm text-charcoal/70">{t("lastUpdated")}</p>
        ) : null}

        <div className="mt-10 max-w-3xl space-y-5">
          {sections.map((section, index) => {
            const isLast = index === sections.length - 1;
            return (
              <section
                key={section.key}
                className={cn(
                  "border-l-4 bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8",
                  section.emphasize
                    ? "border-l-signal-amber"
                    : FLAG_ACCENTS[index % FLAG_ACCENTS.length],
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border-2 border-signal-amber bg-paper"
                    aria-hidden="true"
                  />
                  <span className="font-serif text-2xl font-semibold tabular-nums tracking-wide text-ink-navy">
                    {section.number}
                  </span>
                  {!isLast ? (
                    <span
                      className="h-px min-w-4 flex-1 bg-signal-amber/60"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <h2 className="font-serif text-xl font-semibold tracking-tight text-ink-navy sm:text-2xl">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-charcoal sm:text-base sm:leading-8">
                  {section.body}
                </p>
              </section>
            );
          })}
        </div>

        <p className="mt-10 max-w-3xl border-t border-ink-navy/10 pt-8 text-sm leading-7 text-charcoal/75">
          {t("contact")}
        </p>
      </PageContainer>
    </main>
  );
}
