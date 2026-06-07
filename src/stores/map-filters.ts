import { create } from "zustand";
import type {
  ImmigrationService,
  PricingLabel,
  PricingTier,
  ServiceCategory,
  ServiceOffering,
  USState,
} from "@/types/immimap";

const ALL_STATES: USState[] = ["CA", "TX", "FL", "NY", "NJ"];
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
  setStates: (states: USState[]) => void;
  setCategories: (categories: ServiceCategory[]) => void;
  setPricingTiers: (pricingTiers: PricingTier[]) => void;
  toggleState: (state: USState) => void;
  toggleCategory: (category: ServiceCategory) => void;
  togglePricingTier: (tier: PricingTier) => void;
  resetFilters: () => void;
  selectService: (id: string | null) => void;
  setHoveredProviderId: (id: string | null) => void;
};

export const useMapFiltersStore = create<MapFiltersState>((set) => ({
  states: [...ALL_STATES],
  categories: [...ALL_CATEGORIES],
  pricingTiers: [...ALL_PRICING],
  selectedServiceId: null,
  hoveredProviderId: null,

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

  resetFilters: () =>
    set({
      states: [...ALL_STATES],
      categories: [...ALL_CATEGORIES],
      pricingTiers: [...ALL_PRICING],
    }),

  selectService: (id) => set({ selectedServiceId: id }),
  setHoveredProviderId: (id) =>
    set((state) =>
      state.hoveredProviderId === id ? state : { hoveredProviderId: id },
    ),
}));

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
