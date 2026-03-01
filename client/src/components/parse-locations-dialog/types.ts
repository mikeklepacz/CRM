export interface ParsedStore {
  rawText: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
}

export interface MatchedStore {
  parsed: ParsedStore;
  match: {
    name: string;
    link: string;
    city: string;
    state: string;
    address: string;
    phone: string;
  };
  confidence: number;
}

export interface GoogleVerifiedStore {
  parsed: ParsedStore;
  googleResult: {
    place_id: string;
    name: string;
    fullAddress: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    website: string;
    rating?: number;
    user_ratings_total?: number;
  };
}
