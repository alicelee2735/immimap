import { maybeTriggerCircuitBreakerAlert } from "@/lib/ingestion/alerts";
import {
  fetchProcessingTimesFromSource,
  fetchVisaBulletinFromSource,
} from "@/lib/ingestion/fetchers";
import {
  bulletinMonthLabel,
  buildProcessingDataset,
  currentBulletinMonthLabel,
  getBundledProcessingDataset,
  getBundledVisaBulletinDataset,
} from "@/lib/ingestion/normalize";
import {
  getPreviousProcessingRows,
  getSyncStatusSnapshot,
  logIngestionRun,
  upsertOfficialData,
} from "@/lib/official-data";
import { VISA_BULLETIN_SOURCE_URL } from "@/lib/ingestion/constants";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export type SyncDataResult = {
  ok: boolean;
  visaBulletin: "updated" | "skipped" | "seeded";
  processingTimes: "updated" | "skipped" | "seeded";
  errors: string[];
};

async function hasOfficialData(dataType: "visa_bulletin" | "processing_times") {
  const status = await getSyncStatusSnapshot();
  if (dataType === "visa_bulletin") {
    return Boolean(status.visaBulletinUpdatedAt);
  }
  return Boolean(status.processingTimesUpdatedAt);
}

export async function syncOfficialData(): Promise<SyncDataResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const errors: string[] = [];
  let visaBulletin: SyncDataResult["visaBulletin"] = "skipped";
  let processingTimes: SyncDataResult["processingTimes"] = "skipped";

  const visaFetch = await fetchVisaBulletinFromSource();
  if (visaFetch.ok) {
    const bulletinMonth = bulletinMonthLabel(
      visaFetch.data.bulletin_month,
      visaFetch.data.bulletin_year,
    );

    await upsertOfficialData({
      sourceUrl: visaFetch.sourceUrl,
      bulletinMonth,
      dataType: "visa_bulletin",
      content: visaFetch.data,
    });
    visaBulletin = "updated";
  } else if (!(await hasOfficialData("visa_bulletin"))) {
    const bundled = getBundledVisaBulletinDataset();
    const bulletinMonth = bulletinMonthLabel(
      bundled.bulletin_month,
      bundled.bulletin_year,
    );

    await upsertOfficialData({
      sourceUrl: VISA_BULLETIN_SOURCE_URL,
      bulletinMonth,
      dataType: "visa_bulletin",
      content: bundled,
    });
    visaBulletin = "seeded";
    errors.push(`Visa bulletin live fetch failed; seeded bundled data. ${visaFetch.error}`);
  } else {
    errors.push(`Visa bulletin sync skipped: ${visaFetch.error}`);
  }

  const processingFetch = await fetchProcessingTimesFromSource();
  if (processingFetch.ok) {
    const previousRows = await getPreviousProcessingRows();
    const dataset = buildProcessingDataset(processingFetch.data, previousRows);

    await upsertOfficialData({
      sourceUrl: processingFetch.sourceUrl,
      bulletinMonth: currentBulletinMonthLabel(),
      dataType: "processing_times",
      content: dataset,
    });
    processingTimes = "updated";
  } else if (!(await hasOfficialData("processing_times"))) {
    const bundled = getBundledProcessingDataset();
    await upsertOfficialData({
      sourceUrl: bundled.source_url ?? processingFetch.error,
      bulletinMonth: currentBulletinMonthLabel(),
      dataType: "processing_times",
      content: bundled,
    });
    processingTimes = "seeded";
    errors.push(
      `Processing times live fetch failed; seeded bundled data. ${processingFetch.error}`,
    );
  } else {
    errors.push(`Processing times sync skipped: ${processingFetch.error}`);
  }

  const ok =
    visaBulletin !== "skipped" ||
    processingTimes !== "skipped" ||
    errors.length === 0;

  if (ok && errors.length === 0) {
    await logIngestionRun({ status: "success" });
  } else if (visaBulletin === "skipped" && processingTimes === "skipped") {
    const message = errors.join(" | ");
    await logIngestionRun({ status: "failed", errorMessage: message });

    const status = await getSyncStatusSnapshot();
    await maybeTriggerCircuitBreakerAlert(
      status.consecutiveFailures,
      message,
    );
  } else {
    await logIngestionRun({
      status: "success",
      errorMessage: errors.length > 0 ? errors.join(" | ") : undefined,
    });
  }

  return {
    ok: visaBulletin !== "skipped" || processingTimes !== "skipped",
    visaBulletin,
    processingTimes,
    errors,
  };
}
