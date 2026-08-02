const localeTag = (locale: string) => (locale === "zh" ? "zh-CN" : "en-US");

export function formatLocaleDateTime(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(iso).toLocaleString(localeTag(locale), {
    timeZone: "UTC",
    ...options,
  });
}
