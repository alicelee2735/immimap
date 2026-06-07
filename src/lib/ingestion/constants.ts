export const VISA_BULLETIN_SOURCE_URL =
  "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html";

export const VISA_BULLETIN_OFFICIAL_PDF_BASE =
  "https://travel.state.gov/content/dam/visas/Bulletins/visabulletin";

export const USCIS_PROCESSING_SOURCE_URL =
  "https://egov.uscis.gov/processing-times/";

export const USCIS_PROCESSING_API_BASE =
  "https://egov.uscis.gov/processing-times/api/processingtime/form";

export const USCIS_FORMS_TO_SYNC = [
  "I-485",
  "I-130",
  "I-765",
  "I-131",
  "N-400",
  "I-589",
  "I-821",
] as const;

export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
