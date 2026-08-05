"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Languages, Loader2, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImmimapMap } from "@/components/map/immimap-map";
import { ServiceDetailSheet } from "@/components/map/service-detail-sheet";
import {
  DEFAULT_SEARCH_VALUES,
  OrganizationSearch,
  type OrganizationSearchValues,
} from "@/components/search/organization-search";
import { useOrganizations } from "@/hooks/use-organizations";
import { filterServicesByQuery, filterServicesByCity, getServiceCity } from "@/lib/search-services";
import { STATE_BOUNDING_BOXES } from "@/lib/us-states";
import { cn } from "@/lib/utils";
import { filterServices, useMapFiltersStore } from "@/stores/map-filters";
import type {
  ImmigrationService,
  PricingLabel,
} from "@/types/immimap";

function pricingVariant(
  pricing: PricingLabel,
): "default" | "secondary" | "outline" {
  if (pricing === "Pro bono") return "default";
  if (pricing === "Low-cost") return "secondary";
  return "outline";
}

const PRICING_LABEL_TO_KEY: Record<PricingLabel, "pro_bono" | "low_cost" | "paid"> = {
  "Pro bono": "pro_bono",
  "Low-cost": "low_cost",
  Paid: "paid",
};

function searchFromQueryParam(q: string | null): OrganizationSearchValues {
  const query = q?.trim() ?? "";
  if (!query) return DEFAULT_SEARCH_VALUES;
  return { ...DEFAULT_SEARCH_VALUES, query };
}

type ServiceResultCardProps = {
  service: ImmigrationService;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  setHoveredId: (id: string | null) => void;
};

/** Compact sidebar list card — essentials only; full profile lives in the detail drawer. */
function ServiceResultCard({
  service,
  selected,
  hovered,
  onSelect,
  setHoveredId,
}: ServiceResultCardProps) {
  const tMap = useTranslations("Map");
  const tPrice = useTranslations("Pricing");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const city = getServiceCity(service);
  const locationLabel = city ? `${city}, ${service.state}` : service.state;
  const languages = service.languages?.filter(Boolean) ?? [];
  const languagePreview =
    languages.length > 2
      ? `${languages.slice(0, 2).join(", ")} +${languages.length - 2}`
      : languages.join(", ");

  useEffect(() => {
    if (selected) {
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selected]);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={() => setHoveredId(service.id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(service.id)}
      onBlur={() => setHoveredId(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected
          ? "bg-blue-50/40"
          : hovered
            ? "bg-blue-50/50 ring-1 ring-inset ring-blue-200/80"
            : "hover:bg-slate-50/70",
      )}
    >
      <div className="space-y-2.5 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="border border-blue-200 bg-blue-50 font-medium text-blue-700"
          >
            {service.services_offered[0]}
          </Badge>
          <Badge
            variant={pricingVariant(service.pricing)}
            className="uppercase tracking-wide"
          >
            {tPrice(PRICING_LABEL_TO_KEY[service.pricing])}
          </Badge>
        </div>

        <h3 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
          {service.name}
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" aria-hidden />
          <span>{locationLabel}</span>
        </p>

        {languagePreview ? (
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="leading-relaxed">{languagePreview}</span>
          </p>
        ) : null}

        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-sm font-semibold text-[#2563eb]"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          {tMap("viewDetails")}
        </Button>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="divide-y divide-gray-200" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-2.5 px-4 py-3.5 sm:px-5">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-sm bg-slate-200" />
            <div className="h-5 w-20 rounded-sm bg-slate-200" />
          </div>
          <div className="h-5 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function MapDashboard() {
  const t = useTranslations("Map");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState<OrganizationSearchValues>(() =>
    searchFromQueryParam(searchParams.get("q")),
  );
  const { services, loading, error, usingFallback } = useOrganizations();
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const hoveredProviderId = useMapFiltersStore((s) => s.hoveredProviderId);
  const selectService = useMapFiltersStore((s) => s.selectService);
  const setHoveredId = useMapFiltersStore((s) => s.setHoveredProviderId);
  const setStates = useMapFiltersStore((s) => s.setStates);
  const requestFocusBounds = useMapFiltersStore((s) => s.requestFocusBounds);
  const clearFocusBounds = useMapFiltersStore((s) => s.clearFocusBounds);

  const storeFiltered = useMemo(
    () => filterServices(services, { states, categories, pricingTiers }),
    [services, states, categories, pricingTiers],
  );

  const visible = useMemo(() => {
    if (search.city) {
      return filterServicesByCity(
        storeFiltered,
        search.city,
        search.cityState,
      );
    }
    // State suggestion already narrowed the store filter — skip text matching.
    if (search.selectedState) {
      return storeFiltered;
    }
    return filterServicesByQuery(storeFiltered, search.query);
  }, [
    storeFiltered,
    search.city,
    search.cityState,
    search.selectedState,
    search.query,
  ]);

  useEffect(() => {
    if (
      selectedServiceId &&
      !visible.some((service) => service.id === selectedServiceId)
    ) {
      selectService(null);
    }
  }, [selectService, selectedServiceId, visible]);

  const empty = !loading && visible.length === 0;
  const fatalError = !loading && error && services.length === 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-3 md:p-4">
      {/* Map + sidebar: height strictly the fixed shell; never grow with content. */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:flex-row md:gap-4">
        <section className="relative z-0 min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/70 bg-background shadow-md">
          <OrganizationSearch
            variant="floating"
            values={search}
            onChange={setSearch}
            suggestions={storeFiltered}
            onSelectSuggestion={(service) => selectService(service.id)}
            onSelectLocation={(location) => {
              selectService(null);
              clearFocusBounds();
              setStates([location.state]);
            }}
            onSelectState={(state) => {
              selectService(null);
              setStates([state.code]);
              const bounds = STATE_BOUNDING_BOXES[state.code];
              if (bounds) {
                requestFocusBounds(bounds);
              }
            }}
            onClear={() => {
              selectService(null);
              clearFocusBounds();
            }}
          />
          <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
            <ImmimapMap services={loading ? [] : visible} />
          </div>
          {loading ? (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-background/95 px-6 py-4 shadow-sm">
                <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">
                  {t("loadingMap")}
                </p>
              </div>
            </div>
          ) : null}
          {error && usingFallback && services.length > 0 ? (
            <div className="pointer-events-none absolute inset-x-0 top-[7.5rem] z-10 flex justify-center px-4 sm:top-4 sm:justify-end">
              <p className="pointer-events-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 shadow-sm">
                {t("serviceUnavailable")} {t("showingCachedData")}
              </p>
            </div>
          ) : null}
          {empty ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center px-4 pt-36 sm:pt-28">
              <div
                className="pointer-events-auto max-w-md rounded-xl border border-slate-200 bg-background/95 px-4 py-3 text-center shadow-sm backdrop-blur"
                role="status"
              >
                <p className="text-sm font-medium text-foreground">
                  {t("emptyStateTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("emptyStateHint")}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="relative z-10 flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm max-md:h-[38%] max-md:max-h-[38%] md:h-full md:w-[400px]">
          <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              {t("resultsEyebrow")}
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                  {t("resultsTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loading
                    ? t("loadingResults")
                    : t("resultsCount", { count: visible.length })}
                </p>
              </div>
              <Badge
                variant="outline"
                className="hidden shrink-0 border-slate-200 sm:inline-flex"
              >
                {t("liveResults")}
              </Badge>
            </div>
          </div>

          <div className="immimap-results-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
            {loading ? (
              <SidebarSkeleton />
            ) : fatalError ? (
              <div className="mx-4 mt-4 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-medium">{t("serviceUnavailable")}</p>
                <p className="mt-1">{t("serviceUnavailableHint")}</p>
              </div>
            ) : error && usingFallback ? (
              <div className="mx-4 mt-4 rounded-md border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">{t("serviceUnavailable")}</p>
                <p className="mt-1">{t("showingCachedData")}</p>
              </div>
            ) : null}
            {!loading && !fatalError && empty ? (
              <div className="px-4 py-8 text-center sm:px-5">
                <p className="text-sm font-medium text-foreground">
                  {t("emptyStateTitle")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("emptyStateHint")}
                </p>
              </div>
            ) : null}
            {!loading && !fatalError && !empty ? (
              <div className="divide-y divide-gray-200">
                {visible.map((service) => (
                  <ServiceResultCard
                    key={service.id}
                    service={service}
                    selected={service.id === selectedServiceId}
                    hovered={service.id === hoveredProviderId}
                    onSelect={() => selectService(service.id)}
                    setHoveredId={setHoveredId}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 sm:px-5">
            <p className="text-xs text-slate-400">
              {t("provenanceTimestamp")}{" "}
              <time className="tabular-nums text-slate-500">
                {new Date().toLocaleDateString(
                  locale === "zh" ? "zh-CN" : "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </time>
              {" · "}
              {t("provenanceCadence")}
            </p>
          </div>

          {/* Absolute overlay: never contributes to parent height. */}
          <ServiceDetailSheet services={services} />
        </aside>
      </div>
    </div>
  );
}
