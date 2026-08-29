"use client";

import { useTranslations } from "next-intl";

type Props = {
  filterLabel: string | null;
  elsewhereCount: number;
  onShowNearest: () => void;
};

export function MapOffscreenResultsBanner({
  filterLabel,
  elsewhereCount,
  onShowNearest,
}: Props) {
  const t = useTranslations("Map");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[900] flex justify-center px-3 max-md:bottom-[calc(var(--mobile-sheet-h,12rem)+0.75rem)]">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex max-w-lg flex-col items-stretch gap-3 border-l-4 border-l-signal-amber bg-paper px-4 py-3 shadow-[0_8px_30px_-12px_rgba(27,42,74,0.18)] sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      >
        <p className="text-sm leading-6 text-charcoal">
          {filterLabel
            ? t("offscreenFiltered", {
                filter: filterLabel,
                count: elsewhereCount,
              })
            : t("offscreenGeneric", { count: elsewhereCount })}
        </p>
        <button
          type="button"
          onClick={onShowNearest}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-sm border border-ink-navy bg-signal-amber px-4 text-sm font-semibold text-ink-navy hover:bg-signal-amber/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-amber focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {t("offscreenShowNearest")}
        </button>
      </div>
    </div>
  );
}
