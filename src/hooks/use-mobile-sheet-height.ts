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

/**
 * Drag-to-snap height for the mobile map bottom sheet. Heights are in px
 * relative to the map shell (below the site header), not the full viewport.
 */
export function useMobileSheetHeight(
  containerRef: React.RefObject<HTMLElement | null>,
  { selected }: Options,
) {
  const [height, setHeight] = useState(MOBILE_SHEET_PEEK_PX);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; startH: number } | null>(null);
  const moved = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;

  const snapsFor = useCallback(() => {
    const max = containerRef.current?.clientHeight ?? 720;
    return getMobileSheetSnaps(max);
  }, [containerRef]);

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

  const onHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      moved.current = false;
      drag.current = { startY: event.clientY, startH: height };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [height],
  );

  const onHandlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!drag.current) return;
      const delta = drag.current.startY - event.clientY;
      if (Math.abs(delta) > 8) moved.current = true;
      const snaps = snapsFor();
      const next = Math.min(
        snaps.full,
        Math.max(snaps.peek, drag.current.startH + delta),
      );
      setHeight(next);
    },
    [snapsFor],
  );

  const onHandlePointerUp = useCallback(() => {
    if (!drag.current) return;
    const snaps = snapsFor();
    const current = heightRef.current;
    drag.current = null;
    setDragging(false);

    const points = selected
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
  }, [selected, snapsFor]);

  return {
    height,
    dragging,
    snapTo,
    handleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
    },
  };
}
