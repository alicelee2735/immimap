"use client";

import type { ComponentProps } from "react";

import { trackNavClick } from "@/lib/analytics";
import { Link } from "@/i18n/navigation";

type Props = ComponentProps<typeof Link> & {
  navLabel: string;
  navSurface: "desktop" | "mobile" | "language";
};

export function TrackedNavLink({
  navLabel,
  navSurface,
  onClick,
  href,
  ...props
}: Props) {
  const hrefValue = typeof href === "string" ? href : String(href);

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        trackNavClick(navLabel, hrefValue, navSurface);
        onClick?.(event);
      }}
    />
  );
}
