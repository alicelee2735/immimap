import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";
import { clsx } from "clsx";
import { Analytics } from "@vercel/analytics/next";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
      "Find immigration legal and social services across the United States.",
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

  // Path for SSR nav active state and map-only chrome decisions.
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "/";
  const isMapRoute =
    pathname === "/map" ||
    pathname.startsWith("/map/") ||
    pathname.endsWith("/map");

  return (
    <html
      className={clsx("min-h-full", inter.variable)}
      lang={locale}
      suppressHydrationWarning
    >
      <body
        className={clsx(
          "flex min-h-dvh flex-col bg-background text-foreground antialiased",
          inter.className,
        )}
        suppressHydrationWarning
      >
        <NextIntlClientProvider>
          <GoogleAnalytics />
          <SiteHeader pathname={pathname} />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          {isMapRoute ? null : <SiteFooter />}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
