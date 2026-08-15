import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";

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
    <main className="flex-1 bg-slate-50 py-12">
      <PageContainer>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
          {t("lead")}
        </p>
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-900">
          {t("disclaimer")}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/80 p-6 shadow-sm sm:p-8"
            >
              <span className="text-sm font-semibold tabular-nums text-[#2563eb]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {section.description}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {t("resourcesTitle")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            {t("resourcesLead")}
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {RIGHTS_RESOURCES.map((resource) => (
              <li key={resource.key}>
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-5 transition-colors hover:border-[#2563eb]/40 hover:bg-sky-50/40 sm:p-6"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-semibold tracking-tight text-slate-950 group-hover:text-[#2563eb]">
                      {t(`resources.${resource.key}.title`)}
                    </span>
                    <ExternalLink
                      className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-[#2563eb]"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-2 text-sm leading-6 text-slate-600">
                    {t(`resources.${resource.key}.description`)}
                  </span>
                  <span className="sr-only">{t("resourceExternal")}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {t("ctaDescription")}
          </p>
          <Link
            href="/map"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-white px-6 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-100"
          >
            {t("ctaButton")}
          </Link>
        </section>
      </PageContainer>
    </main>
  );
}
