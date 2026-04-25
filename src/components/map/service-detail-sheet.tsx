"use client";

import { ExternalLink, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDisplayPhone } from "@/lib/phone";
import { useMapFiltersStore } from "@/stores/map-filters";
import type { ImmigrationService, PricingLabel } from "@/types/immimap";

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

type Props = {
  services: ImmigrationService[];
};

export function ServiceDetailSheet({ services }: Props) {
  const t = useTranslations("ServiceDetail");
  const tPrice = useTranslations("Pricing");
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const selectService = useMapFiltersStore((s) => s.selectService);

  const service = services.find((s) => s.id === selectedServiceId) ?? null;
  const open = Boolean(service);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) selectService(null);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
      >
        {service ? (
          <>
            <div
              className="-mx-6 -mt-6 mb-6 h-40 bg-cover bg-center"
              role="img"
              aria-label={`${service.name} location image`}
              style={{ backgroundImage: `url(${service.thumbnail_image_url})` }}
            />
            <SheetHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <SheetTitle className="pr-8 text-xl leading-snug">
                  {service.name}
                </SheetTitle>
                <Badge
                  variant={pricingVariant(service.pricing)}
                  className="shrink-0 uppercase tracking-wide"
                >
                  {tPrice(PRICING_LABEL_TO_KEY[service.pricing])}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t("verifiedPrice")}</p>
              <SheetDescription className="text-base leading-relaxed">
                {service.description ?? t("noDescription")}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-5 border-t pt-6 text-sm">
              <div className="flex gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <address className="not-italic leading-relaxed">
                  {service.address}
                </address>
              </div>

              {service.phone ? (
                <div className="flex items-center gap-3">
                  <Phone
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`tel:${service.phone}`}
                  >
                    {formatDisplayPhone(service.phone)}
                  </a>
                  <span className="sr-only">{t("clickToCallHint")}</span>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {service.website ? (
                  <a
                    href={service.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "inline-flex gap-2",
                    })}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    {t("visitWebsite")}
                  </a>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("servicesLabel")}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {service.services_offered.map((offering) => (
                    <li key={offering}>
                      <Badge variant="outline" className="font-normal">
                        {offering}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
