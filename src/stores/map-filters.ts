import { create } from "zustand";
import type {
  ImmigrationService,
  PricingLabel,
  PricingTier,
  ServiceCategory,
  ServiceOffering,
  USState,
} from "@/types/immimap";

export const ALL_STATES: USState[] = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DC",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];
const ALL_CATEGORIES: ServiceCategory[] = [
  "asylum",
  "family",
  "daca",
  "employment",
];
const ALL_PRICING: PricingTier[] = ["pro_bono", "low_cost", "paid"];

const CATEGORY_TO_OFFERING: Record<ServiceCategory, ServiceOffering> = {
  asylum: "Asylum",
  family: "Family",
  daca: "DACA",
  employment: "Employment",
};

const PRICING_TO_LABEL: Record<PricingTier, PricingLabel> = {
  pro_bono: "Pro bono",
  low_cost: "Low-cost",
  paid: "Paid",
};

export type MapFiltersState = {
  states: USState[];
  categories: ServiceCategory[];
  pricingTiers: PricingTier[];
  selectedServiceId: string | null;
  hoveredProviderId: string | null;
  /** Bumped by "Reset all" to force a national map overview. */
  nationalFrameToken: number;
  /** Optional explicit bounds request (e.g. state selection). */
  focusBounds: [[number, number], [number, number]] | null;
  focusBoundsToken: number;
  setStates: (states: USState[]) => void;
  setCategories: (categories: ServiceCategory[]) => void;
  setPricingTiers: (pricingTiers: PricingTier[]) => void;
  toggleState: (state: USState) => void;
  toggleCategory: (category: ServiceCategory) => void;
  togglePricingTier: (tier: PricingTier) => void;
  resetFilters: () => void;
  /** Full marketplace reset: filters + selection + national map frame. */
  resetAll: () => void;
  requestNationalFrame: () => void;
  requestFocusBounds: (
    bounds: [[number, number], [number, number]],
  ) => void;
  clearFocusBounds: () => void;
  selectService: (id: string | null) => void;
  setHoveredProviderId: (id: string | null) => void;
};

function defaultFilterSlice() {
  return {
    states: [...ALL_STATES] as USState[],
    categories: [...ALL_CATEGORIES] as ServiceCategory[],
    pricingTiers: [...ALL_PRICING] as PricingTier[],
    selectedServiceId: null as string | null,
    hoveredProviderId: null as string | null,
  };
}

export const useMapFiltersStore = create<MapFiltersState>((set) => ({
  ...defaultFilterSlice(),
  nationalFrameToken: 0,
  focusBounds: null,
  focusBoundsToken: 0,

  setStates: (states) => set({ states }),
  setCategories: (categories) => set({ categories }),
  setPricingTiers: (pricingTiers) => set({ pricingTiers }),

  toggleState: (state) =>
    set((s) => {
      const next = s.states.includes(state)
        ? s.states.filter((x) => x !== state)
        : [...s.states, state];
      return { states: next };
    }),

  toggleCategory: (category) =>
    set((s) => {
      const next = s.categories.includes(category)
        ? s.categories.filter((x) => x !== category)
        : [...s.categories, category];
      return { categories: next };
    }),

  togglePricingTier: (tier) =>
    set((s) => {
      const next = s.pricingTiers.includes(tier)
        ? s.pricingTiers.filter((x) => x !== tier)
        : [...s.pricingTiers, tier];
      return { pricingTiers: next };
    }),

  resetFilters: () => set({ ...defaultFilterSlice() }),

  resetAll: () =>
    set((s) => ({
      ...defaultFilterSlice(),
      focusBounds: null,
      nationalFrameToken: s.nationalFrameToken + 1,
    })),

  requestNationalFrame: () =>
    set((s) => ({
      focusBounds: null,
      nationalFrameToken: s.nationalFrameToken + 1,
    })),

  requestFocusBounds: (bounds) =>
    set((s) => ({
      selectedServiceId: null,
      focusBounds: bounds,
      focusBoundsToken: s.focusBoundsToken + 1,
    })),

  clearFocusBounds: () => set({ focusBounds: null }),

  selectService: (id) => set({ selectedServiceId: id }),
  setHoveredProviderId: (id) =>
    set((state) =>
      state.hoveredProviderId === id ? state : { hoveredProviderId: id },
    ),
}));

export function areFiltersAtDefaults(
  filters: Pick<MapFiltersState, "states" | "categories" | "pricingTiers">,
): boolean {
  return (
    filters.states.length === ALL_STATES.length &&
    ALL_STATES.every((state) => filters.states.includes(state)) &&
    filters.categories.length === ALL_CATEGORIES.length &&
    ALL_CATEGORIES.every((category) => filters.categories.includes(category)) &&
    filters.pricingTiers.length === ALL_PRICING.length &&
    ALL_PRICING.every((tier) => filters.pricingTiers.includes(tier))
  );
}

export function filterServices(
  services: ImmigrationService[],
  filters: Pick<MapFiltersState, "states" | "categories" | "pricingTiers">,
): ImmigrationService[] {
  return services.filter(
    (s) =>
      filters.states.includes(s.state) &&
      filters.categories.some((category) =>
        s.services_offered.includes(CATEGORY_TO_OFFERING[category]),
      ) &&
      filters.pricingTiers.some(
        (tier) => s.pricing === PRICING_TO_LABEL[tier],
      ),
  );
}

export function filterServicesByPricing(
  services: ImmigrationService[],
  pricingTiers: PricingTier[],
): ImmigrationService[] {
  return services.filter((service) =>
    pricingTiers.some((tier) => service.pricing === PRICING_TO_LABEL[tier]),
  );
}
