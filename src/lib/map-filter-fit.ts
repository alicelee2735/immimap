/**
 * Camera policy for map filter toggles vs. Reset all.
 *
 * Reset all (nationalFrameToken) is the only path that should show the
 * continental US. Individual filter changes (service type, price, language)
 * may refit the new result set, but never zoom out past city/metro — and
 * when the user is already at metro-or-tighter, only pins in/near the
 * current view are considered so Sacramento doesn't jump to 927 nationwide
 * providers.
 */

/** OSM zoom: ~city / large metro. Filter refits must not zoom out past this. */
export const FILTER_FIT_METRO_MIN_ZOOM = 9;

/**
 * Result sets spanning this many states are treated as nationwide.
 * Matching the previous fitServicesBounds threshold.
 */
export const WIDE_RESULT_STATE_COUNT = 8;

export type FilterFitPin = {
  state: string;
  latitude: number;
  longitude: number;
};

function hasPlottableLower48Coords(pin: FilterFitPin): boolean {
  const lat = Number(pin.latitude);
  const lng = Number(pin.longitude);
  return (
    pin.state !== "AK" &&
    pin.state !== "HI" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= 24 &&
    lat <= 50 &&
    lng >= -125 &&
    lng <= -66
  );
}

export function lower48FilterFitPins<T extends FilterFitPin>(pins: readonly T[]): T[] {
  return pins.filter(hasPlottableLower48Coords);
}

/**
 * Which pins a filter-driven refit should frame.
 * `null` means leave the camera where it is (do not jump to the US).
 */
export function servicesForFilterFit<T extends FilterFitPin>(
  pins: readonly T[],
  currentZoom: number,
  isNearby: (lat: number, lng: number) => boolean,
): T[] | null {
  const lower48 = lower48FilterFitPins(pins);
  if (lower48.length === 0) return null;

  if (currentZoom >= FILTER_FIT_METRO_MIN_ZOOM) {
    const nearby = lower48.filter((pin) =>
      isNearby(Number(pin.latitude), Number(pin.longitude)),
    );
    return nearby.length > 0 ? nearby : null;
  }

  const states = new Set(lower48.map((pin) => pin.state));
  if (states.size >= WIDE_RESULT_STATE_COUNT) return null;
  return lower48;
}

/**
 * When leaving a single-org detail at street zoom, pull back to city/metro
 * so nearby pins are tappable. Returns `null` when the camera is already at
 * or wider than metro (do not jump out to state/national).
 */
export function zoomAfterClosingDetail(currentZoom: number): number | null {
  if (currentZoom > FILTER_FIT_METRO_MIN_ZOOM) {
    return FILTER_FIT_METRO_MIN_ZOOM;
  }
  return null;
}
