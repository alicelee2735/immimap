"use client";

import { ExternalLink, Globe, Info, MapPin, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VerifiedBadge } from "@/components/verification/verified-badge";
import { formatDisplayPhone } from "@/lib/phone";
import { useMapFiltersStore } from "@/stores/map-filters";
import type {
  ImmigrationService,
  IntakeStatus,
  PricingLabel,
} from "@/types/immimap";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Intake status indicator ────────────────────────────────────────────────────

function IntakeStatusBlock({ status }: { status: IntakeStatus }) {
  if (status === "OPEN") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-sm font-medium text-emerald-700">
          Accepting new cases
        </span>
      </div>
    );
  }
  if (status === "LIMITED") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
        <span className="text-sm font-medium text-amber-700">
          Limited availability — contact before submitting
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2">
      <span className="h-2 w-2 rounded-full border border-slate-400" aria-hidden />
      <span className="text-sm font-medium text-slate-600">
        Intake paused / waitlist active
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

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
      modal={false}
      onOpenChange={(next) => {
        if (!next) selectService(null);
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="pointer-events-none bg-black/10 backdrop-blur-none"
        className="flex !w-full !max-w-full flex-col gap-0 overflow-y-auto p-6 sm:!max-w-md md:!w-[38vw] md:!max-w-[38vw] lg:!w-[34vw] lg:!max-w-[34vw]"
        onInteractOutside={(event) => event.preventDefault()}
      >
        {service ? (
          <>
            {/* ── Sticky action bar ──────────────────────────────────── */}
            <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 p-4">
              <SheetClose
                className="inline-flex h-10 w-10 items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" aria-hidden />
              </SheetClose>
              {service.website ? (
                <a
                  href={service.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    size: "lg",
                    className: "h-10 rounded-full px-4",
                  })}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  {t("visitWebsite")}
                </a>
              ) : null}
              {service.phone ? (
                <a
                  className={buttonVariants({
                    variant: "secondary",
                    size: "lg",
                    className: "h-10 rounded-full px-4",
                  })}
                  href={`tel:${service.phone}`}
                  aria-label={`${t("call")} ${formatDisplayPhone(service.phone)}`}
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  {t("call")}
                </a>
              ) : null}
            </div>

            {/* ── Hero image ─────────────────────────────────────────── */}
            <div
              className="-mx-6 mb-6 h-40 bg-cover bg-center"
              role="img"
              aria-label={`${service.name} location image`}
              style={{ backgroundImage: `url(${service.thumbnail_image_url})` }}
            />

            {/* ── Header ─────────────────────────────────────────────── */}
            <SheetHeader className="space-y-3 p-0 text-left">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="pr-8 text-2xl leading-tight tracking-tight text-gray-950">
                  {service.name}
                </SheetTitle>
                <Badge
                  variant={pricingVariant(service.pricing)}
                  className="shrink-0 uppercase tracking-wide"
                >
                  {tPrice(PRICING_LABEL_TO_KEY[service.pricing])}
                </Badge>
              </div>
              <VerifiedBadge type={service.type} />
            </SheetHeader>

            {/* ── Body ───────────────────────────────────────────────── */}
            <div className="mt-5 flex flex-col gap-5 border-t border-slate-200 pt-5 text-sm">

              {/* Intake status */}
              {service.intakeStatus && (
                <IntakeStatusBlock status={service.intakeStatus} />
              )}

              {/* Address */}
              <div className="flex gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <address className="not-italic leading-relaxed">
                  {service.address}
                </address>
              </div>

              {/* Catchment note */}
              {service.catchmentNote && (
                <div className="flex gap-3 text-slate-500">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <p className="leading-relaxed">{service.catchmentNote}</p>
                </div>
              )}

              {/* Description */}
              <SheetDescription className="text-base leading-relaxed text-slate-600">
                {service.description ?? t("noDescription")}
              </SheetDescription>

              {/* Languages */}
              {service.languages && service.languages.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">
                    {t("languagesLabel")}
                  </p>
                  <div className="flex items-start gap-2">
                    <Globe
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <p className="leading-relaxed text-slate-700">
                      {service.languages.join(" · ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Services offered */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-400">
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

            {/* ── Provenance footer ───────────────────────────────────── */}
            <div className="-mx-6 mt-6 border-t border-slate-100 px-6 py-3">
              <p className="text-xs text-slate-400">
                {t("provenanceLabel")}{" "}
                <time className="tabular-nums">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                {" · "}
                {t("syncCadence")}
              </p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
