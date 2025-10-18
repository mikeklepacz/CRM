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
  bannedWords,
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
import { v4 as uuidv4 } from 'uuid';

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
  deleteOrder(id: string): Promise<void>;
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

  // Banned words operations
  getAllBannedWords(): Promise<any[]>;
  addBannedWords(words: string[], type: string, createdBy: string): Promise<number>;
  deleteBannedWord(id: string): Promise<void>;
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

  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const existing = await this.getUserPreferences(userId);

    // Ensure arrays are properly formatted for PostgreSQL
    const formattedPreferences = {
      ...preferences,
      selectedTags: preferences.selectedTags || existing?.selectedTags || [],
      selectedKeywords: preferences.selectedKeywords || existing?.selectedKeywords || [],
      selectedStates: preferences.selectedStates || existing?.selectedStates || [],
    };

    if (existing) {
      const updated = await db
        .update(userPreferences)
        .set({
          ...formattedPreferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated[0];
    } else {
      const created = await db
        .insert(userPreferences)
        .values({
          id: uuidv4(),
          userId,
          ...formattedPreferences,
        })
        .returning();
      return created[0];
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

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
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

  // Dashboard operations
  async getDashboardCardsByRole(role: string): Promise<any[]> {
    const cards = await db
      .select()
      .from(dashboardCards)
      .where(eq(dashboardCards.role, role));
    return cards;
  }

  async getDashboardStats(userId: string, role: string): Promise<any> {
    if (role === 'admin') {
      const totalClients = await db.select().from(clients);
      const totalAgents = await db.select().from(users).where(eq(users.role, 'agent'));
      const totalOrders = await db.select().from(orders);
      
      return {
        totalClients: totalClients.length,
        totalAgents: totalAgents.length,
        totalOrders: totalOrders.length,
        unassignedClients: totalClients.filter(c => !c.assignedAgent).length,
      };
    } else if (role === 'agent') {
      const agentClients = await db
        .select()
        .from(clients)
        .where(eq(clients.assignedAgent, userId));
      
      const agentOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.agentId, userId));
      
      return {
        myClients: agentClients.length,
        myOrders: agentOrders.length,
        claimedClients: agentClients.filter(c => c.status === 'claimed').length,
      };
    }
    
    return {};
  }

  // Banned words operations
  async getAllBannedWords(): Promise<any[]> {
    return await db.select().from(bannedWords).orderBy(bannedWords.word);
  }

  async addBannedWords(words: string[], type: string, createdBy: string): Promise<number> {
    let added = 0;
    for (const word of words) {
      try {
        await db.insert(bannedWords).values({
          word: word.trim(),
          type,
          createdBy,
        });
        added++;
      } catch (error: any) {
        // Ignore duplicates (unique constraint violation)
        if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
          console.error(`Error adding banned word "${word}":`, error);
        }
      }
    }
    return added;
  }

  async deleteBannedWord(id: string): Promise<void> {
    await db.delete(bannedWords).where(eq(bannedWords.id, id));
  }
}

export const storage = new DatabaseStorage();