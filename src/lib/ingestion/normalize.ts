import type {
  UscisProcessingDataset,
  UscisProcessingRow,
  VisaBulletinDataset,
} from "@/types/immimap";

import visaBulletinSeed from "@/data/visa-bulletin.json";
import processingSeed from "@/data/uscis-processing-times.json";

import {
  USCIS_PROCESSING_SOURCE_URL,
  VISA_BULLETIN_SOURCE_URL,
} from "@/lib/ingestion/constants";

export function bulletinMonthLabel(month: number, year: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function currentBulletinMonthLabel(date = new Date()): string {
  return bulletinMonthLabel(date.getUTCMonth() + 1, date.getUTCFullYear());
}

export function getBundledVisaBulletinDataset(): VisaBulletinDataset {
  return visaBulletinSeed as VisaBulletinDataset;
}

export function getBundledProcessingDataset(): UscisProcessingDataset {
  return processingSeed as UscisProcessingDataset;
}

export function normalizeVisaBulletinDataset(
  dataset: VisaBulletinDataset,
): VisaBulletinDataset {
  return {
    ...dataset,
    last_updated_iso: new Date().toISOString(),
    entries: dataset.entries.map((entry) => ({
      ...entry,
      month: dataset.bulletin_month,
      year: dataset.bulletin_year,
    })),
  };
}

export function parseProcessingMonths(value: string): number | null {
  const match = /(\d+(?:\.\d+)?)/.exec(value);
  if (!match) {
    return null;
  }

  const months = Number(match[1]);
  return Number.isFinite(months) ? Math.round(months) : null;
}

type UscisApiCenter = {
  serviceCenter?: string;
  office?: string;
  total?: string;
  months?: string | number;
};

type UscisApiResponse = {
  form?: string;
  processing_time_data?: UscisApiCenter[];
};

export function normalizeProcessingApiRows(
  formType: string,
  payload: UscisApiResponse,
): UscisProcessingRow[] {
  const centers = payload.processing_time_data ?? [];

  return centers
    .map((center) => {
      const office = center.serviceCenter ?? center.office;
      const rawMonths =
        typeof center.months === "number"
          ? String(center.months)
          : (center.total ?? center.months ?? "");

      const estimatedMonths = parseProcessingMonths(String(rawMonths));
      if (!office || estimatedMonths == null) {
        return null;
      }

      return {
        form_type: formType,
        office,
        estimated_months: estimatedMonths,
      };
    })
    .filter((row): row is UscisProcessingRow => row !== null);
}

export function buildProcessingDataset(
  rows: UscisProcessingRow[],
  previousRows: UscisProcessingRow[] = [],
): UscisProcessingDataset {
  const previousByKey = new Map(
    previousRows.map((row) => [`${row.form_type}:${row.office}`, row]),
  );

  const enrichedRows = rows.map((row) => {
    const previous = previousByKey.get(`${row.form_type}:${row.office}`);
    return {
      ...row,
      previous_estimated_months: previous?.estimated_months,
    };
  });

  return {
    last_updated_iso: new Date().toISOString(),
    previous_period_iso: previousRows.length
      ? new Date().toISOString()
      : undefined,
    sync_cadence: "Monthly on the 10th at 06:00 UTC",
    source_url: USCIS_PROCESSING_SOURCE_URL,
    source_disclaimer:
      "Source: U.S. Citizenship and Immigration Services — official processing time estimates by form and adjudication location.",
    rows: enrichedRows,
  };
}
