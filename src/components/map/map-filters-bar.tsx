"use client";

import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ALL_STATES, useMapFiltersStore } from "@/stores/map-filters";
import type { PricingTier } from "@/types/immimap";
const PRICING: PricingTier[] = ["pro_bono", "low_cost", "paid"];

type FilterSegmentProps<T extends string> = {
  title: string;
  value: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  allOptionLabel?: string;
  onSelectAll?: () => void;
  isLast?: boolean;
};

function FilterSegment<T extends string>({
  title,
  value,
  options,
  selected,
  onToggle,
  allOptionLabel,
  onSelectAll,
  isLast,
}: FilterSegmentProps<T>) {
  const allSelected =
    options.length > 0 &&
    selected.length === options.length &&
    options.every((option) => selected.includes(option.value));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex min-h-16 flex-1 items-center justify-between gap-4 border-slate-200 bg-transparent px-4 py-3 text-left transition-all duration-200 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !isLast && "border-b md:border-r md:border-b-0",
        )}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </span>
          <span className="mt-1 block text-sm font-semibold text-foreground">
            {value}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-primary transition group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="z-[9999] w-64 rounded-2xl bg-white p-2"
        positionerClassName="z-[9999]"
        align="start"
      >
        {allOptionLabel && onSelectAll ? (
          <DropdownMenuCheckboxItem
            checked={allSelected}
            onClick={onSelectAll}
            className={cn(
              "px-3 py-2 text-sm font-medium",
              allSelected
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {allOptionLabel}
          </DropdownMenuCheckboxItem>
        ) : null}
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

function selectionLabel({
  allLabel,
  labels,
  selectedCount,
  totalCount,
  selectedLabel,
}: {
  allLabel: string;
  labels: string[];
  selectedCount: number;
  totalCount: number;
  selectedLabel: string;
}) {
  if (selectedCount === totalCount) return allLabel;
  if (selectedCount === 0) return allLabel;
  if (selectedCount === 1) return labels[0];
  return selectedLabel;
}

type MapFiltersBarProps = {
  pricingOnly?: boolean;
};

export function MapFiltersBar({ pricingOnly = false }: MapFiltersBarProps) {
  const t = useTranslations("Filters");
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const availableServiceTypes = useMapFiltersStore((s) => s.availableServiceTypes);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const toggleState = useMapFiltersStore((s) => s.toggleState);
  const toggleCategory = useMapFiltersStore((s) => s.toggleCategory);
  const togglePricingTier = useMapFiltersStore((s) => s.togglePricingTier);
  const setCategories = useMapFiltersStore((s) => s.setCategories);
  const setPricingTiers = useMapFiltersStore((s) => s.setPricingTiers);
  const resetFilters = useMapFiltersStore((s) => s.resetFilters);

  const stateOptions = ALL_STATES.map((state) => ({
    value: state,
    label: t.has(`states.${state}`) ? t(`states.${state}`) : state,
  }));
  const serviceOptions = availableServiceTypes.map((category) => ({
    value: category,
    label: category,
  }));
  const pricingOptions = PRICING.map((tier) => ({
    value: tier,
    label: t(`pricing.${tier}`),
  }));

  if (pricingOnly) {
    return (
      <div className="relative z-[100] border-b bg-white/80 py-2">
        <PageContainer>
          <div className="relative z-[100] flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("priceLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {pricingOptions.map((option) => {
                const active = pricingTiers.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => togglePricingTier(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="relative z-50 border-b bg-white/90 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <PageContainer>
        <p className="mb-2 text-sm font-semibold text-foreground">{t("title")}</p>
        <div className="relative z-50 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm md:flex">
          <FilterSegment
            title={t("stateLabel")}
            value={selectionLabel({
              allLabel: t("allStates"),
              labels: stateOptions
                .filter((option) => states.includes(option.value))
                .map((option) => option.label),
              selectedCount: states.length,
              totalCount: stateOptions.length,
              selectedLabel: t("selectedCount", { count: states.length }),
            })}
            options={stateOptions}
            selected={states}
            onToggle={toggleState}
          />
          <FilterSegment
            title={t("serviceLabel")}
            value={selectionLabel({
              allLabel: t("allServices"),
              labels: serviceOptions
                .filter((option) => categories.includes(option.value))
                .map((option) => option.label),
              selectedCount: categories.length,
              totalCount: serviceOptions.length,
              selectedLabel: t("selectedCount", { count: categories.length }),
            })}
            options={serviceOptions}
            selected={categories}
            onToggle={toggleCategory}
            allOptionLabel={t("allServices")}
            onSelectAll={() => setCategories([...availableServiceTypes])}
          />
          <FilterSegment
            title={t("priceLabel")}
            value={selectionLabel({
              allLabel: t("allPrices"),
              labels: pricingOptions
                .filter((option) => pricingTiers.includes(option.value))
                .map((option) => option.label),
              selectedCount: pricingTiers.length,
              totalCount: pricingOptions.length,
              selectedLabel: t("selectedCount", { count: pricingTiers.length }),
            })}
            options={pricingOptions}
            selected={pricingTiers}
            onToggle={togglePricingTier}
            allOptionLabel={t("allPrices")}
            onSelectAll={() => setPricingTiers([...PRICING])}
          />
          <div className="flex items-center justify-center px-3 py-3 md:border-l md:border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => resetFilters()}
              aria-label={t("reset")}
              title={t("reset")}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
