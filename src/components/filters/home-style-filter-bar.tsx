"use client";

import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ALL_LANGUAGES,
  ALL_PRICING,
  ALL_STATES,
  areFiltersAtDefaults,
  useMapFiltersStore,
  type FilterLanguage,
} from "@/stores/map-filters";

type MenuKey = "state" | "service" | "price" | "language";

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type MultiSelectSegmentProps<T extends string> = {
  menuKey: MenuKey;
  openMenu: MenuKey | null;
  onOpenChange: (key: MenuKey, open: boolean) => void;
  title: string;
  value: string;
  options: SegmentOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
  allOptionLabel: string;
  onSelectAll: () => void;
  isLast?: boolean;
  compact?: boolean;
};

function MultiSelectSegment<T extends string>({
  menuKey,
  openMenu,
  onOpenChange,
  title,
  value,
  options,
  selected,
  onToggle,
  allOptionLabel,
  onSelectAll,
  isLast,
  compact = false,
}: MultiSelectSegmentProps<T>) {
  const allSelected =
    options.length > 0 &&
    selected.length === options.length &&
    options.every((option) => selected.includes(option.value));

  return (
    <DropdownMenu
      modal={false}
      open={openMenu === menuKey}
      onOpenChange={(open) => onOpenChange(menuKey, open)}
    >
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
        <DropdownMenuCheckboxItem
          checked={allSelected}
          closeOnClick={false}
          onCheckedChange={(checked) => {
            if (checked) onSelectAll();
          }}
          className={cn(
            "px-3 py-2 text-sm font-medium",
            allSelected
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {allOptionLabel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={active}
              closeOnClick={false}
              onCheckedChange={() => onToggle(option.value)}
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

type LanguageSegmentProps = {
  openMenu: MenuKey | null;
  onOpenChange: (key: MenuKey, open: boolean) => void;
  title: string;
  value: string;
  options: SegmentOption<FilterLanguage>[];
  selected: FilterLanguage[];
  allLabel: string;
  onToggle: (language: FilterLanguage) => void;
  onSelectAll: () => void;
  compact?: boolean;
};

function LanguageSegment({
  openMenu,
  onOpenChange,
  title,
  value,
  options,
  selected,
  allLabel,
  onToggle,
  onSelectAll,
  compact = false,
}: LanguageSegmentProps) {
  const isAllSelected = selected.length === 0;

  return (
    <DropdownMenu
      modal={false}
      open={openMenu === "language"}
      onOpenChange={(open) => onOpenChange("language", open)}
    >
      <DropdownMenuTrigger
        className={cn(
          "group flex items-center justify-between gap-2 bg-transparent text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact
            ? "h-9 min-w-0 shrink-0 rounded-lg px-2.5 py-1.5 pr-3.5 hover:bg-slate-100/80"
            : "min-h-16 flex-1 gap-4 px-5 py-2.5 hover:bg-primary/5",
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
        className="z-[9999] max-h-72 w-64 rounded-2xl bg-white p-2"
        positionerClassName="z-[9999]"
        align="start"
      >
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
          closeOnClick={false}
          onCheckedChange={(checked) => {
            if (checked || !isAllSelected) onSelectAll();
          }}
          className={cn(
            "px-3 py-2 text-sm font-medium",
            isAllSelected
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {allLabel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={active}
              closeOnClick={false}
              onCheckedChange={() => onToggle(option.value)}
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

function languageSelectionLabel(
  allLabel: string,
  selected: FilterLanguage[],
  selectedCountLabel: string,
): string {
  if (selected.length === 0) return allLabel;
  if (selected.length === 1) return selected[0] ?? allLabel;
  return selectedCountLabel;
}

function selectionLabel(
  allLabel: string,
  labels: string[],
  selectedCount: number,
  totalCount: number,
  selectedLabel: string,
) {
  if (selectedCount === 0 || selectedCount === totalCount) return allLabel;
  if (selectedCount === 1) return labels[0] ?? allLabel;
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
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const availableServiceTypes = useMapFiltersStore((s) => s.availableServiceTypes);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const languages = useMapFiltersStore((s) => s.languages);
  const toggleState = useMapFiltersStore((s) => s.toggleState);
  const toggleCategory = useMapFiltersStore((s) => s.toggleCategory);
  const togglePricingTier = useMapFiltersStore((s) => s.togglePricingTier);
  const toggleLanguage = useMapFiltersStore((s) => s.toggleLanguage);
  const setStates = useMapFiltersStore((s) => s.setStates);
  const setCategories = useMapFiltersStore((s) => s.setCategories);
  const setPricingTiers = useMapFiltersStore((s) => s.setPricingTiers);
  const clearLanguages = useMapFiltersStore((s) => s.clearLanguages);
  const resetFilters = useMapFiltersStore((s) => s.resetFilters);
  const requestNationalFrame = useMapFiltersStore((s) => s.requestNationalFrame);

  const handleOpenChange = useCallback((key: MenuKey, open: boolean) => {
    setOpenMenu((current) => {
      if (open) return key;
      return current === key ? null : current;
    });
  }, []);

  const filtersDefault = areFiltersAtDefaults({
    states,
    categories,
    availableServiceTypes,
    pricingTiers,
    languages,
  });
  const showResetAll = searchActive || !filtersDefault;

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
  const allLanguagesLabel =
    labelNamespace === "home"
      ? tHome("search.allLanguages")
      : tFilters("allLanguages");
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
  const serviceOptions = availableServiceTypes.map((category) => ({
    value: category,
    label: category,
  }));
  const pricingOptions = ALL_PRICING.map((tier) => ({
    value: tier,
    label: tFilters(`pricing.${tier}`),
  }));
  const languageOptions = ALL_LANGUAGES.map((item) => ({
    value: item,
    label: item,
  }));

  const handleResetFilters = () => {
    setOpenMenu(null);
    onResetSearch?.();
    resetFilters();
    // Restore continental overview when search or state bounds were active.
    if (searchActive || !filtersDefault) {
      requestNationalFrame();
    }
  };

  const gridCols = hideStateFilter
    ? "md:grid-cols-[1fr_1fr_1fr_auto]"
    : "md:grid-cols-[1fr_1fr_1fr_1fr_auto]";

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
            <MultiSelectSegment
              menuKey="state"
              openMenu={openMenu}
              onOpenChange={handleOpenChange}
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
              allOptionLabel={allStatesLabel}
              onSelectAll={() => setStates([...ALL_STATES])}
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
        <MultiSelectSegment
          menuKey="service"
          openMenu={openMenu}
          onOpenChange={handleOpenChange}
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
          onSelectAll={() => setCategories([...availableServiceTypes])}
          compact={compact}
        />
        {compact ? (
          <div
            className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
            aria-hidden
          />
        ) : null}
        <MultiSelectSegment
          menuKey="price"
          openMenu={openMenu}
          onOpenChange={handleOpenChange}
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
          onSelectAll={() => setPricingTiers([...ALL_PRICING])}
          compact={compact}
        />
        {compact ? (
          <div
            className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
            aria-hidden
          />
        ) : null}
        <LanguageSegment
          openMenu={openMenu}
          onOpenChange={handleOpenChange}
          title={tFilters("languageLabel")}
          value={languageSelectionLabel(
            allLanguagesLabel,
            languages,
            selectedCountLabel(languages.length),
          )}
          options={languageOptions}
          selected={languages}
          allLabel={allLanguagesLabel}
          onToggle={toggleLanguage}
          onSelectAll={clearLanguages}
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
                onClick={handleResetFilters}
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
