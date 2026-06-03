import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";

type Props = {
  params: Promise<{ locale: string }>;
};

const ROLE_KEYS = ["webDevelopment", "socialMedia"] as const;

const DISCORD_HANDLE = "@alicelee2735";
const CONTACT_EMAIL = "lichoiyin@gmail.com";
const GOOGLE_FORM_URL = "https://forms.gle/owynFiTBbNYraGHL8";

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("joinTitle"),
    description: t("joinDescription"),
  };
}

export default async function JoinPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Join");

  return (
    <main className="flex flex-1 items-start bg-slate-50 py-16">
      <PageContainer>
        <div className="mx-auto max-w-2xl space-y-10 p-8">
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              {t("openPositionsEyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
              {t("pageTitle")}
            </h1>
            <p className="text-base leading-7 text-slate-600">{t("pageLead")}</p>
          </div>

          {/* ── Roles ────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {ROLE_KEYS.map((roleKey) => (
              <div
                key={roleKey}
                className="border-l-2 border-blue-500 pl-5"
              >
                <h2 className="text-base font-semibold text-gray-900">
                  {t(`roles.${roleKey}.title`)}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {t(`roles.${roleKey}.description`)}
                </p>
              </div>
            ))}
          </div>

          {/* ── Application funnel ───────────────────────────────────── */}
          <div className="space-y-4 border-t border-slate-200 pt-8">
            <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400">
              {t("applicationProcess")}
            </h3>

            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {t("applyCta")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>

            <p className="text-sm leading-6 text-slate-600">
              {t.rich("contactAfterSubmit", {
                discord: () => (
                  <span className="font-semibold text-slate-900">
                    {DISCORD_HANDLE}
                  </span>
                ),
                email: () => (
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-semibold text-slate-900 underline-offset-2 hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                ),
              })}
            </p>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
