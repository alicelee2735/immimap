import { Mail } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

const SUPPORT_EMAIL = "support@immimap.org";

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("contactTitle"),
    description: t("contactDescription"),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Contact");

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

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-5 inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-ink-navy bg-signal-amber px-7 text-base font-semibold text-ink-navy hover:bg-signal-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-amber focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {t("emailCta")}
        </a>

        <p className="mt-8 max-w-3xl text-sm leading-7 text-charcoal/75">
          {t("listingCorrection.prompt")}{" "}
          <Link
            href="/about"
            className="font-medium text-ink-navy underline-offset-4 transition-colors hover:text-route-blue hover:underline"
          >
            {t("listingCorrection.link")}
          </Link>
        </p>
      </PageContainer>
    </main>
  );
}
