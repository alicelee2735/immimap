"use client";

import type { MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type MapCommands = {
  zoomIn: () => void;
  zoomOut: () => void;
};

type MapZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
};

export function MapZoomControls({
  onZoomIn,
  onZoomOut,
  className,
}: MapZoomControlsProps) {
  const handleZoomClick = (
    event: MouseEvent<HTMLButtonElement>,
    direction: "in" | "out",
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (direction === "in") {
      onZoomIn();
      return;
    }

    onZoomOut();
  };

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-sm border border-ink-navy/15 bg-paper/90 shadow-sm backdrop-blur-md",
        className,
      )}
      onDoubleClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center border-r border-ink-navy/15 text-lg font-semibold leading-none text-ink-navy transition-colors hover:bg-signal-amber/20 hover:text-ink-navy md:h-9 md:w-9"
        aria-label="Zoom in"
        onClick={(event) => handleZoomClick(event, "in")}
      >
        +
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-xl font-semibold leading-none text-ink-navy transition-colors hover:bg-signal-amber/20 hover:text-ink-navy md:h-9 md:w-9"
        aria-label="Zoom out"
        onClick={(event) => handleZoomClick(event, "out")}
      >
        -
      </button>
    </div>
  );
}
