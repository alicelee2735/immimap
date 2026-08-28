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
        "flex overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm",
        className,
      )}
      onDoubleClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center border-r border-slate-200 text-lg font-semibold leading-none text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#2563eb]"
        aria-label="Zoom in"
        onClick={(event) => handleZoomClick(event, "in")}
      >
        +
      </button>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center text-xl font-semibold leading-none text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#2563eb]"
        aria-label="Zoom out"
        onClick={(event) => handleZoomClick(event, "out")}
      >
        -
      </button>
    </div>
  );
}
