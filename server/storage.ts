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
  reminders,
  notifications,
  widgetLayouts,
  openaiSettings,
  knowledgeBaseFiles,
  chatMessages,
  projects,
  conversations,
  templates,
  categories,
  importedPlaces,
  searchHistory,
  savedExclusions,
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
  type Reminder,
  type InsertReminder,
  type Notification,
  type InsertNotification,
  type WidgetLayout,
  type InsertWidgetLayout,
  type OpenaiSettings,
  type InsertOpenaiSettings,
  type KnowledgeBaseFile,
  type InsertKnowledgeBaseFile,
  type ChatMessage,
  type InsertChatMessage,
  type Project,
  type InsertProject,
  type Conversation,
  type InsertConversation,
  type Template,
  type InsertTemplate,
  type Category,
  type InsertCategory,
  type SearchHistory,
  type InsertSearchHistory,
  type SavedExclusion,
  type InsertSavedExclusion,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

export interface IStorage {
  // User operations - Required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  createPasswordUser(userData: any): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  getAgents(): Promise<User[]>;

  // User integrations operations
  getUserIntegration(userId: string): Promise<UserIntegration | undefined>;
  getAllUserIntegrations(): Promise<UserIntegration[]>;
  updateUserIntegration(userId: string, updates: Partial<InsertUserIntegration>): Promise<UserIntegration>;

  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  saveUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  getLastCategory(userId: string): Promise<string | null>;
  setLastCategory(userId: string, category: string): Promise<UserPreferences>;
  getSelectedCategory(userId: string): Promise<string | null>;
  setSelectedCategory(userId: string, category: string): Promise<UserPreferences>;

  // Client operations
  getAllClients(): Promise<Client[]>;
  getClientsByAgent(agentId: string): Promise<Client[]>;
  getFilteredClients(filters: { search?: string; states?: string[]; status?: string[]; category?: string; agentId?: string }): Promise<Client[]>;
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
  getGoogleSheetByPurpose(purpose: string): Promise<GoogleSheet | null>;
  createGoogleSheetConnection(connection: InsertGoogleSheet): Promise<GoogleSheet>;
  disconnectGoogleSheet(id: string): Promise<void>;
  updateGoogleSheetLastSync(id: string): Promise<void>;
  getClientByUniqueIdentifier(uniqueId: string): Promise<Client | undefined>;

  // Dashboard operations
  getDashboardCardsByRole(role: string): Promise<any[]>;
  getDashboardStats(userId: string, role: string): Promise<any>;

  // Helper methods
  getUserById(id: string): Promise<User | undefined>;
  getOrdersByClient(clientId: string): Promise<Order[]>;

  // Reminder operations
  getRemindersByUser(userId: string): Promise<Reminder[]>;
  getRemindersByClient(clientId: string): Promise<Reminder[]>;
  getReminderById(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;

  // Notification operations
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getNotificationById(id: string): Promise<Notification | undefined>;
  markNotificationAsRead(id: string): Promise<Notification>;
  markNotificationAsResolved(id: string): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;

  // Widget layout operations
  getWidgetLayout(userId: string, dashboardType: string): Promise<WidgetLayout | undefined>;
  saveWidgetLayout(layout: InsertWidgetLayout): Promise<WidgetLayout>;

  // OpenAI operations
  getOpenaiSettings(): Promise<OpenaiSettings | undefined>;
  saveOpenaiSettings(settings: Partial<InsertOpenaiSettings>): Promise<OpenaiSettings>;
  
  // Knowledge base operations
  getAllKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]>;
  getKnowledgeBaseFile(id: string): Promise<KnowledgeBaseFile | undefined>;
  createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile>;
  updateKnowledgeBaseFileStatus(id: string, status: string): Promise<KnowledgeBaseFile>;
  updateKnowledgeBaseFile(id: string, updates: Partial<InsertKnowledgeBaseFile>): Promise<KnowledgeBaseFile>;
  deleteKnowledgeBaseFile(id: string): Promise<void>;
  
  // Chat operations
  getChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(userId: string): Promise<void>;
  
  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Conversation operations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  moveConversationToProject(conversationId: string, projectId: string | null): Promise<Conversation>;
  
  // Template operations
  getUserTemplates(userId: string): Promise<Template[]>;  // Per-user templates
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  getAllTemplateTags(): Promise<string[]>; // Get all unique tags across all templates
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getActiveCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Imported Places operations
  checkImportedPlaces(placeIds: string[]): Promise<Set<string>>;
  recordImportedPlace(placeId: string): Promise<void>;
  
  // Search History operations
  getAllSearchHistory(): Promise<SearchHistory[]>;
  recordSearch(businessType: string, city: string, state: string, country: string, excludedKeywords?: string[], excludedTypes?: string[], category?: string): Promise<SearchHistory>;
  deleteSearchHistory(id: string): Promise<void>;
  
  // Saved Exclusions operations
  getAllSavedExclusions(): Promise<SavedExclusion[]>;
  getSavedExclusionsByType(type: 'keyword' | 'place_type'): Promise<SavedExclusion[]>;
  createSavedExclusion(exclusion: InsertSavedExclusion): Promise<SavedExclusion>;
  deleteSavedExclusion(id: string): Promise<void>;
  updateUserActiveExclusions(userId: string, activeKeywords: string[], activeTypes: string[]): Promise<UserPreferences>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.insert(users).values(userData as any).returning();
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

  async getAllUserIntegrations(): Promise<UserIntegration[]> {
    return await db.select().from(userIntegrations);
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
      selectedStates: preferences.selectedStates || existing?.selectedStates || [],
    };

    // Set override flags when custom colors are saved
    if (preferences.lightModeColors) {
      formattedPreferences.hasLightOverrides = true;
    }
    if (preferences.darkModeColors) {
      formattedPreferences.hasDarkOverrides = true;
    }

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

  async getLastCategory(userId: string): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId);
    return preferences?.lastCategory || null;
  }

  async setLastCategory(userId: string, category: string): Promise<UserPreferences> {
    return await this.saveUserPreferences(userId, { lastCategory: category });
  }

  async getSelectedCategory(userId: string): Promise<string | null> {
    const preferences = await this.getUserPreferences(userId);
    return preferences?.selectedCategory || null;
  }

  async setSelectedCategory(userId: string, category: string): Promise<UserPreferences> {
    return await this.saveUserPreferences(userId, { selectedCategory: category });
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

  async getFilteredClients(filters: { search?: string; states?: string[]; status?: string[]; category?: string; agentId?: string }): Promise<Client[]> {
    let query = db.select().from(clients);
    const conditions: any[] = [];

    // Filter by agent (for agents seeing only their clients)
    if (filters.agentId) {
      conditions.push(eq(clients.assignedAgent, filters.agentId));
    }

    // Filter by category
    if (filters.category) {
      conditions.push(eq(clients.category, filters.category));
    }

    // Filter by status (check JSONB data.Status field, handle as array)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      const statusConditions = filters.status.map(status =>
        sql`${clients.data}->>'Status' = ${status} OR ${clients.data}->>'status' = ${status}`
      );
      conditions.push(sql`(${sql.join(statusConditions, sql` OR `)})`);
    }

    // Filter by states (check JSONB data.State field)
    if (filters.states && filters.states.length > 0) {
      const stateConditions = filters.states.map(state =>
        sql`${clients.data}->>'State' = ${state} OR ${clients.data}->>'state' = ${state}`
      );
      conditions.push(sql`(${sql.join(stateConditions, sql` OR `)})`);
    }

    // Search filter (check multiple JSONB fields)
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${clients.data}->>'Name') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'name') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'Email') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'email') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'Phone') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'phone') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'City') LIKE ${searchTerm} OR
          LOWER(${clients.data}->>'city') LIKE ${searchTerm}
        )`
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.orderBy(clients.createdAt);
    return results;
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

  async getGoogleSheetByPurpose(purpose: string): Promise<GoogleSheet | null> {
    console.log(`[Storage] Looking for sheet with purpose: "${purpose}"`);
    const allSheets = await db.select().from(googleSheets);
    console.log(`[Storage] All sheets:`, allSheets.map(s => ({
      id: s.id,
      purpose: s.sheetPurpose,
      status: s.syncStatus
    })));
    
    const [sheet] = await db
      .select()
      .from(googleSheets)
      .where(and(
        eq(googleSheets.sheetPurpose, purpose),
        eq(googleSheets.syncStatus, 'active')
      ))
      .limit(1);
    console.log(`[Storage] Found sheet:`, sheet ? `${sheet.spreadsheetName} / ${sheet.sheetName}` : 'NONE');
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

  // Helper methods
  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getOrdersByClient(clientId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.orderDate));
  }

  // Reminder operations
  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(desc(reminders.nextTrigger));
  }

  async getRemindersByClient(clientId: string): Promise<Reminder[]> {
    return await db
      .select()
      .from(reminders)
      .where(eq(reminders.clientId, clientId))
      .orderBy(desc(reminders.nextTrigger));
  }

  async getReminderById(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id));
    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db
      .insert(reminders)
      .values(reminder)
      .returning();
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder> {
    const [updated] = await db
      .update(reminders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  async deleteReminder(id: string): Promise<void> {
    await db
      .delete(reminders)
      .where(eq(reminders.id, id));
  }

  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationById(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markNotificationAsResolved(id: string): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async deleteNotification(id: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, id));
  }

  // Widget layout operations
  async getWidgetLayout(userId: string, dashboardType: string): Promise<WidgetLayout | undefined> {
    const [layout] = await db
      .select()
      .from(widgetLayouts)
      .where(and(
        eq(widgetLayouts.userId, userId),
        eq(widgetLayouts.dashboardType, dashboardType),
        eq(widgetLayouts.isDefault, true)
      ))
      .limit(1);
    return layout;
  }

  async saveWidgetLayout(layout: InsertWidgetLayout): Promise<WidgetLayout> {
    // If this is set as default, unset other defaults for this user/dashboard type
    if (layout.isDefault) {
      await db
        .update(widgetLayouts)
        .set({ isDefault: false })
        .where(and(
          eq(widgetLayouts.userId, layout.userId),
          eq(widgetLayouts.dashboardType, layout.dashboardType || 'sales')
        ));
    }

    // Check if a layout already exists for this user/dashboard type
    const [existing] = await db
      .select()
      .from(widgetLayouts)
      .where(and(
        eq(widgetLayouts.userId, layout.userId),
        eq(widgetLayouts.dashboardType, layout.dashboardType || 'sales'),
        eq(widgetLayouts.isDefault, true)
      ))
      .limit(1);

    if (existing) {
      // Update existing layout
      const [updated] = await db
        .update(widgetLayouts)
        .set({ ...layout, updatedAt: new Date() })
        .where(eq(widgetLayouts.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new layout
      const [newLayout] = await db
        .insert(widgetLayouts)
        .values(layout)
        .returning();
      return newLayout;
    }
  }

  // OpenAI operations
  async getOpenaiSettings(): Promise<OpenaiSettings | undefined> {
    const [settings] = await db
      .select()
      .from(openaiSettings)
      .where(eq(openaiSettings.isActive, true))
      .limit(1);
    return settings;
  }

  async saveOpenaiSettings(settings: Partial<InsertOpenaiSettings>): Promise<OpenaiSettings> {
    const existing = await this.getOpenaiSettings();
    
    if (existing) {
      const [updated] = await db
        .update(openaiSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(openaiSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db
        .insert(openaiSettings)
        .values(settings as InsertOpenaiSettings)
        .returning();
      return newSettings;
    }
  }

  // Knowledge base operations
  async getAllKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]> {
    return await db
      .select()
      .from(knowledgeBaseFiles)
      .where(eq(knowledgeBaseFiles.isActive, true))
      .orderBy(desc(knowledgeBaseFiles.uploadedAt));
  }

  async getKnowledgeBaseFile(id: string): Promise<KnowledgeBaseFile | undefined> {
    const [file] = await db
      .select()
      .from(knowledgeBaseFiles)
      .where(eq(knowledgeBaseFiles.id, id));
    return file;
  }

  async createKnowledgeBaseFile(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
    const [newFile] = await db
      .insert(knowledgeBaseFiles)
      .values(file)
      .returning();
    return newFile;
  }

  async updateKnowledgeBaseFileStatus(id: string, status: string): Promise<KnowledgeBaseFile> {
    const [updated] = await db
      .update(knowledgeBaseFiles)
      .set({ processingStatus: status })
      .where(eq(knowledgeBaseFiles.id, id))
      .returning();
    return updated;
  }

  async updateKnowledgeBaseFile(id: string, updates: Partial<InsertKnowledgeBaseFile>): Promise<KnowledgeBaseFile> {
    const [updated] = await db
      .update(knowledgeBaseFiles)
      .set(updates)
      .where(eq(knowledgeBaseFiles.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeBaseFile(id: string): Promise<void> {
    await db
      .update(knowledgeBaseFiles)
      .set({ isActive: false })
      .where(eq(knowledgeBaseFiles.id, id));
  }

  // Chat operations
  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async clearChatHistory(userId: string): Promise<void> {
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.userId, userId));
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db
      .delete(projects)
      .where(eq(projects.id, id));
  }

  // Conversation operations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db
      .delete(conversations)
      .where(eq(conversations.id, id));
  }

  async moveConversationToProject(conversationId: string, projectId: string | null): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ projectId, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updated;
  }

  // Template operations
  async getUserTemplates(userId: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db
      .insert(templates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template> {
    const [updated] = await db
      .update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db
      .delete(templates)
      .where(eq(templates.id, id));
  }

  async getAllTemplateTags(): Promise<string[]> {
    const allTemplates = await db.select().from(templates);
    const tagsSet = new Set<string>();
    
    allTemplates.forEach(template => {
      if (template.tags && Array.isArray(template.tags)) {
        template.tags.forEach(tag => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.trim());
          }
        });
      }
    });
    
    return Array.from(tagsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .orderBy(categories.displayOrder, categories.name);
  }

  async getActiveCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.displayOrder, categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await db
      .delete(categories)
      .where(eq(categories.id, id));
  }

  // Imported Places operations - for duplicate detection in Map Search
  async checkImportedPlaces(placeIds: string[]): Promise<Set<string>> {
    if (placeIds.length === 0) return new Set();
    
    const results = await db
      .select({ placeId: importedPlaces.placeId })
      .from(importedPlaces)
      .where(inArray(importedPlaces.placeId, placeIds));
    
    return new Set(results.map(r => r.placeId));
  }

  async recordImportedPlace(placeId: string): Promise<void> {
    await db
      .insert(importedPlaces)
      .values({ placeId })
      .onConflictDoNothing(); // Ignore if already exists
  }

  // Search History operations - for Map Search
  async getAllSearchHistory(): Promise<SearchHistory[]> {
    const history = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.searchedAt));
    return history;
  }

  async recordSearch(
    businessType: string, 
    city: string, 
    state: string, 
    country: string,
    excludedKeywords: string[] = [],
    excludedTypes: string[] = [],
    category?: string
  ): Promise<SearchHistory> {
    // Check if this exact search already exists
    const [existing] = await db
      .select()
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.businessType, businessType),
          eq(searchHistory.city, city),
          eq(searchHistory.state, state),
          eq(searchHistory.country, country)
        )
      );

    if (existing) {
      // Update existing entry: increment count, update timestamp, and update excluded keywords/types and category
      const [updated] = await db
        .update(searchHistory)
        .set({
          searchedAt: new Date(),
          searchCount: existing.searchCount + 1,
          excludedKeywords: excludedKeywords.length > 0 ? excludedKeywords : existing.excludedKeywords,
          excludedTypes: excludedTypes.length > 0 ? excludedTypes : existing.excludedTypes,
          category: category || existing.category,
        })
        .where(eq(searchHistory.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [newEntry] = await db
        .insert(searchHistory)
        .values({
          businessType,
          city,
          state,
          country,
          excludedKeywords,
          excludedTypes,
          category,
          searchCount: 1,
        })
        .returning();
      return newEntry;
    }
  }

  async deleteSearchHistory(id: string): Promise<void> {
    await db.delete(searchHistory).where(eq(searchHistory.id, id));
  }

  // Saved Exclusions operations
  async getAllSavedExclusions(): Promise<SavedExclusion[]> {
    const exclusions = await db
      .select()
      .from(savedExclusions)
      .orderBy(savedExclusions.type, savedExclusions.value);
    return exclusions;
  }

  async getSavedExclusionsByType(type: 'keyword' | 'place_type'): Promise<SavedExclusion[]> {
    const exclusions = await db
      .select()
      .from(savedExclusions)
      .where(eq(savedExclusions.type, type))
      .orderBy(savedExclusions.value);
    return exclusions;
  }

  async createSavedExclusion(exclusion: InsertSavedExclusion): Promise<SavedExclusion> {
    // Check if this exclusion already exists
    const [existing] = await db
      .select()
      .from(savedExclusions)
      .where(
        and(
          eq(savedExclusions.type, exclusion.type),
          eq(savedExclusions.value, exclusion.value)
        )
      );

    if (existing) {
      return existing;
    }

    const [newExclusion] = await db
      .insert(savedExclusions)
      .values(exclusion)
      .returning();
    return newExclusion;
  }

  async deleteSavedExclusion(id: string): Promise<void> {
    await db.delete(savedExclusions).where(eq(savedExclusions.id, id));
  }

  async updateUserActiveExclusions(userId: string, activeKeywords: string[], activeTypes: string[]): Promise<UserPreferences> {
    const [prefs] = await db
      .update(userPreferences)
      .set({
        activeExcludedKeywords: activeKeywords,
        activeExcludedTypes: activeTypes,
      })
      .where(eq(userPreferences.userId, userId))
      .returning();

    if (!prefs) {
      // Create new preferences if they don't exist
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          userId,
          activeExcludedKeywords: activeKeywords,
          activeExcludedTypes: activeTypes,
        })
        .returning();
      return newPrefs;
    }

    return prefs;
  }
}

export const storage = new DatabaseStorage();