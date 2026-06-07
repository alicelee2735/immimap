import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Noto_Sans_SC } from "next/font/google";
import { clsx } from "clsx";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const notoSansSC = Noto_Sans_SC({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sc",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "LocaleLayout",
  });

  return {
    title: t("title"),
    description:
      locale === "zh"
        ? "在全美查找移民法律与社会服务机构。"
        : "Find immigration legal and social services across the United States.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      className={clsx("h-full", inter.variable, notoSansSC.variable)}
      lang={locale}
      suppressHydrationWarning
    >
      <body
        className={clsx(
          "flex min-h-full flex-col bg-background text-foreground antialiased",
          locale === "zh" ? notoSansSC.className : inter.className,
        )}
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <GoogleAnalytics />
          <SiteHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
