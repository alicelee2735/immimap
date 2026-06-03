import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

type Props = {
  params: Promise<{ locale: string }>;
};

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
      </PageContainer>
    </main>
  );
}
