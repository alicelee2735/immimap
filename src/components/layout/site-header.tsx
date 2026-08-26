"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { TrackedNavLink } from "@/components/analytics/tracked-nav-link";
import { PageContainer } from "@/components/layout/page-container";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { isNavItemActive } from "@/lib/nav-pathname";
import { cn } from "@/lib/utils";

type Props = {
  pathname: string;
};

export function SiteHeader({ pathname: serverPathname }: Props) {
  const t = useTranslations("Nav");
  const clientPathname = usePathname();
  const pathname = clientPathname ?? serverPathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { href: "/", label: t("home") },
    { href: "/map", label: t("map") },
    { href: "/know-your-rights", label: t("knowYourRights") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <header className="z-40 shrink-0 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <PageContainer className="grid h-20 grid-cols-[auto_1fr_auto] items-center gap-x-8">
        <Link
          href="/"
          suppressHydrationWarning
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
          {navItems.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <TrackedNavLink
                key={item.href}
                href={item.href}
                navLabel={item.label}
                navSurface="desktop"
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sm font-medium leading-none tracking-[-0.01em] text-slate-500 transition-colors duration-150 hover:text-slate-950",
                  active && "text-[#2563eb]",
                )}
              >
                {item.label}
              </TrackedNavLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end">
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
            {navItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <TrackedNavLink
                  key={item.href}
                  href={item.href}
                  navLabel={item.label}
                  navSurface="mobile"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-lg font-medium tracking-[-0.01em] text-slate-500 transition-colors duration-150 hover:text-slate-950",
                    active && "text-[#2563eb]",
                  )}
                >
                  {item.label}
                </TrackedNavLink>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
