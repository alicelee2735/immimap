import assert from "node:assert/strict";
import test from "node:test";

const ALL_PRICING = ["pro_bono", "low_cost", "paid"];
const ALL_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function isFullSelection(selected, all) {
  return (
    selected.length === all.length &&
    all.every((value) => selected.includes(value))
  );
}

function areCategoriesAtDefault(selected) {
  return selected.length === 0;
}

function areFiltersAtDefaults(filters) {
  return (
    isFullSelection(filters.states, ALL_STATES) &&
    areCategoriesAtDefault(filters.categories) &&
    isFullSelection(filters.pricingTiers, ALL_PRICING) &&
    filters.languages.length === 0
  );
}

function shouldShowResetAll({ searchActive, filters, selectedServiceId }) {
  const filtersDefault = areFiltersAtDefaults(filters);
  // Provider selection must not affect reset visibility.
  void selectedServiceId;
  return searchActive || !filtersDefault;
}

const defaultFilters = {
  states: [...ALL_STATES],
  categories: [],
  availableServiceTypes: [
    "Asylum",
    "Citizenship",
    "DACA",
    "Employment",
    "Family",
    "Humanitarian Relief",
    "Removal Defense",
    "TPS",
  ],
  pricingTiers: [...ALL_PRICING],
  languages: [],
};

test("Reset all hidden when only a provider is selected", () => {
  assert.equal(
    shouldShowResetAll({
      searchActive: false,
      filters: defaultFilters,
      selectedServiceId: "provider-123",
    }),
    false,
  );
});

test("Reset all visible when a filter deviates from defaults", () => {
  assert.equal(
    shouldShowResetAll({
      searchActive: false,
      filters: {
        ...defaultFilters,
        categories: ["Asylum"],
      },
      selectedServiceId: null,
    }),
    true,
  );
});

test("Reset all visible when search is active", () => {
  assert.equal(
    shouldShowResetAll({
      searchActive: true,
      filters: defaultFilters,
      selectedServiceId: null,
    }),
    true,
  );
});
