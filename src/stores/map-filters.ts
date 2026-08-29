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

export const ALL_PRICING: PricingTier[] = ["pro_bono", "low_cost", "paid"];

/** Distinct service tags from loaded org rows, sorted for the filter dropdown. */
export function collectServiceTypes(
  services: readonly Pick<ImmigrationService, "services_offered">[],
): ServiceOffering[] {
  const names = new Set<ServiceOffering>();
  for (const service of services) {
    for (const name of service.services_offered) {
      if (name) names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Canonical languages used by the map language filter dropdown. */
export const ALL_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Cantonese",
  "Arabic",
  "French",
  "Haitian Creole",
  "Korean",
  "Portuguese",
  "Vietnamese",
  "Tagalog",
  "Russian",
  "Farsi",
  "Bengali",
  "Burmese",
  "Somali",
] as const;

export type FilterLanguage = (typeof ALL_LANGUAGES)[number];

const PRICING_TO_LABEL: Record<PricingTier, PricingLabel> = {
  pro_bono: "Pro bono",
  low_cost: "Low-cost",
  paid: "Paid",
};

function normalizeMultiSelect<T>(next: T[], all: readonly T[]): T[] {
  if (next.length === 0) return [...all];
  return next;
}

function isFullSelection<T>(selected: readonly T[], all: readonly T[]): boolean {
  return (
    selected.length === all.length && all.every((item) => selected.includes(item))
  );
}

/**
 * Opt-in multi-select: empty means "all" (no restriction).
 * First specific click replaces All; later clicks add or remove.
 * Unchecking the last specific item returns to All.
 */
export function toggleOptInSelection<T>(current: readonly T[], item: T): T[] {
  if (current.length === 0) {
    return [item];
  }
  if (current.includes(item)) {
    return current.filter((entry) => entry !== item);
  }
  return [...current, item];
}

export type MapFiltersState = {
  states: USState[];
  /**
   * Smart multi-select service-type filter — same machine as `languages`.
   * Empty array = "All service types" (no tag restriction).
   * Non-empty = match providers that offer at least one selected tag.
   */
  categories: ServiceCategory[];
  /** Distinct tags currently present on loaded organizations. */
  availableServiceTypes: ServiceCategory[];
  pricingTiers: PricingTier[];
  /**
   * Smart multi-select language filter.
   * Empty array = "All languages" (no language restriction).
   * Non-empty = match providers that offer at least one selected language.
   */
  languages: FilterLanguage[];
  selectedServiceId: string | null;
  hoveredProviderId: string | null;
  /** Bumped by "Reset all" to force a national map overview. */
  nationalFrameToken: number;
  /** Optional explicit bounds request (e.g. state selection). */
  focusBounds: [[number, number], [number, number]] | null;
  focusBoundsToken: number;
  setStates: (states: USState[]) => void;
  setCategories: (categories: ServiceCategory[]) => void;
  setAvailableServiceTypes: (types: ServiceCategory[]) => void;
  setPricingTiers: (pricingTiers: PricingTier[]) => void;
  setLanguages: (languages: FilterLanguage[]) => void;
  clearLanguages: () => void;
  toggleLanguage: (language: FilterLanguage) => void;
  clearCategories: () => void;
  toggleState: (state: USState) => void;
  toggleCategory: (category: ServiceCategory) => void;
  togglePricingTier: (tier: PricingTier) => void;
  /** Resets dropdown filters only; keeps provider selection and hover state. */
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

function defaultFilterFields() {
  return {
    states: [...ALL_STATES] as USState[],
    categories: [] as ServiceCategory[],
    pricingTiers: [...ALL_PRICING] as PricingTier[],
    languages: [] as FilterLanguage[],
  };
}

function defaultFilterSlice() {
  return {
    ...defaultFilterFields(),
    availableServiceTypes: [] as ServiceCategory[],
    selectedServiceId: null as string | null,
    hoveredProviderId: null as string | null,
  };
}

function sameServiceTypes(
  a: readonly ServiceCategory[],
  b: readonly ServiceCategory[],
): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

export function areCategoriesAtDefault(
  selected: readonly ServiceCategory[],
): boolean {
  return selected.length === 0;
}

export const useMapFiltersStore = create<MapFiltersState>((set) => ({
  ...defaultFilterSlice(),
  nationalFrameToken: 0,
  focusBounds: null,
  focusBoundsToken: 0,

  setStates: (states) =>
    set({ states: normalizeMultiSelect(states, ALL_STATES) }),
  setCategories: (categories) => set({ categories }),
  setAvailableServiceTypes: (types) =>
    set((s) => {
      if (sameServiceTypes(s.availableServiceTypes, types)) return s;
      const keepSelection = !areCategoriesAtDefault(s.categories);
      return {
        availableServiceTypes: types,
        categories: keepSelection
          ? s.categories.filter((category) => types.includes(category))
          : [],
      };
    }),
  setPricingTiers: (pricingTiers) =>
    set({ pricingTiers: normalizeMultiSelect(pricingTiers, ALL_PRICING) }),
  setLanguages: (languages) => set({ languages }),
  clearLanguages: () => set({ languages: [] }),
  clearCategories: () => set({ categories: [] }),

  toggleState: (state) =>
    set((s) => {
      const next = s.states.includes(state)
        ? s.states.filter((x) => x !== state)
        : [...s.states, state];
      return { states: normalizeMultiSelect(next, ALL_STATES) };
    }),

  toggleCategory: (category) =>
    set((s) => ({ categories: toggleOptInSelection(s.categories, category) })),

  togglePricingTier: (tier) =>
    set((s) => {
      const next = s.pricingTiers.includes(tier)
        ? s.pricingTiers.filter((x) => x !== tier)
        : [...s.pricingTiers, tier];
      return { pricingTiers: normalizeMultiSelect(next, ALL_PRICING) };
    }),

  toggleLanguage: (language) =>
    set((s) => ({ languages: toggleOptInSelection(s.languages, language) })),

  /** Resets dropdown filters only; keeps provider selection and hover state. */
  resetFilters: () =>
    set(() => defaultFilterFields()),

  /** Full marketplace reset: filters + selection + national map frame. */
  resetAll: () =>
    set((s) => ({
      ...defaultFilterFields(),
      selectedServiceId: null,
      hoveredProviderId: null,
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

export function areLanguagesAtDefault(languages: readonly FilterLanguage[]): boolean {
  return languages.length === 0;
}

export function areFiltersAtDefaults(
  filters: Pick<
    MapFiltersState,
    "states" | "categories" | "availableServiceTypes" | "pricingTiers" | "languages"
  >,
): boolean {
  return (
    isFullSelection(filters.states, ALL_STATES) &&
    areCategoriesAtDefault(filters.categories) &&
    isFullSelection(filters.pricingTiers, ALL_PRICING) &&
    areLanguagesAtDefault(filters.languages)
  );
}

function serviceMatchesLanguages(
  service: ImmigrationService,
  languages: readonly FilterLanguage[],
): boolean {
  if (languages.length === 0) return true;
  const offered = service.languages ?? [];
  if (offered.length === 0) return false;
  const offeredLower = offered.map((item) => item.toLowerCase());
  return languages.some((language) =>
    offeredLower.includes(language.toLowerCase()),
  );
}

export function filterServices(
  services: ImmigrationService[],
  filters: Pick<
    MapFiltersState,
    "states" | "categories" | "availableServiceTypes" | "pricingTiers" | "languages"
  >,
): ImmigrationService[] {
  const categoriesActive = !areCategoriesAtDefault(filters.categories);
  const pricingActive = !isFullSelection(filters.pricingTiers, ALL_PRICING);
  const statesActive = !isFullSelection(filters.states, ALL_STATES);

  return services.filter((s) => {
    if (statesActive && !filters.states.includes(s.state)) return false;

    if (
      categoriesActive &&
      !filters.categories.some((category) =>
        s.services_offered.includes(category),
      )
    ) {
      return false;
    }

    if (
      pricingActive &&
      !filters.pricingTiers.some(
        (tier) => s.pricing === PRICING_TO_LABEL[tier],
      )
    ) {
      return false;
    }

    return serviceMatchesLanguages(s, filters.languages);
  });
}

export function filterServicesByPricing(
  services: ImmigrationService[],
  pricingTiers: PricingTier[],
): ImmigrationService[] {
  if (isFullSelection(pricingTiers, ALL_PRICING) || pricingTiers.length === 0) {
    return services;
  }
  return services.filter((service) =>
    pricingTiers.some((tier) => service.pricing === PRICING_TO_LABEL[tier]),
  );
}
