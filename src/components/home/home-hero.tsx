"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ServiceCategoryCount } from "@/lib/organizations";

type WayfindingBoardProps = {
  categories: ServiceCategoryCount[];
};

/**
 * Signature hero visual for the ImmiMap identity refresh — a highway/transit
 * "wayfinding board" listing real service categories with live provider
 * counts pulled from the database (see `getServiceCategoryCounts`). Route-line
 * connectors mirror the map's role: helping people find a way to services.
 */
function WayfindingBoard({ categories }: WayfindingBoardProps) {
  const t = useTranslations("Home");
  const board = categories.slice(0, 8);

  return (
    <div className="group relative mx-auto w-full max-w-lg lg:max-w-none">
      <Link
        href="/map"
        className="absolute inset-0 z-30 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-amber focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        aria-label={t("wayfinding.cta")}
      />
      <div
        className="pointer-events-none absolute -inset-3 rounded-xl bg-ink-navy/10 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-lg border-4 border-signal-amber bg-ink-navy shadow-[0_24px_60px_-20px_rgba(27,42,74,0.55)] transition-transform duration-300 group-hover:scale-[1.015]">
        {/* Corner bolts — reads as mounted signage, not a floating card. */}
        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map(
          (position) => (
            <span
              key={position}
              className={`absolute ${position} h-1.5 w-1.5 rounded-full bg-signal-amber/70`}
              aria-hidden="true"
            />
          ),
        )}

        <div className="flex items-center justify-between gap-4 border-b-2 border-signal-amber/30 px-6 py-3.5 sm:px-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-signal-amber">
            {t("wayfinding.eyebrow")}
          </span>
          <span
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal-amber"
            aria-hidden="true"
          />
        </div>

        <ul className="px-6 py-5 sm:px-8">
          {board.map((category, index) => {
            const isLast = index === board.length - 1;
            return (
              <li key={category.name} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-signal-amber bg-ink-navy" />
                  {!isLast && (
                    <span
                      className="w-px flex-1 bg-signal-amber/50"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div
                  className={`flex flex-1 items-baseline justify-between gap-3 ${isLast ? "pb-0" : "pb-6"}`}
                >
                  <span className="truncate font-serif text-base font-semibold uppercase tracking-wide text-paper sm:text-lg">
                    {category.name}
                  </span>
                  <span className="shrink-0 text-right text-xs font-bold tabular-nums text-signal-amber sm:text-sm">
                    {t("wayfinding.count", { count: category.count })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t-2 border-signal-amber/30 px-6 py-3.5 sm:px-8">
          <p className="text-[11px] text-paper/60">{t("wayfinding.footer")}</p>
          <p className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-paper transition-transform group-hover:translate-x-0.5">
            {t("wayfinding.cta")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </p>
        </div>
      </div>
    </div>
  );
}

export function HomeHero({
  categoryCounts,
}: {
  categoryCounts: ServiceCategoryCount[];
}) {
  const t = useTranslations("Home");
  const features = [
    {
      accent: "border-l-route-blue",
      title: t("features.openData.title"),
      description: t("features.openData.description"),
    },
    {
      accent: "border-l-signal-amber",
      title: t("features.socialImpact.title"),
      description: t("features.socialImpact.description"),
    },
  ];
  const steps = [
    {
      number: "01",
      title: t("howItWorks.steps.location.title"),
      description: t("howItWorks.steps.location.description"),
    },
    {
      number: "02",
      title: t("howItWorks.steps.compare.title"),
      description: t("howItWorks.steps.compare.description"),
    },
    {
      number: "03",
      title: t("howItWorks.steps.connect.title"),
      description: t("howItWorks.steps.connect.description"),
    },
  ];

  return (
    <section className="relative overflow-x-clip bg-paper pb-16 pt-12 sm:pt-16">
      {/*
        ImmiMap visual identity — homepage (hero, features, how-it-works)
        plus /about and /know-your-rights. /map and /contact are unchanged.
      */}
      <div className="py-14 sm:py-20">
        <PageContainer>
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-widest text-route-blue">
                {t("heroEyebrow")}
              </p>
              <h1 className="mt-5 font-serif text-4xl font-semibold tracking-[-0.01em] text-ink-navy sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 text-base leading-8 text-charcoal sm:text-lg">
                {t("heroSubtitle")}
              </p>
              <p className="mt-3 text-sm leading-7 text-charcoal/75 sm:text-base">
                {t("heroBody")}
              </p>
              <div className="mt-8">
                <Link
                  href="/map"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "rounded-sm border border-ink-navy bg-signal-amber px-7 text-base font-semibold text-ink-navy hover:bg-signal-amber/90",
                  )}
                >
                  {t("exploreMap")}
                </Link>
              </div>
            </div>

            <WayfindingBoard categories={categoryCounts} />
          </div>
        </PageContainer>
      </div>

      <PageContainer className="relative">
        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={cn(
                "border-l-4 bg-paper p-6 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:p-8",
                feature.accent,
              )}
            >
              <h2 className="font-serif text-lg font-semibold tracking-tight text-ink-navy">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-charcoal">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-16">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-route-blue">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink-navy">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-charcoal">
              {t("howItWorks.description")}
            </p>
          </div>
          {/*
            Route-line numbering — same hollow amber marker + connector as
            the hero wayfinding board, laid out as a 3-stop sequence. Cards
            below keep their existing title/body treatment.
          */}
          <ol className="mt-8 hidden md:grid md:grid-cols-3 md:gap-5">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              return (
                <li key={step.number} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border-2 border-signal-amber bg-paper"
                    aria-hidden="true"
                  />
                  <span className="font-serif text-2xl font-semibold tabular-nums tracking-wide text-ink-navy">
                    {step.number}
                  </span>
                  {!isLast ? (
                    <span
                      className="-mr-5 h-px min-w-4 flex-1 bg-signal-amber/60"
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <div className="mt-8 grid gap-5 md:mt-5 md:grid-cols-3">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              return (
                <article
                  key={step.number}
                  className="rounded-sm border border-ink-navy/15 bg-paper p-6 shadow-sm sm:p-8"
                >
                  <div className="mb-4 flex items-center gap-3 md:hidden">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border-2 border-signal-amber bg-paper"
                      aria-hidden="true"
                    />
                    <span className="font-serif text-2xl font-semibold tabular-nums tracking-wide text-ink-navy">
                      {step.number}
                    </span>
                    {!isLast ? (
                      <span
                        className="h-px min-w-4 flex-1 bg-signal-amber/60"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-ink-navy">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-charcoal">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </PageContainer>
    </section>
  );
}
