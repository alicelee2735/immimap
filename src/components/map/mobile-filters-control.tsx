"use client";

import { useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  OrganizationSearch,
  type OrganizationSearchValues,
  type LocationSuggestion,
  type StateSuggestion,
} from "@/components/search/organization-search";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ImmigrationService } from "@/types/immimap";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterCount: number;
  search: OrganizationSearchValues;
  onSearchChange: (values: OrganizationSearchValues) => void;
  suggestions: ImmigrationService[];
  onSelectSuggestion: (service: ImmigrationService) => void;
  onSelectLocation: (location: LocationSuggestion) => void;
  onSelectState: (state: StateSuggestion) => void;
  onClear: () => void;
};

export function MobileFiltersControl({
  open,
  onOpenChange,
  filterCount,
  search,
  onSearchChange,
  suggestions,
  onSelectSuggestion,
  onSelectLocation,
  onSelectState,
  onClear,
}: Props) {
  const t = useTranslations("Map");
  const tFilters = useTranslations("Filters");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (media.matches) onOpenChange(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, [onOpenChange]);

  return (
    <>
      <button
        type="button"
        className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/80 bg-paper px-3.5 text-sm font-medium text-ink-navy shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4 text-route-blue" aria-hidden />
        <span>{t("filtersPill")}</span>
        {filterCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ink-navy px-1.5 text-[11px] font-semibold tabular-nums text-paper">
            {filterCount}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[min(92dvh,100%)] gap-0 rounded-t-2xl bg-paper p-0 data-[state=closed]:hidden"
          overlayClassName="data-[state=closed]:hidden"
        >
          <SheetHeader className="border-b border-slate-200/80 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-route-blue">
              {tFilters("title")}
            </p>
            <SheetTitle className="font-serif text-2xl font-semibold tracking-[-0.01em] text-ink-navy">
              {t("filtersSheetTitle")}
            </SheetTitle>
            <SheetDescription className="text-sm text-charcoal/70">
              {t("filtersSheetHint")}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <OrganizationSearch
              variant="plain"
              values={search}
              onChange={onSearchChange}
              suggestions={suggestions}
              onSelectSuggestion={(service) => {
                onSelectSuggestion(service);
                onOpenChange(false);
              }}
              onSelectLocation={(location) => {
                onSelectLocation(location);
                onOpenChange(false);
              }}
              onSelectState={(state) => {
                onSelectState(state);
                onOpenChange(false);
              }}
              onClear={onClear}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
