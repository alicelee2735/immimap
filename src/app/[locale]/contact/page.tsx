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

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {t("emailCta")}
        </a>

        <p className="mt-8 max-w-3xl text-sm leading-7 text-slate-500">
          {t("listingCorrection.prompt")}{" "}
          <Link
            href="/about"
            className="font-medium text-slate-700 underline-offset-4 transition-colors hover:text-[#2563eb] hover:underline"
          >
            {t("listingCorrection.link")}
          </Link>
        </p>
      </PageContainer>
    </main>
  );
}
