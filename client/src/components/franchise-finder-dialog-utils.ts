import type { StoreData } from "@shared/franchiseUtils";

const canadianProvinces = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Northwest Territories",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

export const isCanadianProvince = (state: string) => {
  return canadianProvinces.includes(state);
};

export const buildStateCounts = (stores: StoreData[]) => {
  const counts: Record<string, number> = {};
  stores.forEach((store) => {
    if (store.State) {
      counts[store.State] = (counts[store.State] || 0) + 1;
    }
  });
  return counts;
};
