import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DonatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Donate");

  return (
    <main className="flex flex-1 items-start bg-slate-50 py-16">
      <PageContainer>
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            {t("lead")}
          </p>
          <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-foreground">
            {t("proceeds")}
          </p>

          <div className="mt-10 border-t border-gray-200 pt-8">
            <form action="/api/stripe/checkout" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {t("checkout")}
              </button>
            </form>
            <p className="mt-3 text-sm text-muted-foreground">{t("secure")}</p>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
