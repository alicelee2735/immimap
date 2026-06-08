"use client";

import { Database, Globe2, HeartHandshake } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProviderSearchCard } from "@/components/filters/provider-search-card";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";

export function HomeHero() {
  const t = useTranslations("Home");
  const features = [
    {
      icon: Database,
      title: t("features.openData.title"),
      description: t("features.openData.description"),
    },
    {
      icon: Globe2,
      title: t("features.multilingual.title"),
      description: t("features.multilingual.description"),
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
    <section className="relative overflow-visible bg-background pb-14 pt-12 sm:pt-16">
      <PageContainer className="relative">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(320px,0.42fr)] lg:items-end">
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-5 text-5xl font-bold tracking-[-0.025em] text-slate-950 sm:text-6xl lg:text-7xl">
              {t("heroTitle")}
            </h1>
          </div>
          <div className="max-w-xl lg:pb-2">
            <p className="text-base leading-8 text-slate-600 sm:text-lg">
              {t("heroSubtitle")}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              {t("heroBody")}
            </p>
          </div>
        </div>

        <ProviderSearchCard
          className="mt-10"
          labelNamespace="home"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <p className="text-sm text-slate-500">{t("search.helper")}</p>
              <Link
                href="/map"
                className={buttonVariants({
                  size: "lg",
                  className: "rounded-md bg-slate-950 px-6 hover:bg-slate-800",
                })}
              >
                {t("getStarted")}
              </Link>
            </div>
          }
        />

        <div className="mt-8 grid gap-0 border-t border-gray-200 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="border-b border-gray-200 py-8 md:border-b-0 md:border-r md:px-8 md:py-10 last:md:border-r-0 first:md:pl-0"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" aria-hidden />
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

        <section className="mt-10 border-t border-gray-200 pt-10">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {t("howItWorks.title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-500">
              {t("howItWorks.description")}
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="border-t border-gray-200 pt-6"
              >
                <span className="text-sm font-semibold text-[#2563eb]">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
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
