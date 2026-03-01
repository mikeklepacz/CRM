export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  business_status?: string;
  types: string[];
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface PlaceSearchResponse {
  results: PlaceSearchResult[];
  nextPageToken?: string;
}

export interface ReverseGeocodeResult {
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export interface GeoBounds {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface GeocodeBoundsResult {
  bounds: GeoBounds;
  center: { lat: number; lng: number };
  formattedAddress: string;
  locationType: string;
}

export interface GridZone {
  center: { lat: number; lng: number };
  index: number;
}

export interface GridSearchProgress {
  currentZone: number;
  totalZones: number;
  resultsFound: number;
}

export interface GridSearchResponse {
  results: PlaceSearchResult[];
  totalZones: number;
  duplicatesRemoved: number;
}
