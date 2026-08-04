export type USState =
  | "AL"
  | "AK"
  | "AZ"
  | "AR"
  | "CA"
  | "CO"
  | "CT"
  | "DC"
  | "DE"
  | "FL"
  | "GA"
  | "HI"
  | "ID"
  | "IL"
  | "IN"
  | "IA"
  | "KS"
  | "KY"
  | "LA"
  | "ME"
  | "MD"
  | "MA"
  | "MI"
  | "MN"
  | "MS"
  | "MO"
  | "MT"
  | "NE"
  | "NV"
  | "NH"
  | "NJ"
  | "NM"
  | "NY"
  | "NC"
  | "ND"
  | "OH"
  | "OK"
  | "OR"
  | "PA"
  | "RI"
  | "SC"
  | "SD"
  | "TN"
  | "TX"
  | "UT"
  | "VT"
  | "VA"
  | "WA"
  | "WV"
  | "WI"
  | "WY";

export type ServiceCategory =
  | "asylum"
  | "family"
  | "daca"
  | "employment";

export type PricingTier = "pro_bono" | "low_cost" | "paid";
export type ProviderType = "NGO" | "Law Firm";
export type PricingLabel = "Pro bono" | "Low-cost" | "Paid";
export type ServiceOffering =
  | "Asylum"
  | "Family"
  | "DACA"
  | "Employment"
  | "Citizenship"
  | "Removal Defense"
  | "Humanitarian Relief"
  | "TPS";

export type ContactInfo = {
  address: string;
  website: string;
};

export type IntakeStatus = "OPEN" | "LIMITED" | "WAITLISTED";

export type ImmigrationService = {
  id: string;
  /** Supabase organizations.id when loaded from the database. */
  dbId?: string;
  name: string;
  type: ProviderType;
  state: USState;
  /** City name from the organization record (falls back to address parsing when absent). */
  city?: string;
  address: string;
  latitude: number;
  longitude: number;
  pricing: PricingLabel;
  services_offered: ServiceOffering[];
  thumbnail_image_url: string;
  website?: string;
  /**
   * Whether the website link is known to work.
   * false = hide link / show unavailable message; undefined/true = treat as usable.
   */
  isWebsiteActive?: boolean;
  description?: string;
  /** Intake availability signal. Drives the real-time status indicator. */
  intakeStatus?: IntakeStatus;
  /** Languages in which staff can provide direct assistance. */
  languages?: string[];
  /** Catchment note shown if user falls outside service region. */
  catchmentNote?: string;
};

export type UscisProcessingRow = {
  form_type: string;
  office: string;
  estimated_months: number;
  /** Previous-period snapshot used to compute velocity delta. */
  previous_estimated_months?: number;
};

export type UscisProcessingDataset = {
  last_updated_iso: string;
  previous_period_iso?: string;
  sync_cadence?: string;
  source_url?: string;
  source_disclaimer: string;
  rows: UscisProcessingRow[];
};

// ── Visa Bulletin ─────────────────────────────────────────────────────────────

export type VisaCategory =
  | "F1" | "F2A" | "F2B" | "F3" | "F4"
  | "EB1" | "EB2" | "EB3" | "EB4" | "EB5";

export type VisaBulletinCountry =
  | "All Chargeability"
  | "CHINA"
  | "INDIA"
  | "PHILIPPINES";

export type VisaBulletinDateValue = string | "C" | "U";

export type VisaBulletinStatus = "Backlog" | "Current";

export type VisaChartType = "finalAction" | "filing";

export type VisaBulletinEntry = {
  month: number;
  year: number;
  category: VisaCategory;
  country: VisaBulletinCountry;
  /**
   * ISO date string (YYYY-MM-DD), "C" = Current (no backlog),
   * or "U" = Unavailable (no visas available).
   */
  final_action_date: VisaBulletinDateValue;
  /** Official bulletin status taxonomy. */
  status?: VisaBulletinStatus;
  /** Dates for Filing chart; derived from final_action_date when omitted. */
  filing_date?: VisaBulletinDateValue;
};

export type VisaBulletinDataset = {
  last_updated_iso: string;
  bulletin_month: number;
  bulletin_year: number;
  entries: VisaBulletinEntry[];
};

// ── Embassies ─────────────────────────────────────────────────────────────────

export type Embassy = {
  id: string;
  name: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  /** Average visa interview wait time in calendar days. */
  avg_interview_wait_days: number;
};
