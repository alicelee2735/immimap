import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

const RIGHTS_RESOURCES = [
  {
    key: "aclu" as const,
    href: "https://www.aclu.org/know-your-rights/immigrants-rights",
  },
  {
    key: "nilc" as const,
    href: "https://www.nilc.org/resources/everyone-has-certain-basic-rights/",
  },
  {
    key: "ilrc" as const,
    href: "https://www.ilrc.org/know-your-rights",
  },
  {
    key: "uscis" as const,
    href: "https://www.uscis.gov/avoid-scams/find-legal-services",
  },
  {
    key: "eoir" as const,
    href: "https://www.justice.gov/eoir/list-pro-bono-legal-service-providers",
  },
  {
    key: "immigrationAdvocates" as const,
    href: "https://www.immigrationadvocates.org/legaldirectory/",
  },
];

const FLAG_ACCENTS = ["border-l-route-blue", "border-l-signal-amber"] as const;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("knowYourRightsTitle"),
    description: t("knowYourRightsDescription"),
  };
}

export default async function KnowYourRightsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("KnowYourRights");
  const sections = [
    {
      title: t("sections.remainSilent.title"),
      description: t("sections.remainSilent.description"),
    },
    {
      title: t("sections.documents.title"),
      description: t("sections.documents.description"),
    },
    {
      title: t("sections.homeEntry.title"),
      description: t("sections.homeEntry.description"),
    },
    {
      title: t("sections.attorney.title"),
      description: t("sections.attorney.description"),
    },
  ];

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
        <p className="mt-4 max-w-3xl border-l-4 border-l-signal-amber bg-paper px-4 py-3 text-sm leading-6 text-charcoal shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)]">
          {t("disclaimer")}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {sections.map((section, index) => {
            const isLast = index === sections.length - 1;
            return (
              <article
                key={section.title}
                className={cn(
                  "border-l-4 bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8",
                  FLAG_ACCENTS[index % FLAG_ACCENTS.length],
                )}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border-2 border-signal-amber bg-paper"
                    aria-hidden="true"
                  />
                  <span className="font-serif text-2xl font-semibold tabular-nums tracking-wide text-ink-navy">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {!isLast ? (
                    <span
                      className="h-px min-w-4 flex-1 bg-signal-amber/60"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-ink-navy sm:text-xl">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-charcoal">
                  {section.description}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink-navy sm:text-3xl">
            {t("resourcesTitle")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-charcoal sm:text-base">
            {t("resourcesLead")}
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {RIGHTS_RESOURCES.map((resource, index) => (
              <li key={resource.key}>
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex h-full flex-col border-l-4 bg-paper p-5 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] transition-colors sm:p-6",
                    FLAG_ACCENTS[index % FLAG_ACCENTS.length],
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-serif text-base font-semibold tracking-tight text-ink-navy group-hover:text-route-blue">
                      {t(`resources.${resource.key}.title`)}
                    </span>
                    <ExternalLink
                      className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/40 transition-colors group-hover:text-route-blue"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-2 text-sm leading-6 text-charcoal">
                    {t(`resources.${resource.key}.description`)}
                  </span>
                  <span className="sr-only">{t("resourceExternal")}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 bg-ink-navy px-6 py-8 text-paper sm:px-10 sm:py-10">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-paper/70 sm:text-base">
            {t("ctaDescription")}
          </p>
          <Link
            href="/map"
            className="mt-6 inline-flex h-9 items-center justify-center rounded-sm border border-ink-navy bg-signal-amber px-7 text-base font-semibold text-ink-navy hover:bg-signal-amber/90"
          >
            {t("ctaButton")}
          </Link>
        </section>
      </PageContainer>
    </main>
  );
}
