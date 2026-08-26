"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { Building2, Landmark, MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProviderSearchCard } from "@/components/filters/provider-search-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/layout/page-container";
import type { OrganizationFilters } from "@/types/database.types";
import type {
  ImmigrationService,
  USState,
} from "@/types/immimap";
import { cn } from "@/lib/utils";
import {
  collectLocationSuggestions,
  filterServicesByQuery,
  type LocationSuggestion,
} from "@/lib/search-services";
import {
  collectStateSuggestions,
  type StateSuggestion,
} from "@/lib/us-states";

export type OrganizationSearchValues = {
  query: string;
  /** Exact city filter applied when a location suggestion is chosen. */
  city: string | null;
  /** State paired with `city` for disambiguation (e.g. Springfield). */
  cityState: string | null;
  /** When a state suggestion is chosen, lock the map filter to this state. */
  selectedState: USState | null;
};

type Props = {
  values: OrganizationSearchValues;
  onChange: (values: OrganizationSearchValues) => void;
  suggestions: ImmigrationService[];
  onSelectSuggestion?: (service: ImmigrationService) => void;
  onSelectLocation?: (location: LocationSuggestion) => void;
  onSelectState?: (state: StateSuggestion) => void;
  onClear?: () => void;
  /** Floating glass overlay inside the map canvas (default: full-width bar). */
  variant?: "bar" | "floating";
  /**
   * Attached to the floating panel's outer box so callers can measure its
   * rendered height (e.g. to keep map content from rendering underneath it).
   * Only meaningful when `variant="floating"`.
   */
  panelRef?: RefObject<HTMLDivElement | null>;
};

export function organizationSearchToFilters(
  values: OrganizationSearchValues,
): OrganizationFilters {
  return {
    city: values.city ?? undefined,
    state: values.selectedState ?? undefined,
  };
}

export function buildOrganizationsQuery(
  filters: OrganizationFilters,
): string {
  const params = new URLSearchParams();

  if (filters.name) {
    params.set("name", filters.name);
  }
  if (filters.city) {
    params.set("city", filters.city);
  }
  if (filters.state) {
    const states = Array.isArray(filters.state) ? filters.state : [filters.state];
    for (const state of states) {
      params.append("state", state);
    }
  }
  if (filters.category) {
    params.set("category", filters.category);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export const DEFAULT_SEARCH_VALUES: OrganizationSearchValues = {
  query: "",
  city: null,
  cityState: null,
  selectedState: null,
};

const MAX_PROVIDER_SUGGESTIONS = 6;
const MAX_LOCATION_SUGGESTIONS = 5;
const MAX_STATE_SUGGESTIONS = 5;

export function OrganizationSearch({
  values,
  onChange,
  suggestions,
  onSelectSuggestion,
  onSelectLocation,
  onSelectState,
  onClear,
  variant = "bar",
  panelRef,
}: Props) {
  const t = useTranslations("Search");
  const tFilters = useTranslations("Filters");
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const isFloating = variant === "floating";

  const trimmedQuery = values.query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const stateSuggestions = useMemo(
    () => collectStateSuggestions(trimmedQuery, MAX_STATE_SUGGESTIONS),
    [trimmedQuery],
  );

  const locationSuggestions = useMemo(
    () =>
      collectLocationSuggestions(
        suggestions,
        trimmedQuery,
        MAX_LOCATION_SUGGESTIONS,
      ),
    [suggestions, trimmedQuery],
  );

  const providerSuggestions = useMemo(() => {
    if (!hasQuery) {
      return [];
    }

    return filterServicesByQuery(suggestions, trimmedQuery).slice(
      0,
      MAX_PROVIDER_SUGGESTIONS,
    );
  }, [hasQuery, suggestions, trimmedQuery]);

  const hasMatches =
    stateSuggestions.length > 0 ||
    locationSuggestions.length > 0 ||
    providerSuggestions.length > 0;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const clearSearch = () => {
    onChange(DEFAULT_SEARCH_VALUES);
    onClear?.();
    setOpen(false);
  };

  const suggestionsOpen = open && hasQuery;

  const searchCard = (
    <ProviderSearchCard
      labelNamespace="filters"
      hideStateFilter
      compact={isFloating}
      searchActive={Boolean(
        values.query.trim() || values.city || values.selectedState,
      )}
      onResetSearch={() => {
        // Only clear the search field here. Filter bar calls `resetFilters()` and
        // `requestNationalFrame()`, which own filter + viewport reset — avoid an
        // intermediate clearFocusBounds()/fitBounds race that leaves the camera zoomed in.
        onChange(DEFAULT_SEARCH_VALUES);
      }}
      searchSlot={
        <div
          ref={containerRef}
          className={cn(
            "relative overflow-visible",
            isFloating ? "w-full" : "px-3 py-2",
          )}
        >
          <div className={cn(!isFloating && "space-y-1.5")}>
            <Label htmlFor="org-search-query" className="sr-only">
              {t("queryLabel")}
            </Label>
            <div className="relative overflow-visible">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="org-search-query"
                role="combobox"
                aria-expanded={suggestionsOpen}
                aria-controls={listboxId}
                aria-autocomplete="list"
                value={values.query}
                onChange={(event) => {
                  onChange({
                    query: event.target.value,
                    city: null,
                    cityState: null,
                    selectedState: null,
                  });
                  setOpen(true);
                }}
                onFocus={() => {
                  if (hasQuery) {
                    setOpen(true);
                  }
                }}
                placeholder={t("queryPlaceholder")}
                className={cn(
                  "pl-9 shadow-none",
                  isFloating &&
                    "h-9 border-0 bg-transparent focus-visible:border-0 focus-visible:ring-0",
                )}
                autoComplete="off"
              />
              {hasQuery ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950"
                  onClick={clearSearch}
                  aria-label={tFilters("reset")}
                  title={tFilters("reset")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          </div>

          {suggestionsOpen ? (
            <div
              className="absolute left-0 right-0 top-full z-[1050] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              role="listbox"
              id={listboxId}
            >
              {hasMatches ? (
                <div className="max-h-80 overflow-y-auto py-1">
                  {stateSuggestions.length > 0 ? (
                    <div>
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("statesSection")}
                      </p>
                      <ul>
                        {stateSuggestions.map((state) => (
                          <li key={state.code}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                onSelectState?.(state);
                                onChange({
                                  query: state.label,
                                  city: null,
                                  cityState: null,
                                  selectedState: state.code,
                                });
                                setOpen(false);
                              }}
                            >
                              <Landmark
                                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {state.label}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {t("stateHint")}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {locationSuggestions.length > 0 ? (
                    <div>
                      <p
                        className={cn(
                          "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400",
                          stateSuggestions.length > 0
                            ? "border-t border-slate-100 pt-2"
                            : "pt-2",
                        )}
                      >
                        {t("locationsSection")}
                      </p>
                      <ul>
                        {locationSuggestions.map((location) => (
                          <li key={location.label}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                onSelectLocation?.(location);
                                onChange({
                                  query: location.label,
                                  city: location.city,
                                  cityState: location.state,
                                  selectedState: location.state,
                                });
                                setOpen(false);
                              }}
                            >
                              <MapPin
                                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {location.label}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {t("locationProviderCount", {
                                    count: location.count,
                                  })}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {providerSuggestions.length > 0 ? (
                    <div>
                      <p
                        className={cn(
                          "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400",
                          stateSuggestions.length > 0 ||
                            locationSuggestions.length > 0
                            ? "border-t border-slate-100 pt-2"
                            : "pt-2",
                        )}
                      >
                        {t("providersSection")}
                      </p>
                      <ul>
                        {providerSuggestions.map((service) => (
                          <li key={service.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                onSelectSuggestion?.(service);
                                onChange({
                                  query: service.name,
                                  city: null,
                                  cityState: null,
                                  selectedState: null,
                                });
                                setOpen(false);
                              }}
                            >
                              <Building2
                                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {service.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {service.address}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  {t("noMatches")}
                </p>
              )}
            </div>
          ) : null}
        </div>
      }
    />
  );

  if (isFloating) {
    return (
      <div
        ref={panelRef}
        className="pointer-events-none absolute left-4 top-4 z-[1000] right-4 max-w-4xl"
        onDoubleClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-auto w-full">{searchCard}</div>
      </div>
    );
  }

  return (
    <div className="relative z-[100] shrink-0 border-b bg-white py-2">
      <PageContainer className="overflow-visible">{searchCard}</PageContainer>
    </div>
  );
}

export type { LocationSuggestion, StateSuggestion };
