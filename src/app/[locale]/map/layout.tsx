import type { ReactNode } from "react";

/**
 * Map route only: pin the app shell to the viewport below the site header (h-20).
 * Isolation + clip-path keep Leaflet's transform layers from painting into the
 * header during pinch-zoom / pan (Safari compositor overflow).
 * Isolation lives here so Home / Know Your Rights keep normal document scroll.
 */
export default function MapLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-20 z-0 isolate flex flex-col overflow-hidden overscroll-none bg-slate-100 [clip-path:inset(0)]">
      {children}
    </div>
  );
}
