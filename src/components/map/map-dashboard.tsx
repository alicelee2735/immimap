"use client";

import { useEffect, useMemo } from "react";
import { ExternalLink, Languages, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImmimapMap } from "@/components/map/immimap-map";
import { MapFiltersBar } from "@/components/map/map-filters-bar";
import { ServiceDetailSheet } from "@/components/map/service-detail-sheet";
import { cn } from "@/lib/utils";
import { formatDisplayPhone } from "@/lib/phone";
import { filterServices, useMapFiltersStore } from "@/stores/map-filters";
import type {
  ImmigrationService,
  PricingLabel,
  ServiceOffering,
} from "@/types/immimap";

type Props = {
  services: ImmigrationService[];
};

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

type ServiceResultCardProps = {
  service: ImmigrationService;
  selected: boolean;
  onSelect: () => void;
};

function ServiceResultCard({
  service,
  selected,
  onSelect,
}: ServiceResultCardProps) {
  const tMap = useTranslations("Map");
  const tPrice = useTranslations("Pricing");
  const tDetail = useTranslations("ServiceDetail");

  return (
    <Card
      size="sm"
      className={cn(
        "border bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        selected
          ? "border-primary/50 ring-2 ring-primary/20"
          : "border-border/70",
      )}
    >
      <div
        className="h-32 bg-cover bg-center"
        role="img"
        aria-label={`${service.name} location image`}
        style={{ backgroundImage: `url(${service.thumbnail_image_url})` }}
      />
      <CardHeader className="gap-3">
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
            <CardTitle className="text-base sm:text-lg">{service.name}</CardTitle>
          </div>
          <span className="rounded-full border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {service.state}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {service.description ?? tDetail("noDescription")}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="leading-relaxed">{service.address}</span>
          </div>
          {service.phone ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                href={`tel:${service.phone}`}
              >
                {formatDisplayPhone(service.phone)}
              </a>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Languages className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{service.services_offered.join(", ")}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" onClick={onSelect}>
            {tMap("viewDetails")}
          </Button>
          {service.website ? (
            <a
              href={service.website}
              target="_blank"
              rel="noopener noreferrer"
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
      </CardContent>
    </Card>
  );
}

export function MapDashboard({ services }: Props) {
  const t = useTranslations("Map");
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const selectService = useMapFiltersStore((s) => s.selectService);

  const visible = useMemo(
    () => filterServices(services, { states, categories, pricingTiers }),
    [services, states, categories, pricingTiers],
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
    <div className="flex min-h-0 flex-1 flex-col bg-muted/30">
      <MapFiltersBar />
      <div className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="relative min-h-[520px] border-b bg-background lg:h-[calc(100dvh-13.5rem)] lg:border-b-0 lg:border-r">
          <ImmimapMap services={visible} />
          {empty ? (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center px-4 pt-16">
              <div
                className="pointer-events-auto max-w-md rounded-lg border border-border bg-background/95 px-4 py-3 text-center shadow-md backdrop-blur"
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

        <aside className="flex min-h-0 flex-col bg-background lg:h-[calc(100dvh-13.5rem)]">
          <div className="border-b px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t("resultsEyebrow")}
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {t("resultsTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("resultsCount", { count: visible.length })}
                </p>
              </div>
              <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                {t("liveResults")}
              </Badge>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {empty ? (
              <div className="rounded-xl border border-dashed bg-muted/40 p-6 text-center">
                <p className="text-sm font-medium">{t("emptyStateTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("emptyStateHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((service) => (
                  <ServiceResultCard
                    key={service.id}
                    service={service}
                    selected={service.id === selectedServiceId}
                    onSelect={() => selectService(service.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
      <ServiceDetailSheet services={services} />
    </div>
  );
}
