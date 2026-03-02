import { StoreRecord } from "@shared/duplicateUtils";

export function getCityState(store: StoreRecord): string {
  if (store.City && store.State) {
    return `${store.City}, ${store.State}`;
  }
  if (store.Address) {
    const parts = store.Address.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      const stateZip = parts[parts.length - 1];
      const state = stateZip.split(" ")[0];
      return `${city}, ${state}`;
    }
  }
  return "";
}

export function isCanadianProvince(state: string): boolean {
  const canadianProvinces = [
    "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Nova Scotia", "Northwest Territories", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon",
  ];
  return canadianProvinces.includes(state);
}
