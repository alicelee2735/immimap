"use client";

import type { ReactNode } from "react";

import { HomeStyleFilterBar } from "@/components/filters/home-style-filter-bar";
import { cn } from "@/lib/utils";

type ProviderSearchCardProps = {
  labelNamespace?: "home" | "filters";
  searchSlot?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function ProviderSearchCard({
  labelNamespace = "home",
  searchSlot,
  footer,
  className,
}: ProviderSearchCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-visible rounded-xl border border-slate-200 bg-white p-2",
        className,
      )}
    >
      {searchSlot ? (
        <div className="overflow-visible border-b border-slate-200">
          {searchSlot}
        </div>
      ) : null}
      <div className="relative overflow-visible">
        <HomeStyleFilterBar labelNamespace={labelNamespace} />
      </div>
      {footer ? <div className="overflow-visible">{footer}</div> : null}
    </div>
  );
}
