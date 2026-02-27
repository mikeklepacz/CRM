import type {
  UserPreferences,
  SearchHistory,
  SavedExclusion,
  InsertSavedExclusion,
} from "./shared-types";

export interface MapSearchStorageContract {
  // Imported Places operations
  checkImportedPlaces(placeIds: string[]): Promise<Set<string>>;
  recordImportedPlace(placeId: string, tenantId: string): Promise<void>;

  // Search History operations
  getAllSearchHistory(): Promise<SearchHistory[]>;
  recordSearch(tenantId: string, businessType: string, city: string, state: string, country: string, excludedKeywords?: string[], excludedTypes?: string[], category?: string): Promise<SearchHistory>;
  deleteSearchHistory(id: string): Promise<void>;

  // Saved Exclusions operations
  getAllSavedExclusions(tenantId: string, projectId?: string): Promise<SavedExclusion[]>;
  getSavedExclusionsByType(tenantId: string, projectId: string | undefined, type: 'keyword' | 'place_type'): Promise<SavedExclusion[]>;
  createSavedExclusion(exclusion: InsertSavedExclusion): Promise<SavedExclusion>;
  deleteSavedExclusion(id: string): Promise<void>;
  updateUserActiveExclusions(userId: string, tenantId: string, activeKeywords: string[], activeTypes: string[]): Promise<UserPreferences>;

}
