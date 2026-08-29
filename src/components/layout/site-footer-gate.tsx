"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";
import { isMapPathname } from "@/lib/nav-pathname";

/** Hides the site footer on /map and follows client navigations away from it. */
export function SiteFooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isMapPathname(pathname)) return null;
  return children;
}
