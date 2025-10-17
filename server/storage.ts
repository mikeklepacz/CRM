// Database storage implementation - combines javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  clients,
  notes,
  orders,
  csvUploads,
  googleSheets,
  userIntegrations,
  dashboardCards,
  userPreferences,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type Note,
  type InsertNote,
  type Order,
  type InsertOrder,
  type CsvUpload,
  type InsertCsvUpload,
  type GoogleSheet,
  type InsertGoogleSheet,
  type UserIntegration,
  type InsertUserIntegration,
  type DashboardCard,
  type UserPreferences,
  type InsertUserPreferences,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createPasswordUser(userData: any): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  getAgents(): Promise<User[]>;

  // User integrations operations
  getUserIntegration(userId: string): Promise<UserIntegration | undefined>;
  updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>): Promise<UserIntegration>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // Client operations
  getAllClients(): Promise<Client[]>;
  getClientsByAgent(agentId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  claimClient(clientId: string, agentId: string): Promise<Client>;
  unclaimClient(clientId: string): Promise<Client>;
  findClientByUniqueKey(key: string, value: string): Promise<Client | undefined>;

  // Notes operations
  getClientNotes(clientId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;
  getAllOrders(): Promise<Order[]>;

  // CSV Upload operations
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  getRecentCsvUploads(limit: number): Promise<CsvUpload[]>;

  // Google Sheets operations
  getAllActiveGoogleSheets(): Promise<GoogleSheet[]>;
  getGoogleSheetById(id: string): Promise<GoogleSheet | null>;
  createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet>;
  disconnectGoogleSheet(id: string): Promise<void>;
  updateGoogleSheetLastSync(id: string): Promise<void>;
  getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined>;

  // Dashboard operations
  getDashboardCardsByRole(role: string): Promise<any[]>;
  getDashboardStats(userId: string, role: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createPasswordUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getAgents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'agent'));
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // User integrations operations
  async getUserIntegration(userId: string): Promise<UserIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId));
    return integration;
  }

  async updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>): Promise<UserIntegration> {
    // First check if integration exists
    const existing = await this.getUserIntegration(userId);

    if (existing) {
      const [updated] = await db
        .update(userIntegrations)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userIntegrations.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userIntegrations)
        .values({ userId, ...updates })
        .returning();
      return created;
    }
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async saveUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    // First check if preferences exist
    const existing = await this.getUserPreferences(userId);

    if (existing) {
      // Merge with existing preferences to avoid data loss
      const merged = {
        visibleColumns: preferences.visibleColumns ?? existing.visibleColumns,
        columnOrder: preferences.columnOrder ?? existing.columnOrder,
        columnWidths: preferences.columnWidths ?? existing.columnWidths,
        selectedTags: preferences.selectedTags ?? existing.selectedTags,
        selectedKeywords: preferences.selectedKeywords ?? existing.selectedKeywords,
        selectedStates: preferences.selectedStates ?? existing.selectedStates,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(userPreferences)
        .set(merged)
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userPreferences)
        .values({ userId, ...preferences })
        .returning();
      return created;
    }
  }

  // Client operations
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.createdAt);
  }

  async getClientsByAgent(agentId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.assignedAgent, agentId))
      .orderBy(clients.createdAt);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async claimClient(clientId: string, agentId: string): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({
        assignedAgent: agentId,
        claimDate: new Date(),
        status: 'claimed',
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();
    return updated;
  }

  async unclaimClient(clientId: string): Promise<Client> {
    const [updated] = await db
      .update(clients)
      .set({
        assignedAgent: null,
        claimDate: null,
        status: 'unassigned',
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();
    return updated;
  }

  async findClientByUniqueKey(key: string, value: string): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(sql`${clients.data}->>${key} = ${value}`)
      .limit(1);
    return result[0];
  }

  // Notes operations
  async getClientNotes(clientId: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.clientId, clientId))
      .orderBy(notes.createdAt);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(orders.orderDate);
  }

  // CSV Upload operations
  async createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload> {
    const [newUpload] = await db.insert(csvUploads).values(upload).returning();
    return newUpload;
  }

  async getRecentCsvUploads(limit: number = 10): Promise<CsvUpload[]> {
    return await db
      .select()
      .from(csvUploads)
      .orderBy(csvUploads.uploadedAt)
      .limit(limit);
  }

  // Google Sheets operations
  async getAllActiveGoogleSheets(): Promise<GoogleSheet[]> {
    return await db
      .select()
      .from(googleSheets)
      .where(eq(googleSheets.syncStatus, 'active'))
      .orderBy(desc(googleSheets.createdAt));
  }

  async getGoogleSheetById(id: string): Promise<GoogleSheet | null> {
    const [sheet] = await db
      .select()
      .from(googleSheets)
      .where(eq(googleSheets.id, id))
      .limit(1);
    return sheet || null;
  }

  async createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet> {
    const [newConnection] = await db
      .insert(googleSheets)
      .values(connection)
      .returning();
    return newConnection;
  }

  async disconnectGoogleSheet(id: string): Promise<void> {
    await db
      .update(googleSheets)
      .set({ syncStatus: 'paused' })
      .where(eq(googleSheets.id, id));
  }

  async updateGoogleSheetLastSync(id: string): Promise<void> {
    await db
      .update(googleSheets)
      .set({ lastSyncedAt: new Date() })
      .where(eq(googleSheets.id, id));
  }

  async getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.uniqueIdentifier, uniqueId));
    return client;
  }
}

export const storage = new DatabaseStorage();