export type SyncResult = {
  total?: number;
  synced?: number;
  matched?: number;
  commissionsCalculated?: number;
  message?: string;
};

export type StoreSelection = {
  link: string;
  name: string;
};

export type ConflictItem = {
  orderNumber: string;
  link: string;
  newAgent: string;
  existingAgent: string;
};

export type WooOrder = {
  id: string;
  orderNumber: string;
  orderDate: string;
  billingEmail?: string;
  billingCompany?: string;
  salesAgentName?: string;
  status: string;
  total: string;
  clientId?: string;
  hasTrackerRows?: boolean;
  commissionType?: string;
  commissionAmount?: string;
};

export type MatchSuggestion = {
  link: string;
  displayName: string;
  displayInfo?: string;
  reasons: string[];
  score: number;
};

export type MatchSuggestionsResponse = {
  suggestions?: MatchSuggestion[];
  matchedStoreLinks?: string[];
};

export type WooSettings = {
  lastSyncedAt?: string;
};
