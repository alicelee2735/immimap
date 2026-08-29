import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

const CRITERIA_KEYS = [
  "nonprofit",
  "activeServices",
  "contactInfo",
  "publicRecord",
  "manualReview",
] as const;

const FLAG_ACCENTS = ["border-l-route-blue", "border-l-signal-amber"] as const;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("verifyTitle"),
    description: t("verifyDescription"),
  };
}

export default async function HowWeVerifyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Verify");
  const criteria = CRITERIA_KEYS.map((key, index) => ({
    key,
    number: String(index + 1).padStart(2, "0"),
    title: t(`criteria.items.${key}.title`),
    description: t(`criteria.items.${key}.description`),
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

        <section className="mt-12">
          <div className="max-w-3xl">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink-navy sm:text-3xl">
              {t("criteria.title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-charcoal">
              {t("criteria.intro")}
            </p>
          </div>
          {/*
            Route-line numbering on each card — same hollow amber marker +
            serif numeral + connector as Know Your Rights (more than three
            items, so the markers live on the cards rather than a 3-stop row).
          */}
          <ol className="mt-8 grid gap-5 sm:grid-cols-2">
            {criteria.map((item, index) => {
              const isLast = index === criteria.length - 1;
              return (
                <li key={item.key}>
                  <article
                    className={cn(
                      "h-full border-l-4 bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8",
                      FLAG_ACCENTS[index % FLAG_ACCENTS.length],
                    )}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border-2 border-signal-amber bg-paper"
                        aria-hidden="true"
                      />
                      <span className="font-serif text-2xl font-semibold tabular-nums tracking-wide text-ink-navy">
                        {item.number}
                      </span>
                      {!isLast ? (
                        <span
                          className="h-px min-w-4 flex-1 bg-signal-amber/60"
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-ink-navy sm:text-xl">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-charcoal">
                      {item.description}
                    </p>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section
            className={cn(
              "border-l-4 bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8",
              FLAG_ACCENTS[0],
            )}
          >
            <h2 className="font-serif text-lg font-semibold tracking-tight text-ink-navy sm:text-xl">
              {t("process.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              {t("process.description")}
            </p>
          </section>
          <section
            className={cn(
              "border-l-4 bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8",
              FLAG_ACCENTS[1],
            )}
          >
            <h2 className="font-serif text-lg font-semibold tracking-tight text-ink-navy sm:text-xl">
              {t("limitations.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-charcoal">
              {t("limitations.description")}
            </p>
          </section>
        </div>

        <section className="mt-10 border-l-4 border-l-signal-amber bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-ink-navy sm:text-2xl">
            {t("questions.title")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-charcoal sm:text-base sm:leading-8">
            {t("questions.description")}
          </p>
        </section>
      </PageContainer>
    </main>
  );
}
