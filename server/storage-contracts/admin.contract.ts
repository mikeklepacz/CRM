import type {
  User,
  SystemIntegration,
  InsertSystemIntegration,
  UserIntegration,
  InsertUserIntegration,
  UserPreferences,
  InsertUserPreferences,
} from "./shared-types";

export interface AdminStorageContract {
  // System integrations operations
  getSystemIntegration(provider: string): Promise<SystemIntegration | undefined>;
  updateSystemIntegration(provider: string, updates: Partial<InsertSystemIntegration>): Promise<SystemIntegration>;
  deleteSystemIntegration(provider: string): Promise<void>;

  // User integrations operations
  getUserIntegration(userId: string): Promise<UserIntegration | undefined>;
  getAllUserIntegrations(): Promise<UserIntegration[]>;
  getUserIntegrationsWithGmailByTenant(tenantId: string): Promise<UserIntegration[]>;
  updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>, tenantId?: string): Promise<UserIntegration>;

  // User preferences operations
  getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(userId: string, tenantId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  getLastCategory(userId: string, tenantId: string): Promise<string | null>;
  setLastCategory(userId: string, tenantId: string, category: string): Promise<UserPreferences>;
  getSelectedCategory(userId: string, tenantId: string): Promise<string | null>;
  setSelectedCategory(userId: string, tenantId: string, category: string): Promise<UserPreferences>;

}
