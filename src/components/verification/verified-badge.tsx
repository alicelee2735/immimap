"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ImmigrationService } from "@/types/immimap";

const HIDE_DELAY_MS = 200;

type Props = {
  type: ImmigrationService["type"];
  className?: string;
};

export function VerifiedBadge({ type, className }: Props) {
  const t = useTranslations("Verify");
  const [open, setOpen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showPanel = useCallback(() => {
    clearHideTimer();
    setOpen(true);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setOpen(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  if (type !== "NGO") return null;

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={showPanel}
      onMouseLeave={scheduleHide}
      onFocus={showPanel}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          scheduleHide();
        }
      }}
    >
      <span
        className="inline-flex items-center gap-1 rounded-sm text-blue-600"
        tabIndex={0}
        aria-describedby={open ? "verified-badge-tooltip" : undefined}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden />
        <span className="text-xs font-medium">{t("badgeLabel")}</span>
      </span>

      <div
        id="verified-badge-tooltip"
        role="tooltip"
        className={cn(
          "absolute bottom-full left-0 z-50 w-72 pt-2 transition-opacity duration-150",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onMouseEnter={showPanel}
        onMouseLeave={scheduleHide}
      >
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-700 shadow-md">
          {t("badgeTooltip")}
          <Link
            href="/how-we-verify"
            className="mt-1 block font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {t("learnMore")} →
          </Link>
        </div>
      </div>
    </div>
  );
}
