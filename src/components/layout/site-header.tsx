"use client";

import { Map, Table2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            IM
          </span>
          <span className="hidden sm:inline">{t("brand")}</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label={t("mainNav")}>
          <Link
            href="/"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: cn(
                "gap-1.5",
                pathname === "/" && "bg-muted text-foreground",
              ),
            })}
          >
            <Map className="h-4 w-4" aria-hidden />
            {t("map")}
          </Link>
          <Link
            href="/processing-times"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: cn(
                "gap-1.5",
                pathname === "/processing-times" && "bg-muted text-foreground",
              ),
            })}
          >
            <Table2 className="h-4 w-4" aria-hidden />
            {t("processing")}
          </Link>
        </nav>

        <div
          className="flex items-center rounded-lg border border-primary/25 bg-card p-0.5 shadow-sm"
          role="group"
          aria-label={t("language")}
        >
          {routing.locales.map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={buttonVariants({
                variant: loc === locale ? "default" : "ghost",
                size: "sm",
                className: cn(
                  "min-w-[2.75rem] justify-center px-2 text-xs sm:text-sm",
                  loc === locale && "pointer-events-none",
                ),
              })}
              aria-current={loc === locale ? "page" : undefined}
            >
              {loc === "zh" ? "中文" : "EN"}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
