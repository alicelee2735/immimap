export type USState = "CA" | "TX" | "FL" | "NY" | "NJ";

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
  phone: string;
  website: string;
};

export type ImmigrationService = {
  id: string;
  name: string;
  type: ProviderType;
  state: USState;
  address: string;
  latitude: number;
  longitude: number;
  pricing: PricingLabel;
  services_offered: ServiceOffering[];
  thumbnail_image_url: string;
  phone?: string;
  website?: string;
  description?: string;
};

export type UscisProcessingRow = {
  form_type: string;
  office: string;
  estimated_months: number;
};

export type UscisProcessingDataset = {
  last_updated_iso: string;
  source_disclaimer: string;
  rows: UscisProcessingRow[];
};
