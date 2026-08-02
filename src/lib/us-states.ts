import type { USState } from "@/types/immimap";

/** English display names for USPS state / DC codes. */
export const US_STATE_NAMES: Record<USState, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** Approximate geographic bounds [SW, NE] as [lat, lng] for Leaflet fitBounds. */
export const CONTINENTAL_US_BOUNDS: [[number, number], [number, number]] = [
  [24.396308, -125.0],
  [49.384358, -66.93457],
];

/** Geographic center of the contiguous United States (approx). */
export const CONTINENTAL_US_CENTER: [number, number] = [39.8283, -98.5795];
export const CONTINENTAL_US_ZOOM = 4;

export const STATE_BOUNDING_BOXES: Record<
  USState,
  [[number, number], [number, number]]
> = {
  AL: [[30.2233, -88.4732], [35.008, -84.8885]],
  AK: [[51.2142, -179.1489], [71.3652, -129.9943]],
  AZ: [[31.3322, -114.8183], [37.0043, -109.0452]],
  AR: [[33.0041, -94.6179], [36.4997, -89.6444]],
  CA: [[32.5343, -124.4152], [42.0095, -114.1312]],
  CO: [[36.9924, -109.0602], [41.0034, -102.0415]],
  CT: [[40.9509, -73.7278], [42.0506, -71.7872]],
  DC: [[38.7916, -77.1198], [38.9951, -76.9094]],
  DE: [[38.451, -75.7887], [39.8395, -75.0484]],
  FL: [[24.3963, -87.6349], [31.001, -80.0314]],
  GA: [[30.3579, -85.6052], [35.0007, -80.8401]],
  HI: [[18.9104, -160.25], [22.23, -154.806]],
  ID: [[41.988, -117.243], [49.0011, -111.0435]],
  IL: [[36.9703, -91.5131], [42.5083, -87.0199]],
  IN: [[37.7717, -88.0979], [41.7606, -84.7846]],
  IA: [[40.3755, -96.6397], [43.5012, -90.1401]],
  KS: [[36.993, -102.0517], [40.0032, -94.5884]],
  KY: [[36.4971, -89.5715], [39.1475, -81.9649]],
  LA: [[28.9286, -94.0431], [33.0195, -88.817]],
  ME: [[43.0578, -71.084], [47.4597, -66.9499]],
  MD: [[37.8866, -79.4877], [39.723, -75.0487]],
  MA: [[41.2371, -73.5081], [42.8868, -69.9289]],
  MI: [[41.6961, -90.4181], [48.3061, -82.1229]],
  MN: [[43.4994, -97.2392], [49.3844, -89.4834]],
  MS: [[30.1739, -91.655], [34.9961, -88.0979]],
  MO: [[35.9957, -95.7747], [40.6136, -89.0988]],
  MT: [[44.3582, -116.0492], [49.0014, -104.0397]],
  NE: [[39.9999, -104.0535], [43.0017, -95.3083]],
  NV: [[35.0019, -120.0065], [42.0022, -114.0396]],
  NH: [[42.697, -72.5572], [45.3055, -70.6101]],
  NJ: [[38.9285, -75.5594], [41.3574, -73.8939]],
  NM: [[31.3322, -109.0502], [37.0002, -103.0019]],
  NY: [[40.4961, -79.7622], [45.0159, -71.8562]],
  NC: [[33.8423, -84.3219], [36.5881, -75.4607]],
  ND: [[45.9351, -104.0489], [49.0007, -96.5545]],
  OH: [[38.4034, -84.8203], [41.9775, -80.5187]],
  OK: [[33.6158, -103.0025], [37.0023, -94.4307]],
  OR: [[41.9918, -124.5662], [46.292, -116.4635]],
  PA: [[39.7198, -80.5199], [42.2693, -74.6895]],
  RI: [[41.146, -71.8628], [42.0188, -71.1205]],
  SC: [[32.0346, -83.3539], [35.2155, -78.5414]],
  SD: [[42.4796, -104.0577], [45.9458, -96.4366]],
  TN: [[34.9829, -90.3103], [36.6781, -81.6469]],
  TX: [[25.8371, -106.6458], [36.5007, -93.5083]],
  UT: [[36.9979, -114.0529], [42.0016, -109.0415]],
  VT: [[42.7269, -73.4379], [45.0167, -71.4646]],
  VA: [[36.5407, -83.6754], [39.466, -75.2423]],
  WA: [[45.5435, -124.8489], [49.0024, -116.9156]],
  WV: [[37.2015, -82.6447], [40.6388, -77.7195]],
  WI: [[42.4919, -92.8881], [47.0808, -86.805]],
  WY: [[40.9947, -111.0569], [45.0058, -104.0521]],
};

export type StateSuggestion = {
  code: USState;
  name: string;
  label: string;
};

export function collectStateSuggestions(
  query: string,
  limit = 6,
): StateSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const matches: StateSuggestion[] = [];

  for (const code of Object.keys(US_STATE_NAMES) as USState[]) {
    const name = US_STATE_NAMES[code];
    const codeLower = code.toLowerCase();
    const nameLower = name.toLowerCase();

    if (
      codeLower === normalized ||
      nameLower.startsWith(normalized) ||
      nameLower.includes(normalized) ||
      (normalized.length === 2 && codeLower === normalized)
    ) {
      matches.push({
        code,
        name,
        label: `${name} (${code})`,
      });
    }
  }

  return matches
    .sort((a, b) => {
      const aExact =
        a.code.toLowerCase() === normalized ||
        a.name.toLowerCase() === normalized
          ? 0
          : 1;
      const bExact =
        b.code.toLowerCase() === normalized ||
        b.name.toLowerCase() === normalized
          ? 0
          : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
