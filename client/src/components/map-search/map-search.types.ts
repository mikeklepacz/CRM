export interface PlaceResult {
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
  website?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface SavedExclusion {
  id: string;
  type: "keyword" | "place_type";
  value: string;
  createdAt: string;
}

export interface SearchHistory {
  id: string;
  businessType: string;
  city: string;
  state: string;
  country: string;
  searchCount: number;
  searchedAt: string;
}

export interface LastSearchParams {
  query: string;
  location: string;
  excludedKeywords: string[];
  excludedTypes: string[];
  category?: string;
  projectId?: string;
}

export interface GoogleSheet {
  id: string;
  sheetPurpose: string;
  spreadsheetId: string;
  sheetName?: string;
  spreadsheetName?: string;
}
