"use client";

import type { ReactNode } from "react";

import { HomeStyleFilterBar } from "@/components/filters/home-style-filter-bar";
import { cn } from "@/lib/utils";

type ProviderSearchCardProps = {
  labelNamespace?: "home" | "filters";
  searchSlot?: ReactNode;
  footer?: ReactNode;
  className?: string;
  searchActive?: boolean;
  onResetSearch?: () => void;
  /** Hide the 50-state dropdown (states are selected via search autocomplete). */
  hideStateFilter?: boolean;
  /** Tighter spacing for the floating map toolbar. */
  compact?: boolean;
  menuSide?: "top" | "bottom";
  hideReset?: boolean;
};

export function ProviderSearchCard({
  labelNamespace = "home",
  searchSlot,
  footer,
  className,
  searchActive = false,
  onResetSearch,
  hideStateFilter = false,
  compact = false,
  menuSide = "bottom",
  hideReset = false,
}: ProviderSearchCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "relative z-[1000] flex flex-wrap items-center gap-2 overflow-visible rounded-sm border border-ink-navy/15 bg-paper p-2.5 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)] sm:gap-3",
          className,
        )}
      >
        {searchSlot ? (
          <div className="relative min-w-[min(100%,14rem)] flex-1 overflow-visible sm:min-w-[15rem]">
            {searchSlot}
          </div>
        ) : null}
        <div
          className="mx-1 hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
          aria-hidden
        />
        <HomeStyleFilterBar
          labelNamespace={labelNamespace}
          searchActive={searchActive}
          onResetSearch={onResetSearch}
          hideStateFilter={hideStateFilter}
          compact
          menuSide={menuSide}
          hideReset={hideReset}
        />
        {footer}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-visible rounded-sm border border-ink-navy/15 bg-paper p-2 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.12)]",
        className,
      )}
    >
      {searchSlot ? (
        <div className="overflow-visible border-b border-slate-200/80">
          {searchSlot}
        </div>
      ) : null}
      <div className="relative z-50 overflow-visible">
        <HomeStyleFilterBar
          labelNamespace={labelNamespace}
          searchActive={searchActive}
          onResetSearch={onResetSearch}
          hideStateFilter={hideStateFilter}
          compact={false}
          menuSide={menuSide}
          hideReset={hideReset}
        />
      </div>
      {footer ? <div className="overflow-visible">{footer}</div> : null}
    </div>
  );
}
