type AnalyticsProperties = Record<string, string | number | boolean | null>;

type GtagCommand = (
  command: "config" | "event" | "js",
  targetId: string | Date,
  config?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    gtag?: GtagCommand;
    dataLayer?: unknown[];
  }
}

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

export function isAnalyticsEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

export function trackPageView(url: string): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function trackEvent(
  name: string,
  properties: AnalyticsProperties = {},
): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", name, properties);
}

export function trackNavClick(label: string, href: string, surface: string): void {
  trackEvent("nav_click", {
    nav_label: label,
    nav_href: href,
    nav_surface: surface,
  });
}
