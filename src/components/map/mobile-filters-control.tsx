"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DEFAULT_SEARCH_VALUES,
  OrganizationSearch,
  type OrganizationSearchValues,
  type LocationSuggestion,
  type StateSuggestion,
} from "@/components/search/organization-search";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  releaseOrphanedBodyLocks,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ImmigrationService } from "@/types/immimap";
import {
  areFiltersAtDefaults,
  useMapFiltersStore,
} from "@/stores/map-filters";

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

type PendingSearchApply =
  | { kind: "service"; service: ImmigrationService }
  | { kind: "location"; location: LocationSuggestion }
  | { kind: "state"; state: StateSuggestion };

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
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const availableServiceTypes = useMapFiltersStore((s) => s.availableServiceTypes);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const languages = useMapFiltersStore((s) => s.languages);
  const resetFilters = useMapFiltersStore((s) => s.resetFilters);
  const [draft, setDraft] = useState<OrganizationSearchValues>(search);
  const pendingApplyRef = useRef<PendingSearchApply | null>(null);
  const committedSearchRef = useRef(search);
  committedSearchRef.current = search;

  useEffect(() => {
    if (!open) return;
    setDraft(committedSearchRef.current);
    pendingApplyRef.current = null;
  }, [open]);

  const stagedSearch = open ? draft : search;
  const searchActive = Boolean(
    stagedSearch.query.trim() || stagedSearch.city || stagedSearch.selectedState,
  );
  const filtersDefault = areFiltersAtDefaults({
    states,
    categories,
    availableServiceTypes,
    pricingTiers,
    languages,
  });
  const canClear = searchActive || !filtersDefault;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (media.matches) onOpenChange(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      releaseOrphanedBodyLocks();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleClearAll = () => {
    pendingApplyRef.current = null;
    setDraft(DEFAULT_SEARCH_VALUES);
    onSearchChange(DEFAULT_SEARCH_VALUES);
    resetFilters();
    onClear();
    onOpenChange(false);
  };

  const handleShowResults = () => {
    onSearchChange(draft);
    const pending = pendingApplyRef.current;
    pendingApplyRef.current = null;
    if (pending?.kind === "service" && draft.query === pending.service.name) {
      onSelectSuggestion(pending.service);
    } else if (
      pending?.kind === "location" &&
      draft.city === pending.location.city &&
      draft.cityState === pending.location.state
    ) {
      onSelectLocation(pending.location);
    } else if (
      pending?.kind === "state" &&
      draft.selectedState === pending.state.code
    ) {
      onSelectState(pending.state);
    }
    onOpenChange(false);
  };

  return (
    <>
      <button
        type="button"
        className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-sm border border-ink-navy/15 bg-paper/90 px-3.5 text-sm font-medium text-ink-navy shadow-sm backdrop-blur-md transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-amber"
        onClick={() => onOpenChange(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4 text-route-blue" aria-hidden />
        <span>{t("filtersPill")}</span>
        {filterCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-sm bg-ink-navy px-1.5 text-[11px] font-semibold tabular-nums text-paper">
            {filterCount}
          </span>
        ) : null}
      </button>

      <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          lockScroll={false}
          showCloseButton={false}
          className="flex h-[min(92dvh,100%)] flex-col gap-0 overflow-hidden rounded-t-2xl bg-paper p-0 data-[state=closed]:hidden"
          overlayClassName="data-[state=closed]:hidden"
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <SheetHeader className="shrink-0 border-b border-slate-200/80 px-5 py-4">
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
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
            {open ? (
            <OrganizationSearch
              variant="plain"
              menuSide="top"
              hideReset
              values={draft}
              onChange={setDraft}
              suggestions={suggestions}
              onSelectSuggestion={(service) => {
                pendingApplyRef.current = { kind: "service", service };
              }}
              onSelectLocation={(location) => {
                pendingApplyRef.current = { kind: "location", location };
              }}
              onSelectState={(state) => {
                pendingApplyRef.current = { kind: "state", state };
              }}
            />
            ) : null}
          </div>
          <SheetFooter className="mt-0 shrink-0 flex-row gap-2 border-t border-ink-navy/10 bg-paper px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              className="h-11 flex-1 rounded-sm text-ink-navy hover:bg-signal-amber/20"
              onClick={handleClearAll}
              disabled={!canClear}
            >
              {t("filtersClearAll")}
            </Button>
            <Button
              type="button"
              className="h-11 flex-1 rounded-sm bg-ink-navy text-paper hover:bg-ink-navy/90"
              onClick={handleShowResults}
            >
              {t("filtersShowResults")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
