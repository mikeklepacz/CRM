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
    console.log('[STORAGE] createReminder received:', JSON.stringify(reminder, null, 2));
    console.log('[STORAGE] createReminder keys:', Object.keys(reminder));
    console.log('[STORAGE] reminderType value:', (reminder as any).reminderType);
    
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
}

export const storage = new DatabaseStorage();