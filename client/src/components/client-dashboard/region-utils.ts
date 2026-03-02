// US States and Canadian Provinces abbreviations to full names mapping
export const REGIONS: Record<string, string> = {
  // US States
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
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
  // Canadian Provinces and Territories
  AA: "Alberta", // Alias for Alberta
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

// Helper function to get full state/province name from abbreviation
export const getStateName = (state: string): string => {
  if (!state) return "";
  const upperState = state.toUpperCase().trim();
  return REGIONS[upperState] || state;
};

// Canadian provinces and territories (full names)
const CANADIAN_PROVINCES = new Set([
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
]);

// Helper function to check if a state/province is Canadian
export const isCanadianProvince = (state: string): boolean => {
  return CANADIAN_PROVINCES.has(state);
};

// Pre-compute normalized set of full state/province names for efficient lookup
const KNOWN_STATE_NAMES_NORMALIZED = new Set(Object.values(REGIONS).map((name) => name.toLowerCase()));

// Helper function to check if a state value is a recognized US state or Canadian province
// This ensures international entries (Sweden, Netherlands) with non-standard state data
// are controlled by the Country filter instead of the State filter
export const isValidStateName = (state: string): boolean => {
  if (!state) return false;
  // Reject any state name that contains numeric digits
  if (/\d/.test(state)) return false;
  // Only accept recognized US states and Canadian provinces
  const trimmed = state.trim();
  const upperState = trimmed.toUpperCase();
  // Check if it's a known abbreviation (key in REGIONS)
  if (REGIONS[upperState]) return true;
  // Check if it's a known full state/province name (case-insensitive)
  return KNOWN_STATE_NAMES_NORMALIZED.has(trimmed.toLowerCase());
};

// Helper function: Case-insensitive lookup for link value
export const getLinkValue = (row: any): string | undefined => {
  if (!row) return undefined;

  // Iterate over all row keys and find the one that matches "link" (case-insensitive)
  for (const key in row) {
    if (key.toLowerCase().trim() === "link") {
      const value = row[key];
      // Return the value if it's a non-empty string
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return undefined;
};
