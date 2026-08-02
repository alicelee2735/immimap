import { routing } from "@/i18n/routing";

/** Strip locale prefix from a request pathname for nav matching. */
export function getInternalPathname(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";

  for (const locale of routing.locales) {
    if (normalized === `/${locale}`) {
      return "/";
    }
    if (normalized.startsWith(`/${locale}/`)) {
      const stripped = normalized.slice(`/${locale}`.length);
      return stripped || "/";
    }
  }

  return normalized;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const current = pathname.replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";

  if (target === "/") {
    return current === "/";
  }

  return current === target || current.startsWith(`${target}/`);
}
