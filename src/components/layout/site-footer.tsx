import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto shrink-0 border-t border-slate-200 bg-white">
      <PageContainer className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-7">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {t("shortDisclaimer")}
        </p>
        <Link
          href="/legal"
          className="shrink-0 text-sm font-medium text-slate-700 underline-offset-4 transition-colors hover:text-[#2563eb] hover:underline"
        >
          {t("legalLink")}
        </Link>
      </PageContainer>
    </footer>
  );
}
