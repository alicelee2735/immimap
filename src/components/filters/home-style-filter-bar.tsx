"use client";

import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      <DropdownMenuContent
        className="absolute z-[200] w-64 rounded-2xl p-2"
        align="start"
      >
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

type HomeStyleFilterBarProps = {
  /** Use Home.* search labels (landing page). Map page passes map-specific labels. */
  labelNamespace?: "home" | "filters";
};

export function HomeStyleFilterBar({
  labelNamespace = "home",
}: HomeStyleFilterBarProps) {
  const tHome = useTranslations("Home");
  const tFilters = useTranslations("Filters");
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const toggleState = useMapFiltersStore((s) => s.toggleState);
  const toggleCategory = useMapFiltersStore((s) => s.toggleCategory);
  const togglePricingTier = useMapFiltersStore((s) => s.togglePricingTier);
  const resetFilters = useMapFiltersStore((s) => s.resetFilters);

  const allStatesLabel =
    labelNamespace === "home"
      ? tHome("search.allStates")
      : tFilters("allStates");
  const allServicesLabel =
    labelNamespace === "home"
      ? tHome("search.allServices")
      : tFilters("allServices");
  const allPricesLabel =
    labelNamespace === "home"
      ? tHome("search.allPrices")
      : tFilters("allPrices");
  const selectedCountLabel = (count: number) =>
    labelNamespace === "home"
      ? tHome("search.selectedCount", { count })
      : tFilters("selectedCount", { count });
  const resetTitle =
    labelNamespace === "home" ? tHome("search.clear") : tFilters("reset");

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

  return (
    <div className="relative overflow-visible">
      <div className="relative z-[100] grid overflow-visible rounded-lg bg-white md:grid-cols-[1fr_1fr_1fr_auto]">
      <SearchSegment
        title={tFilters("stateLabel")}
        value={selectionLabel(
          allStatesLabel,
          stateOptions
            .filter((option) => states.includes(option.value))
            .map((option) => option.label),
          states.length,
          stateOptions.length,
          selectedCountLabel(states.length),
        )}
        options={stateOptions}
        selected={states}
        onToggle={toggleState}
      />
      <SearchSegment
        title={tFilters("serviceLabel")}
        value={selectionLabel(
          allServicesLabel,
          serviceOptions
            .filter((option) => categories.includes(option.value))
            .map((option) => option.label),
          categories.length,
          serviceOptions.length,
          selectedCountLabel(categories.length),
        )}
        options={serviceOptions}
        selected={categories}
        onToggle={toggleCategory}
      />
      <SearchSegment
        title={tFilters("priceLabel")}
        value={selectionLabel(
          allPricesLabel,
          pricingOptions
            .filter((option) => pricingTiers.includes(option.value))
            .map((option) => option.label),
          pricingTiers.length,
          pricingOptions.length,
          selectedCountLabel(pricingTiers.length),
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
          title={resetTitle}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      </div>
    </div>
  );
}
