"use client";

import { Database, HeartHandshake, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";

function HeroMapPreview() {
  const t = useTranslations("Home");

  return (
    <div className="group relative mx-auto w-full max-w-lg cursor-pointer lg:max-w-none">
      <Link
        href="/map"
        className="absolute inset-0 z-30 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
        aria-label={t("preview.cta")}
      />
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-sky-100/80 via-slate-100/40 to-emerald-50/60 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative rotate-[2.5deg] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] transition-all duration-300 group-hover:scale-[1.02] group-hover:border-slate-300 group-hover:shadow-lg group-hover:rotate-[1deg]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(145deg,#e8eef5_0%,#dbe7f2_40%,#c8d9ea_100%)]">
          <svg
            className="absolute inset-0 h-full w-full opacity-40"
            viewBox="0 0 400 300"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M20 80 C80 40, 140 100, 200 70 S 320 30, 380 90"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <path
              d="M10 160 C90 130, 150 200, 230 150 S 330 120, 390 180"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <path
              d="M40 240 C110 200, 180 260, 260 220 S 340 200, 380 250"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            <circle cx="120" cy="110" r="28" fill="#cbd5e1" opacity="0.5" />
            <circle cx="280" cy="160" r="40" fill="#cbd5e1" opacity="0.35" />
          </svg>

          <span
            className="absolute left-[22%] top-[28%] flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center text-[#2563eb] drop-shadow-[0_6px_12px_rgba(37,99,235,0.45)]"
            aria-hidden="true"
          >
            <MapPin className="h-9 w-9 fill-current" strokeWidth={1.5} />
          </span>
          <span
            className="absolute left-[58%] top-[48%] flex h-7 w-7 -translate-x-1/2 -translate-y-full items-center justify-center text-slate-500 drop-shadow-md"
            aria-hidden="true"
          >
            <MapPin className="h-7 w-7 fill-current" strokeWidth={1.5} />
          </span>
          <span
            className="absolute left-[72%] top-[32%] flex h-7 w-7 -translate-x-1/2 -translate-y-full items-center justify-center text-slate-500 drop-shadow-md"
            aria-hidden="true"
          >
            <MapPin className="h-7 w-7 fill-current" strokeWidth={1.5} />
          </span>

          <div className="absolute bottom-4 left-4 right-4 -rotate-[1.5deg] rounded-xl border border-white/80 bg-white/95 p-4 shadow-lg backdrop-blur-sm sm:left-6 sm:right-auto sm:w-[260px]">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                {t("preview.pricing")}
              </span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                {t("preview.service")}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold tracking-tight text-slate-950">
              {t("preview.providerName")}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t("preview.location")}</p>
            <p className="mt-3 inline-flex items-center text-xs font-semibold text-[#2563eb] transition-transform group-hover:translate-x-0.5 group-hover:underline">
              {t("preview.cta")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeHero() {
  const t = useTranslations("Home");
  const features = [
    {
      icon: Database,
      title: t("features.openData.title"),
      description: t("features.openData.description"),
    },
    {
      icon: HeartHandshake,
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
    <section className="relative overflow-x-clip bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#f1f5f9_100%)] pb-16 pt-12 sm:pt-16">
      <PageContainer className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              {t("heroTitle")}
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              {t("heroSubtitle")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
              {t("heroBody")}
            </p>
            <div className="mt-8">
              <Link
                href="/map"
                className={buttonVariants({
                  size: "lg",
                  className:
                    "rounded-lg bg-slate-950 px-7 text-base hover:bg-slate-800",
                })}
              >
                {t("exploreMap")}
              </Link>
            </div>
          </div>

          <HeroMapPreview />
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-slate-50/90 p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] sm:p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#2563eb]">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-16">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-500">
              {t("howItWorks.description")}
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-sm sm:p-8"
              >
                <span className="text-2xl font-bold tabular-nums tracking-tight text-[#2563eb]">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </PageContainer>
    </section>
  );
}
