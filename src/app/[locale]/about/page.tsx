import { ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

type Props = {
  params: Promise<{ locale: string }>;
};

const DATA_CORRECTION_FORM_URL = "https://forms.gle/SZryGqpSC6N3RV6F6";

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("About");
  const sections = [
    {
      title: t("mission.title"),
      description: t("mission.description"),
    },
    {
      title: t("story.title"),
      description: t("story.description"),
    },
    {
      title: t("transparency.title"),
      description: t("transparency.description"),
    },
  ];

  return (
    <main className="flex-1 bg-slate-50 py-12">
      <PageContainer>
        <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
          {t("lead")}
        </p>

        <div className="mt-10 grid gap-x-10 gap-y-0 border-t border-gray-200 md:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="border-b border-gray-200 py-8 md:border-b-0 md:py-10"
            >
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {section.description}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {t("dataCorrection.title")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            {t("dataCorrection.description")}
          </p>
          <a
            href={DATA_CORRECTION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("dataCorrection.openForm")}
          </a>
        </section>
      </PageContainer>
    </main>
  );
}
