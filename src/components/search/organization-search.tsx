"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProviderSearchCard } from "@/components/filters/provider-search-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/layout/page-container";
import type { OrganizationFilters } from "@/types/database.types";
import type { ImmigrationService, ServiceCategory } from "@/types/immimap";
import { cn } from "@/lib/utils";
import { filterServicesByQuery } from "@/lib/search-services";

const CATEGORY_TO_SERVICE: Record<ServiceCategory, string> = {
  asylum: "Asylum",
  family: "Family",
  daca: "DACA",
  employment: "Employment",
};

const SERVICE_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_SERVICE).map(([category, service]) => [
    service,
    category,
  ]),
) as Record<string, ServiceCategory>;

export type OrganizationSearchValues = {
  query: string;
};

type Props = {
  values: OrganizationSearchValues;
  onChange: (values: OrganizationSearchValues) => void;
  suggestions: ImmigrationService[];
  onSelectSuggestion?: (service: ImmigrationService) => void;
};

export function organizationSearchToFilters(
  values: OrganizationSearchValues,
): OrganizationFilters {
  return {};
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
};

const MAX_SUGGESTIONS = 8;

export function OrganizationSearch({
  values,
  onChange,
  suggestions,
  onSelectSuggestion,
}: Props) {
  const t = useTranslations("Search");
  const tFilters = useTranslations("Filters");
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const trimmedQuery = values.query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const matchingSuggestions = useMemo(() => {
    if (!hasQuery) {
      return [];
    }

    return filterServicesByQuery(suggestions, trimmedQuery).slice(
      0,
      MAX_SUGGESTIONS,
    );
  }, [hasQuery, suggestions, trimmedQuery]);

  useEffect(() => {
    if (!hasQuery) {
      setOpen(false);
    }
  }, [hasQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="relative z-[100] shrink-0 overflow-visible border-b bg-white py-3">
      <PageContainer className="overflow-visible">
        <ProviderSearchCard
          labelNamespace="filters"
          searchSlot={
        <div ref={containerRef} className="relative overflow-visible px-3 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-search-query">{t("queryLabel")}</Label>
            <div className="relative overflow-visible">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="org-search-query"
                role="combobox"
                aria-expanded={open && matchingSuggestions.length > 0}
                aria-controls={listboxId}
                aria-autocomplete="list"
                value={values.query}
                onChange={(event) => {
                  onChange({ query: event.target.value });
                  setOpen(true);
                }}
                onFocus={() => {
                  if (hasQuery) {
                    setOpen(true);
                  }
                }}
                placeholder={t("queryPlaceholder")}
                className="pl-9"
                autoComplete="off"
              />
              {hasQuery ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950"
                  onClick={() => {
                    onChange(DEFAULT_SEARCH_VALUES);
                    setOpen(false);
                  }}
                  aria-label={tFilters("reset")}
                  title={tFilters("reset")}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          </div>

          {open && hasQuery ? (
            <div
              className="absolute left-3 right-3 top-full z-[200] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
              role="listbox"
              id={listboxId}
            >
              {matchingSuggestions.length > 0 ? (
                <ul className="max-h-72 overflow-y-auto py-1">
                  {matchingSuggestions.map((service) => (
                    <li key={service.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={cn(
                          "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-primary/5",
                        )}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          onChange({ query: service.name });
                          onSelectSuggestion?.(service);
                          setOpen(false);
                        }}
                      >
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
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
      </PageContainer>
    </div>
  );
}

export { SERVICE_TO_CATEGORY };
