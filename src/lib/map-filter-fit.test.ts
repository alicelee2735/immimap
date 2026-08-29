import assert from "node:assert/strict";
import test from "node:test";

import {
  FILTER_FIT_METRO_MIN_ZOOM,
  servicesForFilterFit,
  WIDE_RESULT_STATE_COUNT,
  zoomAfterClosingDetail,
} from "./map-filter-fit";

function pin(
  state: string,
  latitude: number,
  longitude: number,
): { state: string; latitude: number; longitude: number } {
  return { state, latitude, longitude };
}

const sacramento = pin("CA", 38.5816, -121.4944);
const oakland = pin("CA", 37.8044, -122.2712);
const nyc = pin("NY", 40.7128, -74.006);
const chicago = pin("IL", 41.8781, -87.6298);
const houston = pin("TX", 29.7604, -95.3698);
const miami = pin("FL", 25.7617, -80.1918);
const denver = pin("CO", 39.7392, -104.9903);
const seattle = pin("WA", 47.6062, -122.3321);
const boston = pin("MA", 42.3601, -71.0589);
const atlanta = pin("GA", 33.749, -84.388);
const nationwide = [
  sacramento,
  oakland,
  nyc,
  chicago,
  houston,
  miami,
  denver,
  seattle,
  boston,
  atlanta,
];

test("metro-or-tighter zoom frames only nearby pins, not the nationwide set", () => {
  const nearbyKeys = new Set(["38.5816,-121.4944", "37.8044,-122.2712"]);
  const picked = servicesForFilterFit(
    nationwide,
    FILTER_FIT_METRO_MIN_ZOOM,
    (lat, lng) => nearbyKeys.has(`${lat},${lng}`),
  );
  assert.deepEqual(picked, [sacramento, oakland]);
});

test("metro-or-tighter zoom with no nearby matches keeps the camera", () => {
  const picked = servicesForFilterFit(
    nationwide,
    14,
    () => false,
  );
  assert.equal(picked, null);
});

test("zoomed-out nationwide result set keeps the camera (Reset all owns the US view)", () => {
  assert.ok(new Set(nationwide.map((p) => p.state)).size >= WIDE_RESULT_STATE_COUNT);
  const picked = servicesForFilterFit(nationwide, 4, () => true);
  assert.equal(picked, null);
});

test("zoomed-out tight result set is framed so the map can zoom in", () => {
  const picked = servicesForFilterFit([sacramento, oakland], 4, () => true);
  assert.deepEqual(picked, [sacramento, oakland]);
});

test("empty or unplottable results keep the camera instead of jumping to the US", () => {
  assert.equal(servicesForFilterFit([], 4, () => true), null);
  assert.equal(
    servicesForFilterFit([pin("AK", 61.2181, -149.9003)], 4, () => true),
    null,
  );
});

test("closing a street-level detail pulls back to metro, not statewide or US", () => {
  assert.equal(zoomAfterClosingDetail(14), FILTER_FIT_METRO_MIN_ZOOM);
  assert.equal(zoomAfterClosingDetail(12), FILTER_FIT_METRO_MIN_ZOOM);
  assert.equal(zoomAfterClosingDetail(FILTER_FIT_METRO_MIN_ZOOM), null);
  assert.equal(zoomAfterClosingDetail(4), null);
});
