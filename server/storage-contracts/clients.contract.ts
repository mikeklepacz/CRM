import type {
  Client,
  InsertClient,
  Note,
  InsertNote,
  Category,
  InsertCategory,
  Status,
  InsertStatus,
} from "./shared-types";

export interface ClientsStorageContract {
  // Client operations
  getAllClients(tenantId: string): Promise<Client[]>;
  getClientsByAgent(agentId: string, tenantId: string): Promise<Client[]>;
  getFilteredClients(tenantId: string, filters: { search?: string; nameFilter?: string; cityFilter?: string; states?: string[]; cities?: string[]; status?: string[]; showMyStoresOnly?: boolean; category?: string; agentId?: string; projectId?: string }): Promise<Client[]>;
  getClient(id: string, tenantId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, tenantId: string, updates: Partial<InsertClient>): Promise<Client>;
  claimClient(clientId: string, agentId: string): Promise<Client>;
  unclaimClient(clientId: string): Promise<Client>;
  findClientByUniqueKey(key: string, value: string): Promise<Client | undefined>;
  updateLastContactDate(clientId: string, contactDate?: Date): Promise<Client | undefined>;

  // Notes operations
  getClientNotes(clientId: string, tenantId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;

  // Category operations
  getAllCategories(tenantId: string, projectId?: string): Promise<Category[]>;
  getActiveCategories(tenantId: string, projectId?: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryByName(tenantId: string, name: string, projectId?: string): Promise<Category | undefined>;
  getOrCreateCategoryByName(tenantId: string, name: string, projectId?: string): Promise<Category>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Status operations
  getAllStatuses(tenantId: string): Promise<Status[]>;
  getActiveStatuses(tenantId: string): Promise<Status[]>;
  getStatus(id: string): Promise<Status | undefined>;
  createStatus(status: InsertStatus): Promise<Status>;
  updateStatus(id: string, updates: Partial<InsertStatus>): Promise<Status>;
  deleteStatus(id: string): Promise<void>;
  reorderStatuses(updates: { id: string; displayOrder: number }[]): Promise<void>;

}
