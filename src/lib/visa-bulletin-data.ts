import type {
  VisaBulletinDataset,
  VisaBulletinEntry,
  VisaBulletinDateValue,
  VisaBulletinStatus,
  VisaCategory,
  VisaBulletinCountry,
  VisaChartType,
} from "@/types/immimap";
import raw from "@/data/visa-bulletin.json";

/** June 2026 employment-based snapshot categories only. */
export const VISA_CATEGORIES: VisaCategory[] = ["EB1", "EB2", "EB3"];

/** @deprecated Use VISA_CATEGORIES */
export const BULLETIN_CATEGORIES = VISA_CATEGORIES;

export const VISA_BULLETIN_COUNTRIES: VisaBulletinCountry[] = [
  "All Chargeability",
  "CHINA",
  "INDIA",
  "PHILIPPINES",
];

export type CategoryCard = {
  category: VisaCategory;
  entry: VisaBulletinEntry | null;
};

/** Display label matching official bulletin (EB1 → EB-1). */
export function formatCategoryLabel(category: VisaCategory): string {
  const match = /^EB(\d)$/.exec(category);
  if (match) return `EB-${match[1]}`;
  return category;
}

function addUtcMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function deriveFilingDate(
  finalAction: VisaBulletinDateValue,
): VisaBulletinDateValue {
  if (finalAction === "C" || finalAction === "U") return finalAction;
  return addUtcMonths(finalAction, 6);
}

export function getEntryStatus(entry: VisaBulletinEntry): VisaBulletinStatus {
  if (entry.status) return entry.status;
  if (entry.final_action_date === "C") return "Current";
  if (entry.final_action_date === "U") return "Backlog";
  return "Backlog";
}

export function getEntryChartDate(
  entry: VisaBulletinEntry,
  chartType: VisaChartType,
): VisaBulletinDateValue {
  if (chartType === "finalAction") return entry.final_action_date;
  return entry.filing_date ?? deriveFilingDate(entry.final_action_date);
}

export function getVisaBulletinDataset(): VisaBulletinDataset {
  return raw as VisaBulletinDataset;
}

export function getLatestBulletinEntries(): VisaBulletinEntry[] {
  return getBulletinEntriesFromDataset(getVisaBulletinDataset());
}

export function getBulletinEntriesFromDataset(
  dataset: VisaBulletinDataset,
): VisaBulletinEntry[] {
  const { entries, bulletin_month, bulletin_year } = dataset;
  return entries.filter(
    (entry) => entry.year === bulletin_year && entry.month === bulletin_month,
  );
}

/** Entries for one country tab (filter-first grid). */
export function getEntriesForCountry(
  entries: VisaBulletinEntry[],
  country: VisaBulletinCountry,
): VisaBulletinEntry[] {
  return entries
    .filter((e) => e.country === country)
    .sort(
      (a, b) =>
        VISA_CATEGORIES.indexOf(a.category) - VISA_CATEGORIES.indexOf(b.category),
    );
}

/** One slot per preference category for the selected country (null entry = unavailable). */
export function getCategoryCardsForCountry(
  entries: VisaBulletinEntry[],
  country: VisaBulletinCountry,
): CategoryCard[] {
  return VISA_CATEGORIES.map((category) => ({
    category,
    entry:
      entries.find((e) => e.category === category && e.country === country) ??
      null,
  }));
}

export function getBulletinEntry(
  entries: VisaBulletinEntry[],
  category: VisaCategory,
  country: VisaBulletinCountry,
): VisaBulletinEntry | undefined {
  return entries.find((e) => e.category === category && e.country === country);
}

export function getFinalActionDate(
  entries: VisaBulletinEntry[],
  category: VisaCategory,
  country: VisaBulletinCountry,
): VisaBulletinDateValue | null {
  return getBulletinEntry(entries, category, country)?.final_action_date ?? null;
}

export function getChartDate(
  entries: VisaBulletinEntry[],
  category: VisaCategory,
  country: VisaBulletinCountry,
  chartType: VisaChartType,
): VisaBulletinDateValue | null {
  const entry = getBulletinEntry(entries, category, country);
  if (!entry) return null;
  return getEntryChartDate(entry, chartType);
}
