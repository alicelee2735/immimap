"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ImmigrationService } from "@/types/immimap";

const HIDE_DELAY_MS = 200;
const SIDE_OFFSET = 8;

type Props = {
  type: ImmigrationService["type"];
  className?: string;
};

type TooltipCoords = {
  top: number;
  left: number;
};

export function VerifiedBadge({ type, className }: Props) {
  const t = useTranslations("Verify");
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      // Anchor just above the trigger so the panel never covers "Verified"
      top: rect.top - SIDE_OFFSET,
      left: rect.left,
    });
  }, []);

  const showPanel = useCallback(() => {
    clearHideTimer();
    updatePosition();
    setOpen(true);
  }, [clearHideTimer, updatePosition]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setOpen(false);
      hideTimerRef.current = null;
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  useEffect(() => {
    setMounted(true);
    return () => clearHideTimer();
  }, [clearHideTimer]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    function handleReposition() {
      updatePosition();
    }

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePosition]);

  if (type !== "NGO") return null;

  const tooltip =
    mounted && open && coords
      ? createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-auto fixed z-[200] w-72 -translate-y-full transition-opacity duration-150"
            style={{ top: coords.top, left: coords.left }}
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={triggerRef}
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
        aria-describedby={open ? tooltipId : undefined}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden />
        <span className="text-xs font-medium">{t("badgeLabel")}</span>
      </span>
      {tooltip}
    </div>
  );
}
