import { unstable_cache } from "next/cache";

import {
  bulletinMonthLabel,
  buildProcessingDataset,
  getBundledProcessingDataset,
  getBundledVisaBulletinDataset,
} from "@/lib/ingestion/normalize";
import {
  USCIS_PROCESSING_SOURCE_URL,
  VISA_BULLETIN_SOURCE_URL,
} from "@/lib/ingestion/constants";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabaseClient";
import type {
  OfficialDataRecord,
  OfficialDataType,
  SyncStatusSnapshot,
} from "@/types/database.types";
import type {
  UscisProcessingDataset,
  UscisProcessingRow,
  VisaBulletinDataset,
} from "@/types/immimap";

const CACHE_SECONDS = 86400;

type OfficialDataResponse<T> = {
  record: OfficialDataRecord | null;
  content: T;
  stale: boolean;
  fromFallback: boolean;
};

function mapRecord(row: {
  id: string;
  source_url: string;
  bulletin_month: string;
  data_type: string;
  content: unknown;
  updated_at: string;
}): OfficialDataRecord {
  return {
    id: row.id,
    source_url: row.source_url,
    bulletin_month: row.bulletin_month,
    data_type: row.data_type as OfficialDataType,
    content: row.content,
    updated_at: row.updated_at,
  };
}

const SUPABASE_FETCH_TIMEOUT_MS = 4_000;

async function fetchLatestRecord(
  dataType: OfficialDataType,
): Promise<OfficialDataRecord | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const query = getSupabaseAdminClient()
      .from("official_data_store")
      .select("*")
      .eq("data_type", dataType)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const result = await Promise.race([
      query,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), SUPABASE_FETCH_TIMEOUT_MS);
      }),
    ]);

    if (!result) {
      return null;
    }

    const { data, error } = result;
    if (error) {
      console.warn(`Supabase fetch failed for ${dataType}:`, error.message);
      return null;
    }

    return data ? mapRecord(data) : null;
  } catch (error) {
    console.warn(`Supabase fetch failed for ${dataType}:`, error);
    return null;
  }
}

function isRecordStale(updatedAt: string, maxAgeDays: number): boolean {
  const updated = new Date(updatedAt).getTime();
  const ageMs = Date.now() - updated;
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

async function getVisaBulletinDataUncached(): Promise<
  OfficialDataResponse<VisaBulletinDataset>
> {
  const record = await fetchLatestRecord("visa_bulletin");

  if (record) {
    return {
      record,
      content: record.content as VisaBulletinDataset,
      stale: isRecordStale(record.updated_at, 40),
      fromFallback: false,
    };
  }

  const bundled = getBundledVisaBulletinDataset();
  return {
    record: {
      id: "bundled",
      source_url: VISA_BULLETIN_SOURCE_URL,
      bulletin_month: bulletinMonthLabel(
        bundled.bulletin_month,
        bundled.bulletin_year,
      ),
      data_type: "visa_bulletin",
      content: bundled,
      updated_at: bundled.last_updated_iso,
    },
    content: bundled,
    stale: false,
    fromFallback: true,
  };
}

async function getProcessingTimesDataUncached(): Promise<
  OfficialDataResponse<UscisProcessingDataset>
> {
  const record = await fetchLatestRecord("processing_times");

  if (record) {
    return {
      record,
      content: record.content as UscisProcessingDataset,
      stale: isRecordStale(record.updated_at, 14),
      fromFallback: false,
    };
  }

  const bundled = getBundledProcessingDataset();
  return {
    record: {
      id: "bundled",
      source_url: USCIS_PROCESSING_SOURCE_URL,
      bulletin_month: new Date(bundled.last_updated_iso).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      data_type: "processing_times",
      content: bundled,
      updated_at: bundled.last_updated_iso,
    },
    content: bundled,
    stale: false,
    fromFallback: true,
  };
}

export const getCachedVisaBulletinData = unstable_cache(
  getVisaBulletinDataUncached,
  ["official-data", "visa_bulletin"],
  { revalidate: CACHE_SECONDS },
);

export const getCachedProcessingTimesData = unstable_cache(
  getProcessingTimesDataUncached,
  ["official-data", "processing_times"],
  { revalidate: CACHE_SECONDS },
);

export async function upsertOfficialData(input: {
  sourceUrl: string;
  bulletinMonth: string;
  dataType: OfficialDataType;
  content: unknown;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("official_data_store").upsert(
    {
      source_url: input.sourceUrl,
      bulletin_month: input.bulletinMonth,
      data_type: input.dataType,
      content: input.content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "data_type,bulletin_month" },
  );

  if (error) {
    throw error;
  }
}

export async function logIngestionRun(input: {
  status: "success" | "failed";
  errorMessage?: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("data_ingestion_log").insert({
    status: input.status,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function getSyncStatusSnapshot(): Promise<SyncStatusSnapshot> {
  if (!isSupabaseConfigured()) {
    return {
      isSyncing: false,
      lastRunAt: null,
      lastStatus: null,
      lastError: null,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
      visaBulletinUpdatedAt: null,
      processingTimesUpdatedAt: null,
    };
  }

  const supabase = getSupabaseAdminClient();

  const [logsResult, visaResult, processingResult] = await Promise.all([
    supabase
      .from("data_ingestion_log")
      .select("status, error_message, ran_at")
      .order("ran_at", { ascending: false })
      .limit(10),
    supabase
      .from("official_data_store")
      .select("updated_at")
      .eq("data_type", "visa_bulletin")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("official_data_store")
      .select("updated_at")
      .eq("data_type", "processing_times")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const logs = logsResult.data ?? [];
  const lastLog = logs[0] ?? null;

  let consecutiveFailures = 0;
  for (const log of logs) {
    if (log.status === "failed") {
      consecutiveFailures += 1;
      continue;
    }
    break;
  }

  const recentRun = lastLog?.ran_at
    ? Date.now() - new Date(lastLog.ran_at).getTime() < 5 * 60 * 1000
    : false;

  return {
    isSyncing: recentRun && lastLog?.status === "failed",
    lastRunAt: lastLog?.ran_at ?? null,
    lastStatus: (lastLog?.status as SyncStatusSnapshot["lastStatus"]) ?? null,
    lastError: lastLog?.error_message ?? null,
    consecutiveFailures,
    circuitBreakerOpen: consecutiveFailures >= 3,
    visaBulletinUpdatedAt: visaResult.data?.updated_at ?? null,
    processingTimesUpdatedAt: processingResult.data?.updated_at ?? null,
  };
}

export async function getPreviousProcessingRows(): Promise<
  UscisProcessingRow[]
> {
  const record = await fetchLatestRecord("processing_times");
  if (!record) {
    return [];
  }

  const dataset = record.content as UscisProcessingDataset;
  return dataset.rows;
}
