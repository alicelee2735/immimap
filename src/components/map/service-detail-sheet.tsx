"use client";

import { useEffect } from "react";
import { ExternalLink, Globe, Info, MapPin, Phone, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verification/verified-badge";
import { formatDisplayPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
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
  const t = useTranslations("ServiceDetail");

  if (status === "OPEN") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-sm font-medium text-emerald-700">
          {t("intakeOpen")}
        </span>
      </div>
    );
  }
  if (status === "LIMITED") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
        <span className="text-sm font-medium text-amber-700">
          {t("intakeLimitedDetail")}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2">
      <span className="h-2 w-2 rounded-full border border-slate-400" aria-hidden />
      <span className="text-sm font-medium text-slate-600">
        {t("intakePaused")}
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
  const locale = useLocale();
  const selectedServiceId = useMapFiltersStore((s) => s.selectedServiceId);
  const selectService = useMapFiltersStore((s) => s.selectService);

  const service = services.find((s) => s.id === selectedServiceId) ?? null;
  const open = Boolean(service);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        selectService(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectService]);

  if (!service) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={service.name}
      className={cn(
        // Absolute fill of the sidebar only — must never expand parent height.
        "absolute inset-0 z-20 flex h-full max-h-full min-h-0 flex-col overflow-hidden bg-white",
        "animate-in slide-in-from-right duration-300",
      )}
    >
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-4">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("close")}
          onClick={() => selectService(null)}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-3 px-4 py-5 text-left sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="pr-8 text-2xl font-semibold leading-tight tracking-tight text-gray-950">
              {service.name}
            </h2>
            <Badge
              variant={pricingVariant(service.pricing)}
              className="shrink-0 uppercase tracking-wide"
            >
              {tPrice(PRICING_LABEL_TO_KEY[service.pricing])}
            </Badge>
          </div>
          <VerifiedBadge type={service.type} />
          {service.intakeStatus ? (
            <IntakeStatusBlock status={service.intakeStatus} />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 border-t border-slate-200 px-4 py-5 text-sm sm:px-5">
          <div className="flex gap-3">
            <MapPin
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <address className="not-italic leading-relaxed">
              {service.address}
            </address>
          </div>

          {service.catchmentNote ? (
            <div className="flex gap-3 text-slate-500">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                aria-hidden
              />
              <p className="leading-relaxed">{service.catchmentNote}</p>
            </div>
          ) : null}

          <p className="text-base leading-relaxed text-slate-600">
            {service.description ?? t("noDescription")}
          </p>

          {service.languages && service.languages.length > 0 ? (
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
          ) : null}

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

        <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-400">
            {t("provenanceLabel")}{" "}
            <time className="tabular-nums">
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
            {t("syncCadence")}
          </p>
        </div>
      </div>
    </div>
  );
}
