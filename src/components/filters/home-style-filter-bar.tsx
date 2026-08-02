"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ALL_STATES,
  areFiltersAtDefaults,
  useMapFiltersStore,
} from "@/stores/map-filters";
import type { PricingTier, ServiceCategory } from "@/types/immimap";

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
  /** Label for the top “All” option that clears this dropdown’s filter only. */
  allOptionLabel?: string;
  onSelectAll?: () => void;
  isLast?: boolean;
  compact?: boolean;
};

function SearchSegment<T extends string>({
  title,
  value,
  options,
  selected,
  onToggle,
  allOptionLabel,
  onSelectAll,
  isLast,
  compact = false,
}: SearchSegmentProps<T>) {
  const allSelected =
    options.length > 0 &&
    selected.length === options.length &&
    options.every((option) => selected.includes(option.value));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex items-center justify-between gap-2 bg-transparent text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact
            ? "h-9 min-w-0 shrink-0 rounded-lg px-2.5 py-1.5 pr-3.5 hover:bg-slate-100/80"
            : "min-h-16 flex-1 gap-4 px-5 py-2.5 hover:bg-primary/5",
          !compact && !isLast && "border-b border-slate-200 md:border-r md:border-b-0",
        )}
      >
        <span className="min-w-0">
          <span
            className={cn(
              "block font-semibold uppercase tracking-[0.18em] text-muted-foreground",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "mt-0.5 block truncate font-semibold text-foreground",
              compact ? "max-w-[6rem] text-sm sm:max-w-[7rem]" : "text-sm sm:text-base",
            )}
          >
            {value}
          </span>
        </span>
        <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-primary transition group-data-[popup-open]:rotate-180" />
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
  /** True when the search query / city filter is active. */
  searchActive?: boolean;
  onResetSearch?: () => void;
  /** Hide the State dropdown — states are chosen via search autocomplete. */
  hideStateFilter?: boolean;
  /** Tighter row height for the floating map toolbar. */
  compact?: boolean;
};

export function HomeStyleFilterBar({
  labelNamespace = "home",
  searchActive = false,
  onResetSearch,
  hideStateFilter = false,
  compact = false,
}: HomeStyleFilterBarProps) {
  const tHome = useTranslations("Home");
  const tFilters = useTranslations("Filters");
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const toggleState = useMapFiltersStore((s) => s.toggleState);
  const toggleCategory = useMapFiltersStore((s) => s.toggleCategory);
  const togglePricingTier = useMapFiltersStore((s) => s.togglePricingTier);
  const setCategories = useMapFiltersStore((s) => s.setCategories);
  const setPricingTiers = useMapFiltersStore((s) => s.setPricingTiers);
  const resetAll = useMapFiltersStore((s) => s.resetAll);

  const filtersDefault = areFiltersAtDefaults({
    states,
    categories,
    pricingTiers,
  });
  const showResetAll =
    searchActive || !filtersDefault || selectedServiceId !== null;

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

  const stateOptions = ALL_STATES.map((state) => ({
    value: state,
    label: tFilters.has(`states.${state}`)
      ? tFilters(`states.${state}`)
      : state,
  }));
  const serviceOptions = CATEGORIES.map((category) => ({
    value: category,
    label: tFilters(`services.${category}`),
  }));
  const pricingOptions = PRICING.map((tier) => ({
    value: tier,
    label: tFilters(`pricing.${tier}`),
  }));

  const handleResetAll = () => {
    onResetSearch?.();
    resetAll();
  };

  const gridCols = hideStateFilter
    ? "md:grid-cols-[1fr_1fr_auto]"
    : "md:grid-cols-[1fr_1fr_1fr_auto]";

  return (
    <div className={cn("relative overflow-visible", compact ? "z-[1000]" : "z-50")}>
      <div
        className={cn(
          "relative overflow-visible bg-transparent",
          compact
            ? "flex flex-wrap items-center gap-3 sm:gap-4"
            : cn("grid rounded-lg", gridCols),
        )}
      >
        {hideStateFilter ? null : (
          <>
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
              compact={compact}
            />
            {compact ? (
              <div
                className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
                aria-hidden
              />
            ) : null}
          </>
        )}
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
          allOptionLabel={allServicesLabel}
          onSelectAll={() => setCategories([...CATEGORIES])}
          compact={compact}
        />
        {compact ? (
          <div
            className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
            aria-hidden
          />
        ) : null}
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
          allOptionLabel={allPricesLabel}
          onSelectAll={() => setPricingTiers([...PRICING])}
          compact={compact}
        />
        {showResetAll ? (
          <>
            {compact ? (
              <div
                className="mx-1 hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
                aria-hidden
              />
            ) : null}
            <div
              className={cn(
                "flex items-center justify-center",
                compact
                  ? "ml-1 shrink-0 pl-2 pr-1 sm:ml-2 sm:pl-3"
                  : "min-h-16 px-3 py-2 md:border-l md:border-slate-200/80",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={
                  compact
                    ? "h-8 shrink-0 rounded-lg px-2.5 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    : "h-9 rounded-full px-3 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                }
                onClick={handleResetAll}
                aria-label={tFilters("resetAll")}
              >
                {tFilters("resetAll")}
              </Button>
            </div>
          </>
        ) : compact ? null : (
          <div className="flex min-h-16 items-center justify-center px-3 py-2 md:border-l md:border-slate-200/80">
            <span className="px-2 text-xs text-slate-300" aria-hidden>
              —
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
