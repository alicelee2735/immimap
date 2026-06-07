import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";

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
  const criteria = CRITERIA_KEYS.map((key) => ({
    key,
    title: t(`criteria.items.${key}.title`),
    description: t(`criteria.items.${key}.description`),
  }));

  return (
    <main className="flex-1 bg-slate-50 py-12">
      <PageContainer>
        <div className="flex items-center gap-2 text-blue-600">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
            {t("eyebrow")}
          </p>
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
          {t("lead")}
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            {t("criteria.title")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {t("criteria.intro")}
          </p>
          <ol className="mt-8 space-y-6">
            {criteria.map((item, index) => (
              <li key={item.key} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">
              {t("process.title")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("process.description")}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">
              {t("limitations.title")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("limitations.description")}
            </p>
          </section>
        </div>

        <section className="mt-10 border-t border-gray-200 pt-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            {t("questions.title")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {t("questions.description")}
          </p>
        </section>
      </PageContainer>
    </main>
  );
}
