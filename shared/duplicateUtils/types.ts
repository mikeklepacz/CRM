export interface StoreRecord {
  Link: string;
  Name: string;
  Phone?: string;
  Address?: string;
  [key: string]: any;
}

export interface DuplicateGroup {
  stores: StoreRecord[];
  reason: string;
  similarity: number;
}

export interface StatusHierarchy {
  [statusName: string]: number;
}
