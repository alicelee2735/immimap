"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/page-container";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { href: "/", label: t("home") },
    { href: "/map", label: t("map") },
    { href: "/processing", label: t("processing") },
    { href: "/visa-bulletin", label: t("visaBulletin") },
    { href: "/about", label: t("about") },
    { href: "/join", label: t("join") },
  ];
  const donateActive = pathname === "/donate";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <PageContainer className="grid h-20 grid-cols-[auto_1fr_auto] items-center gap-x-8">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-3 text-left"
        >
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#2563eb]">
            IM
          </span>
          <span className="hidden text-base font-semibold tracking-[-0.01em] text-slate-950 lg:inline">
            {t("brand")}
          </span>
        </Link>

        <nav
          className="hidden items-baseline justify-start gap-x-8 md:flex"
          aria-label={t("mainNav")}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium leading-none tracking-[-0.01em] text-slate-500 transition-colors duration-150 hover:text-slate-950",
                pathname === item.href && "text-[#2563eb]",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/donate"
            className={cn(
              "text-sm font-medium leading-none tracking-[-0.01em] text-slate-500 transition-colors duration-150 hover:text-slate-950",
              donateActive && "text-[#2563eb]",
            )}
          >
            {t("donate")}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-x-8">
          <div
            className="hidden items-center gap-x-2 lg:flex"
            role="group"
            aria-label={t("language")}
          >
            {routing.locales.map((loc, index) => (
              <span key={loc} className="flex items-center gap-x-2">
                {index > 0 ? (
                  <span className="text-slate-300" aria-hidden>
                    |
                  </span>
                ) : null}
                <Link
                  href={pathname}
                  locale={loc}
                  className={cn(
                    "text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-slate-950",
                    loc === locale && "pointer-events-none text-[#2563eb]",
                  )}
                  aria-current={loc === locale ? "page" : undefined}
                >
                  {loc === "zh" ? "中文" : "EN"}
                </Link>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-slate-950 transition-colors duration-150 hover:text-[#2563eb] md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </PageContainer>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-sm gap-0 bg-[#FAFAFA] px-8 py-10 sm:max-w-sm"
        >
          <div className="mb-10 flex items-baseline gap-3">
            <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#2563eb]">
              IM
            </span>
            <span className="font-semibold tracking-[-0.01em] text-slate-950">
              {t("brand")}
            </span>
          </div>

          <nav className="flex flex-col items-start gap-5" aria-label={t("mainNav")}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-lg font-medium tracking-[-0.01em] text-slate-500 transition-colors duration-150 hover:text-slate-950",
                  pathname === item.href && "text-[#2563eb]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 flex flex-col items-start gap-5 pt-6">
            <Link
              href="/donate"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "text-base font-medium text-slate-500 transition-colors duration-150 hover:text-slate-950",
                donateActive && "text-[#2563eb]",
              )}
            >
              {t("donate")}
            </Link>
            <div
              className="flex items-center gap-4"
              role="group"
              aria-label={t("language")}
            >
              {routing.locales.map((loc, index) => (
                <span key={loc} className="flex items-center gap-4">
                  {index > 0 ? (
                    <span className="text-slate-300" aria-hidden>
                      |
                    </span>
                  ) : null}
                  <Link
                    href={pathname}
                    locale={loc}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-slate-950",
                      loc === locale && "pointer-events-none text-[#2563eb]",
                    )}
                    aria-current={loc === locale ? "page" : undefined}
                  >
                    {loc === "zh" ? "中文" : "EN"}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
