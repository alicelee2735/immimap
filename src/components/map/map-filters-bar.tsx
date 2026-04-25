"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMapFiltersStore } from "@/stores/map-filters";
import type { PricingTier, ServiceCategory, USState } from "@/types/immimap";
import { cn } from "@/lib/utils";

const STATES: USState[] = ["CA", "TX", "FL", "NY", "NJ"];
const CATEGORIES: ServiceCategory[] = [
  "asylum",
  "family",
  "daca",
  "employment",
];
const PRICING: PricingTier[] = ["pro_bono", "low_cost", "paid"];

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function MapFiltersBar() {
  const t = useTranslations("Filters");
  const states = useMapFiltersStore((s) => s.states);
  const categories = useMapFiltersStore((s) => s.categories);
  const pricingTiers = useMapFiltersStore((s) => s.pricingTiers);
  const toggleState = useMapFiltersStore((s) => s.toggleState);
  const toggleCategory = useMapFiltersStore((s) => s.toggleCategory);
  const togglePricingTier = useMapFiltersStore((s) => s.togglePricingTier);
  const resetFilters = useMapFiltersStore((s) => s.resetFilters);

  return (
    <div className="border-b bg-card/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{t("title")}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() => resetFilters()}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t("reset")}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              {t("stateLabel")}
            </Label>
            <div
              className="mt-1.5 flex flex-wrap gap-2"
              role="group"
              aria-label={t("stateLabel")}
            >
              {STATES.map((st) => (
                <ToggleChip
                  key={st}
                  label={t(`states.${st}`)}
                  active={states.includes(st)}
                  onClick={() => toggleState(st)}
                />
              ))}
            </div>
          </div>

          <Separator className="bg-border/80" />

          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              {t("serviceLabel")}
            </Label>
            <div
              className="mt-1.5 flex flex-wrap gap-2"
              role="group"
              aria-label={t("serviceLabel")}
            >
              {CATEGORIES.map((c) => (
                <ToggleChip
                  key={c}
                  label={t(`services.${c}`)}
                  active={categories.includes(c)}
                  onClick={() => toggleCategory(c)}
                />
              ))}
            </div>
          </div>

          <Separator className="bg-border/80" />

          <div>
            <Label className="text-xs font-medium text-muted-foreground">
              {t("priceLabel")}
            </Label>
            <div
              className="mt-1.5 flex flex-wrap gap-2"
              role="group"
              aria-label={t("priceLabel")}
            >
              {PRICING.map((p) => (
                <ToggleChip
                  key={p}
                  label={t(`pricing.${p}`)}
                  active={pricingTiers.includes(p)}
                  onClick={() => togglePricingTier(p)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
