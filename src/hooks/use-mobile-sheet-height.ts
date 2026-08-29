"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Peek: handle + compact count + first card, without eating the map. */
export const MOBILE_SHEET_PEEK_PX = 236;

export function getMobileSheetSnaps(containerHeight: number) {
  const peek = Math.min(MOBILE_SHEET_PEEK_PX, Math.round(containerHeight * 0.36));
  const full = Math.max(peek, Math.round(containerHeight * 0.94));
  const detail = Math.round(containerHeight * 0.72);
  return { peek, full, detail };
}

type Options = {
  selected: boolean;
};

type DragState = {
  pointerId: number | null;
  startY: number;
  startH: number;
};

/**
 * Drag-to-snap height for the mobile map bottom sheet. Heights are in px
 * relative to the map shell (below the site header), not the full viewport.
 *
 * Gestures are tracked on `window` (pointer + touch) with non-passive
 * listeners so a swipe that leaves the handle still resizes the sheet.
 * Element-only `onPointerMove` / `setPointerCapture` often no-ops on iOS
 * Safari when the handle sits in an overflow/transform container.
 */
export function useMobileSheetHeight(
  containerRef: React.RefObject<HTMLElement | null>,
  { selected }: Options,
) {
  const [height, setHeight] = useState(MOBILE_SHEET_PEEK_PX);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const moved = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const snapsForRef = useRef<() => { peek: number; full: number; detail: number }>(
    () => getMobileSheetSnaps(720),
  );

  const snapsFor = useCallback(() => {
    const max = containerRef.current?.clientHeight ?? 720;
    return getMobileSheetSnaps(max);
  }, [containerRef]);
  snapsForRef.current = snapsFor;

  const snapTo = useCallback(
    (target: "peek" | "full" | "detail") => {
      const snaps = snapsFor();
      setHeight(snaps[target]);
    },
    [snapsFor],
  );

  useEffect(() => {
    const snaps = snapsFor();
    setHeight(selected ? snaps.detail : snaps.peek);
  }, [selected, snapsFor]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sync = () => {
      const snaps = getMobileSheetSnaps(el.clientHeight);
      setHeight((current) => {
        const nearest =
          Math.abs(current - snaps.peek) <= Math.abs(current - snaps.full)
            ? snaps.peek
            : snaps.full;
        if (selected && nearest === snaps.peek) return snaps.detail;
        return nearest;
      });
    };

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, selected]);

  const finishDrag = useCallback(() => {
    if (!drag.current) return;
    const snaps = snapsForRef.current();
    const current = heightRef.current;
    drag.current = null;
    setDragging(false);

    const points = selectedRef.current
      ? [snaps.peek, snaps.detail, snaps.full]
      : [snaps.peek, snaps.full];

    if (!moved.current) {
      const atTop = current >= snaps.full - 24;
      setHeight(atTop ? snaps.peek : points[points.length - 1]);
      return;
    }

    const nearest = points.reduce((best, point) =>
      Math.abs(point - current) < Math.abs(best - current) ? point : best,
    );
    setHeight(nearest);
  }, []);

  const applyMove = useCallback((clientY: number) => {
    const state = drag.current;
    if (!state) return;
    const delta = state.startY - clientY;
    if (Math.abs(delta) > 8) moved.current = true;
    const snaps = snapsForRef.current();
    const next = Math.min(
      snaps.full,
      Math.max(snaps.peek, state.startH + delta),
    );
    setHeight(next);
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      if (state.pointerId !== null && event.pointerId !== state.pointerId) {
        return;
      }
      event.preventDefault();
      applyMove(event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      if (state.pointerId !== null && event.pointerId !== state.pointerId) {
        return;
      }
      finishDrag();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!drag.current || event.touches.length === 0) return;
      event.preventDefault();
      applyMove(event.touches[0].clientY);
    };

    const onTouchEnd = () => {
      if (!drag.current) return;
      finishDrag();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyMove, finishDrag]);

  const toggleFromTap = useCallback(() => {
    const snaps = snapsForRef.current();
    const current = heightRef.current;
    const points = selectedRef.current
      ? [snaps.peek, snaps.detail, snaps.full]
      : [snaps.peek, snaps.full];
    const atTop = current >= snaps.full - 24;
    setHeight(atTop ? snaps.peek : points[points.length - 1]);
  }, []);

  const beginDrag = (clientY: number, pointerId: number | null) => {
    moved.current = false;
    drag.current = {
      pointerId,
      startY: clientY,
      startH: heightRef.current,
    };
    setDragging(true);
  };

  const onHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Touch / pen report `button === 0` on most engines, but WebKit has
      // historically used -1. Only ignore non-primary *mouse* buttons.
      if (event.pointerType === "mouse" && event.button !== 0) return;
      beginDrag(event.clientY, event.pointerId);
    },
    [],
  );

  const onHandleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (drag.current || event.touches.length !== 1) return;
      event.preventDefault();
      beginDrag(event.touches[0].clientY, null);
    },
    [],
  );

  const onHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleFromTap();
    },
    [toggleFromTap],
  );

  return {
    height,
    dragging,
    snapTo,
    handleProps: {
      onPointerDown: onHandlePointerDown,
      onTouchStart: onHandleTouchStart,
      onKeyDown: onHandleKeyDown,
    },
  };
}
