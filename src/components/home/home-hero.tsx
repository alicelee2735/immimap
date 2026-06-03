"use client";

import { ChevronDown, Database, Globe2, HeartHandshake, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants, Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useMapFiltersStore } from "@/stores/map-filters";
import type { PricingTier, ServiceCategory, USState } from "@/types/immimap";

const STATES: USState[] = ["CA", "TX", "FL", "NY", "NJ"];
const CATEGORIES: ServiceCategory[] = [
  "asylum",
  "family",
  "daca",
  "employment",
];
const PRICING: PricingTier[] = ["pro_bono", "low_cost", "paid"];

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SearchSegmentProps<T extends string> = {
  title: string;
  value: string;
  options: SegmentOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  isLast?: boolean;
};

function SearchSegment<T extends string>({
  title,
  value,
  options,
  selected,
  onToggle,
  isLast,
}: SearchSegmentProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex min-h-20 flex-1 items-center justify-between gap-4 border-slate-200 bg-transparent px-5 py-3 text-left transition-all duration-200 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !isLast && "border-b md:border-r md:border-b-0",
        )}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </span>
          <span className="mt-1 block text-sm font-semibold text-foreground sm:text-base">
            {value}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-primary transition group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-2xl p-2" align="start">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                "px-3 py-2 text-sm font-medium",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function selectionLabel(
  allLabel: string,
  labels: string[],
  selectedCount: number,
  totalCount: number,
  selectedLabel: string,
) {
  if (selectedCount === totalCount) return allLabel;
  if (selectedCount === 0) return allLabel;
  if (selectedCount === 1) return labels[0];
  return selectedLabel;
}

export function HomeHero() {
  const t = useTranslations("Home");
  const tFilters = useTranslations("Filters");
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const toggleState = useMapFiltersStore((s) => s.toggleState);
  const toggleCategory = useMapFiltersStore((s) => s.toggleCategory);
  const togglePricingTier = useMapFiltersStore((s) => s.togglePricingTier);
  const resetFilters = useMapFiltersStore((s) => s.resetFilters);

  const stateOptions = STATES.map((state) => ({
    value: state,
    label: tFilters(`states.${state}`),
  }));
  const serviceOptions = CATEGORIES.map((category) => ({
    value: category,
    label: tFilters(`services.${category}`),
  }));
  const pricingOptions = PRICING.map((tier) => ({
    value: tier,
    label: tFilters(`pricing.${tier}`),
  }));

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
    <section className="relative overflow-hidden bg-background pb-14 pt-12 sm:pt-16">
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

        <div className="mx-auto mt-10 max-w-5xl rounded-xl border border-slate-200 bg-white p-2">
          <div className="grid overflow-visible rounded-lg bg-white md:grid-cols-[1fr_1fr_1fr_auto]">
            <SearchSegment
              title={tFilters("stateLabel")}
              value={selectionLabel(
                t("search.allStates"),
                stateOptions
                  .filter((option) => states.includes(option.value))
                  .map((option) => option.label),
                states.length,
                stateOptions.length,
                t("search.selectedCount", { count: states.length }),
              )}
              options={stateOptions}
              selected={states}
              onToggle={toggleState}
            />
            <SearchSegment
              title={tFilters("serviceLabel")}
              value={selectionLabel(
                t("search.allServices"),
                serviceOptions
                  .filter((option) => categories.includes(option.value))
                  .map((option) => option.label),
                categories.length,
                serviceOptions.length,
                t("search.selectedCount", { count: categories.length }),
              )}
              options={serviceOptions}
              selected={categories}
              onToggle={toggleCategory}
            />
            <SearchSegment
              title={tFilters("priceLabel")}
              value={selectionLabel(
                t("search.allPrices"),
                pricingOptions
                  .filter((option) => pricingTiers.includes(option.value))
                  .map((option) => option.label),
                pricingTiers.length,
                pricingOptions.length,
                t("search.selectedCount", { count: pricingTiers.length }),
              )}
              options={pricingOptions}
              selected={pricingTiers}
              onToggle={togglePricingTier}
            />
            <div className="flex items-center justify-center px-3 py-3 md:border-l md:border-slate-200">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-slate-500 hover:text-slate-950"
                onClick={() => resetFilters()}
                aria-label={tFilters("reset")}
                title={t("search.clear")}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
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
        </div>

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
