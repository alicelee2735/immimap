"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/layout/page-container";
import type { OrganizationFilters } from "@/types/database.types";
import type { ServiceCategory, USState } from "@/types/immimap";

const STATES: USState[] = ["CA", "TX", "FL", "NY", "NJ"];

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
  name: string;
  city: string;
  state: USState | "all";
  category: ServiceCategory | "all";
};

type Props = {
  values: OrganizationSearchValues;
  onChange: (values: OrganizationSearchValues) => void;
};

export function organizationSearchToFilters(
  values: OrganizationSearchValues,
): OrganizationFilters {
  return {
    name: values.name.trim() || undefined,
    city: values.city.trim() || undefined,
    state: values.state === "all" ? undefined : values.state,
    category:
      values.category === "all"
        ? undefined
        : CATEGORY_TO_SERVICE[values.category],
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
  name: "",
  city: "",
  state: "all",
  category: "all",
};

export function OrganizationSearch({ values, onChange }: Props) {
  const t = useTranslations("Search");
  const tFilters = useTranslations("Filters");

  const hasActiveFilters =
    values.name.trim().length > 0 ||
    values.city.trim().length > 0 ||
    values.state !== "all" ||
    values.category !== "all";

  return (
    <div className="border-b bg-white/90 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <PageContainer>
        <p className="mb-2 text-sm font-semibold text-foreground">{t("title")}</p>
        <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_160px_180px_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="org-search-name">{t("nameLabel")}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="org-search-name"
                value={values.name}
                onChange={(event) =>
                  onChange({ ...values, name: event.target.value })
                }
                placeholder={t("namePlaceholder")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-search-city">{t("cityLabel")}</Label>
            <Input
              id="org-search-city"
              value={values.city}
              onChange={(event) =>
                onChange({ ...values, city: event.target.value })
              }
              placeholder={t("cityPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-search-state">{tFilters("stateLabel")}</Label>
            <Select
              value={values.state}
              onValueChange={(state) =>
                onChange({
                  ...values,
                  state: state as OrganizationSearchValues["state"],
                })
              }
            >
              <SelectTrigger id="org-search-state" className="w-full">
                <SelectValue placeholder={t("allStates")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStates")}</SelectItem>
                {STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {tFilters(`states.${state}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-search-category">{tFilters("serviceLabel")}</Label>
            <Select
              value={values.category}
              onValueChange={(category) =>
                onChange({
                  ...values,
                  category: category as OrganizationSearchValues["category"],
                })
              }
            >
              <SelectTrigger id="org-search-category" className="w-full">
                <SelectValue placeholder={t("allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {(Object.keys(CATEGORY_TO_SERVICE) as ServiceCategory[]).map(
                  (category) => (
                    <SelectItem key={category} value={category}>
                      {tFilters(`services.${category}`)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="justify-self-end rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
            onClick={() => onChange(DEFAULT_SEARCH_VALUES)}
            disabled={!hasActiveFilters}
            aria-label={tFilters("reset")}
            title={tFilters("reset")}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}

export { SERVICE_TO_CATEGORY };
