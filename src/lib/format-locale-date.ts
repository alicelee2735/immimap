export function formatLocaleDateTime(
  iso: string,
  _locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "UTC",
    ...options,
  });
}
