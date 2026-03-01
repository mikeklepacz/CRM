import type { PlaceResult, SavedExclusion } from "@/components/map-search/map-search.types";

export const parseCityState = (address: string) => {
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || "";
    const stateZip = parts[parts.length - 2] || "";
    const stateParts = stateZip.split(" ");
    const state = stateParts[0] || "";
    return { city, state };
  }
  return { city: "", state: "" };
};

export const getBusinessLink = (place: PlaceResult) => {
  if (place.website) {
    return place.website;
  }
  return `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
};

const normalizeUrl = (url: string): string => {
  if (!url) return "";
  let normalized = url.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^www\./, "");
  normalized = normalized.replace(/\/$/, "");
  return normalized;
};

export const isWebsiteDuplicate = (website: string | undefined, duplicateWebsites: Set<string>): boolean => {
  if (!website || duplicateWebsites.size === 0) return false;
  const normalized = normalizeUrl(website);
  for (const duplicateUrl of duplicateWebsites) {
    if (normalizeUrl(duplicateUrl) === normalized) return true;
  }
  return false;
};

export const getSortedExclusionValues = (
  exclusions: SavedExclusion[] | undefined,
  type: "keyword" | "place_type",
): string[] => {
  return (exclusions || [])
    .filter((entry) => entry.type === type)
    .map((entry) => entry.value)
    .sort();
};

interface GetFilteredResultsProps {
  activeKeywords: string[];
  duplicateWebsites: Set<string>;
  hideClosedBusinesses: boolean;
  hideDuplicates: boolean;
  searchResults: PlaceResult[];
}

export const getFilteredResults = (props: GetFilteredResultsProps): PlaceResult[] => {
  return props.searchResults
    .filter((place) => !props.hideClosedBusinesses || place.business_status === "OPERATIONAL")
    .filter((place) => !props.activeKeywords.some((keyword) => place.name.toLowerCase().includes(keyword)))
    .filter((place) => !props.hideDuplicates || !isWebsiteDuplicate(place.website, props.duplicateWebsites));
};

export const getDuplicatesInResultsCount = (searchResults: PlaceResult[], duplicateWebsites: Set<string>): number => {
  return searchResults.filter((place) => isWebsiteDuplicate(place.website, duplicateWebsites)).length;
};

interface GetHiddenByKeywordFiltersProps {
  duplicatesInResults: number;
  filteredResults: PlaceResult[];
  hideClosedBusinesses: boolean;
  hideDuplicates: boolean;
  searchResults: PlaceResult[];
}

export const getHiddenByKeywordFilters = (props: GetHiddenByKeywordFiltersProps): number => {
  const resultsWithoutClosedFilter = props.searchResults.filter(
    (place) => !props.hideClosedBusinesses || place.business_status === "OPERATIONAL",
  );

  return resultsWithoutClosedFilter.length - props.filteredResults.length - (props.hideDuplicates ? props.duplicatesInResults : 0);
};

export const getCountryOptions = (country: string, baseCountries: string[]): string[] => {
  return country && !baseCountries.includes(country) ? [country, ...baseCountries] : baseCountries;
};
