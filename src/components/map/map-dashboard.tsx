"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Globe, Languages, Loader2, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { ImmimapMap } from "@/components/map/immimap-map";
import { MapFiltersBar } from "@/components/map/map-filters-bar";
import { ServiceDetailSheet } from "@/components/map/service-detail-sheet";
import {
  DEFAULT_SEARCH_VALUES,
  OrganizationSearch,
  type OrganizationSearchValues,
} from "@/components/search/organization-search";
import { useOrganizations } from "@/hooks/use-organizations";
import { cn } from "@/lib/utils";
import { formatDisplayPhone } from "@/lib/phone";
import { filterServicesByPricing, useMapFiltersStore } from "@/stores/map-filters";
import type {
  ImmigrationService,
  IntakeStatus,
  PricingLabel,
  ServiceOffering,
} from "@/types/immimap";

function pricingVariant(
  pricing: PricingLabel,
): "default" | "secondary" | "outline" {
  if (pricing === "Pro bono") return "default";
  if (pricing === "Low-cost") return "secondary";
  return "outline";
}

function offeringTone(offering: ServiceOffering) {
  if (offering === "Asylum" || offering === "Removal Defense") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (offering === "Family" || offering === "Citizenship") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (offering === "DACA" || offering === "TPS") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

const PRICING_LABEL_TO_KEY: Record<PricingLabel, "pro_bono" | "low_cost" | "paid"> = {
  "Pro bono": "pro_bono",
  "Low-cost": "low_cost",
  Paid: "paid",
};

function IntakeIndicator({ status }: { status: IntakeStatus }) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Accepting new cases
      </span>
    );
  }
  if (status === "LIMITED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        Limited availability
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full border border-slate-400 bg-transparent" aria-hidden />
      Waitlist active
    </span>
  );
}

type ServiceResultCardProps = {
  service: ImmigrationService;
  selected: boolean;
  onSelect: () => void;
  setHoveredId: (id: string | null) => void;
};

function ServiceResultCard({
  service,
  selected,
  onSelect,
  setHoveredId,
}: ServiceResultCardProps) {
  const tMap = useTranslations("Map");
  const tPrice = useTranslations("Pricing");
  const tDetail = useTranslations("ServiceDetail");
  const cardRef = useRef<HTMLDivElement | null>(null);

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
        selected ? "bg-blue-50/40" : "hover:bg-slate-50/70",
      )}
    >
      <div
        className="h-32 bg-cover bg-center"
        role="img"
        aria-label={`${service.name} location image`}
        style={{ backgroundImage: `url(${service.thumbnail_image_url})` }}
      />
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border font-medium",
                  offeringTone(service.services_offered[0]),
                )}
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
            <h3 className="text-base font-semibold tracking-tight sm:text-lg">
              {service.name}
            </h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {service.state}
          </span>
        </div>

        {service.intakeStatus && (
          <IntakeIndicator status={service.intakeStatus} />
        )}

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {service.description ?? tDetail("noDescription")}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex gap-x-2 text-muted-foreground">
            <MapPin
              className="h-4 w-4 shrink-0 translate-y-[1px] text-primary"
              aria-hidden
            />
            <span className="leading-relaxed">{service.address}</span>
          </div>
          {service.phone ? (
            <div className="flex items-center gap-x-2 text-muted-foreground">
              <Phone
                className="h-4 w-4 shrink-0 translate-y-[1px] text-primary"
                aria-hidden
              />
              <a
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                href={`tel:${service.phone}`}
              >
                {formatDisplayPhone(service.phone)}
              </a>
            </div>
          ) : null}
          {service.languages && service.languages.length > 0 ? (
            <div className="flex items-start gap-x-2 text-muted-foreground">
              <Globe
                className="h-4 w-4 shrink-0 translate-y-[1px] text-primary"
                aria-hidden
              />
              <span className="leading-relaxed">
                {service.languages.join(", ")}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-x-2 text-muted-foreground">
              <Languages
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <span>{service.services_offered.join(", ")}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            {tMap("viewDetails")}
          </Button>
          {service.website ? (
            <a
              href={service.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "gap-1.5",
              })}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {tDetail("visitWebsite")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MapDashboard() {
  const t = useTranslations("Map");
  const [search, setSearch] = useState<OrganizationSearchValues>(
    DEFAULT_SEARCH_VALUES,
  );
  const { services, loading, error, usingFallback } = useOrganizations(search);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const selectService = useMapFiltersStore((s) => s.selectService);
  const setHoveredId = useMapFiltersStore((s) => s.setHoveredProviderId);

  const visible = useMemo(
    () => filterServicesByPricing(services, pricingTiers),
    [services, pricingTiers],
  );

  useEffect(() => {
    if (
      selectedServiceId &&
      !visible.some((service) => service.id === selectedServiceId)
    ) {
      selectService(null);
    }
  }, [selectService, selectedServiceId, visible]);

  const empty = visible.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <OrganizationSearch values={search} onChange={setSearch} />
      <MapFiltersBar pricingOnly />
      <PageContainer className="grid min-h-0 max-w-none flex-1 gap-0 py-6 md:grid-cols-[minmax(0,1fr)_440px] md:px-6 lg:px-8">
        <section className="relative min-h-[520px] border-b border-slate-200 bg-background md:h-[760px] md:border-b-0 md:border-r">
          {loading ? (
            <div
              className="flex h-full min-h-[420px] w-full flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium">{t("loadingMap")}</p>
            </div>
          ) : (
            <ImmimapMap services={visible} />
          )}
          {error && usingFallback ? (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
              <p className="pointer-events-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {error} Showing cached provider data.
              </p>
            </div>
          ) : null}
          {empty ? (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center px-4 pt-16">
              <div
                className="pointer-events-auto max-w-md rounded-lg border border-slate-200 bg-background/95 px-4 py-3 text-center backdrop-blur"
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

        <aside className="flex min-h-0 flex-col bg-white md:h-[760px]">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
              {t("resultsEyebrow")}
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                  {t("resultsTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("resultsCount", { count: visible.length })}
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

          <div className="immimap-results-scroll min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("loadingMap")}
              </div>
            ) : error ? (
              <div className="mx-4 mt-4 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-medium">Sync issue</p>
                <p className="mt-1">
                  We couldn&apos;t refresh the latest providers. Showing cached
                  data.
                </p>
              </div>
            ) : empty ? (
              <div className="px-4 py-6 text-center sm:px-5">
                <p className="text-sm font-medium">{t("emptyStateTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("emptyStateHint")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {visible.map((service) => (
                  <ServiceResultCard
                    key={service.id}
                    service={service}
                    selected={service.id === selectedServiceId}
                    onSelect={() => selectService(service.id)}
                    setHoveredId={setHoveredId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Provenance footer */}
          <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 sm:px-5">
            <p className="text-xs text-slate-400">
              {t("provenanceTimestamp")}{" "}
              <time className="tabular-nums text-slate-500">
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              {" · "}
              {t("provenanceCadence")}
            </p>
          </div>
        </aside>
      </PageContainer>
      <ServiceDetailSheet services={services} />
    </div>
  );
}
