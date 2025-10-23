import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Supports both Replit Auth and username/password
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  role: varchar("role", { length: 20 }).notNull().default('agent'), // 'admin' or 'agent'
  agentName: varchar("agent_name"), // Name used in WooCommerce and Google Sheets for matching
  phone: varchar("phone"), // Agent's phone number for templates
  meetingLink: text("meeting_link"), // Agent's meeting/calendar link (e.g., Calendly, Google Meet)
  referredBy: varchar("referred_by").references(() => users.id), // MLM: who referred this user
  isActive: boolean("is_active").notNull().default(true), // Active/Inactive status for deactivating agents
  signature: text("signature"), // Custom email signature for AI-generated emails
  gmailLabels: text("gmail_labels").array(), // Gmail labels to auto-apply to drafts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CSV Upload tracking table
export const csvUploads = pgTable("csv_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uniqueKey: varchar("unique_key").notNull(), // Column used as unique identifier
  headers: jsonb("headers").notNull().$type<string[]>(),
  rowCount: integer("row_count").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Google Sheets connection tracking
export const googleSheets = pgTable("google_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  spreadsheetId: varchar("spreadsheet_id").notNull(),
  spreadsheetName: varchar("spreadsheet_name").notNull(),
  sheetName: varchar("sheet_name").notNull(), // Tab/worksheet name
  sheetPurpose: varchar("sheet_purpose", { length: 100 }).default('clients'), // 'clients', 'commissions', 'custom'
  uniqueIdentifierColumn: varchar("unique_identifier_column").notNull(), // Which column to use as unique ID (e.g., "link")
  connectedBy: varchar("connected_by").notNull().references(() => users.id),
  lastSyncedAt: timestamp("last_synced_at"),
  syncStatus: varchar("sync_status", { length: 50 }).default('active'), // active, paused, error
  createdAt: timestamp("created_at").defaultNow(),
});

// Client data table - stores CSV/Google Sheets data + tracking fields
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Google Sheets sync fields
  uniqueIdentifier: varchar("unique_identifier"), // Leafly link or other unique ID (temporarily removed .unique() due to drizzle metadata mismatch - will re-add after migration cleanup)
  googleSheetId: varchar("google_sheet_id"), // ID of the connected Google Sheet
  googleSheetRowId: integer("google_sheet_row_id"), // Row number in Google Sheet
  // CSV/Sheet data stored as JSONB for flexibility
  data: jsonb("data").notNull().$type<Record<string, any>>(),
  // Tracking fields
  assignedAgent: varchar("assigned_agent").references(() => users.id),
  claimDate: timestamp("claim_date"),
  status: varchar("status", { length: 50 }).default('unassigned'), // unassigned, claimed, active, inactive
  category: varchar("category", { length: 100 }), // Category filter (e.g., "Pets", "Cannabis") for team segregation
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  // Order tracking
  firstOrderDate: timestamp("first_order_date"),
  lastOrderDate: timestamp("last_order_date"),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default('0'),
  commissionTotal: decimal("commission_total", { precision: 12, scale: 2 }).default('0'),
  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notes table for follow-up tracking
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isFollowUp: boolean("is_follow_up").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table - synced from WooCommerce
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(), // WooCommerce order ID
  clientId: varchar("client_id").references(() => clients.id),
  orderNumber: varchar("order_number").notNull(),
  billingEmail: varchar("billing_email"),
  billingCompany: varchar("billing_company"),
  salesAgentName: varchar("sales_agent_name"), // From WooCommerce custom field _sales_agent
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  commissionType: varchar("commission_type", { length: 20 }).default('auto'), // 'auto', '25', '10', 'flat'
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }),
  syncedAt: timestamp("synced_at").defaultNow(),
});

// User integrations - per-user integration credentials
export const userIntegrations = pgTable("user_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  // WooCommerce settings
  wooUrl: text("woo_url"),
  wooConsumerKey: text("woo_consumer_key"),
  wooConsumerSecret: text("woo_consumer_secret"),
  wooLastSyncedAt: timestamp("woo_last_synced_at"),
  // Google OAuth credentials (for Google Sheets)
  googleClientId: varchar("google_client_id"),
  googleClientSecret: varchar("google_client_secret"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: bigint("google_token_expiry", { mode: "number" }),
  googleEmail: varchar("google_email"),
  googleConnectedAt: timestamp("google_connected_at"),
  // Google Calendar/Gmail OAuth credentials (separate account)
  googleCalendarAccessToken: text("google_calendar_access_token"),
  googleCalendarRefreshToken: text("google_calendar_refresh_token"),
  googleCalendarTokenExpiry: bigint("google_calendar_token_expiry", { mode: "number" }),
  googleCalendarEmail: varchar("google_calendar_email"),
  googleCalendarConnectedAt: timestamp("google_calendar_connected_at"),
  // Google Calendar webhook (push notifications)
  googleCalendarWebhookChannelId: varchar("google_calendar_webhook_channel_id"),
  googleCalendarWebhookResourceId: varchar("google_calendar_webhook_resource_id"),
  googleCalendarWebhookExpiry: bigint("google_calendar_webhook_expiry", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard card configurations - controls which roles see which cards
export const dashboardCards = pgTable("dashboard_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardType: varchar("card_type", { length: 50 }).notNull(), // 'total_sales', 'last_order', 'commission_warning', etc.
  title: varchar("title").notNull(),
  description: text("description"),
  visibleToRoles: text("visible_to_roles").array().default(sql`ARRAY['admin']::text[]`), // ['admin', 'agent']
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User preferences for Sales Dashboard view - syncs across devices
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  visibleColumns: jsonb("visible_columns").$type<Record<string, boolean>>(),
  columnOrder: jsonb("column_order").$type<string[]>(),
  columnWidths: jsonb("column_widths").$type<Record<string, number>>(),
  selectedStates: jsonb("selected_states").$type<string[]>(),
  selectedCities: jsonb("selected_cities").$type<string[]>(),
  fontSize: integer("font_size").default(14), // Font size in pixels (12, 14, 16, 18, 20, etc.)
  rowHeight: integer("row_height").default(48), // Row height in pixels
  lightModeColors: jsonb("light_mode_colors").$type<{
    background: string;
    tableTextColor: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    bodyBackground: string;
    headerBackground: string;
    statesButton: string;
    franchiseButton: string;
    statusButton: string;
    columnsButton: string;
    actionButtons: string;
    statusColors?: { [status: string]: { background: string; text: string } };
  }>(),
  darkModeColors: jsonb("dark_mode_colors").$type<{
    background: string;
    tableTextColor: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    bodyBackground: string;
    headerBackground: string;
    statesButton: string;
    franchiseButton: string;
    statusButton: string;
    columnsButton: string;
    actionButtons: string;
    statusColors?: { [status: string]: { background: string; text: string } };
  }>(),
  hasLightOverrides: boolean("has_light_overrides").default(false), // True when user has saved custom light colors
  hasDarkOverrides: boolean("has_dark_overrides").default(false), // True when user has saved custom dark colors
  colorPresets: jsonb("color_presets").$type<Array<{name: string, color: string}>>().default(sql`'[]'::jsonb`), // User's saved color presets
  textAlign: varchar("text_align", { length: 20 }),
  freezeFirstColumn: boolean("freeze_first_column").default(false),
  loadingLogoUrl: text("loading_logo_url"), // Custom loading logo URL
  timezone: varchar("timezone", { length: 100 }), // IANA timezone (e.g., "America/New_York", "Europe/Warsaw")
  defaultTimezoneMode: varchar("default_timezone_mode", { length: 20 }).default('agent'), // 'agent' or 'customer' - default mode for new reminders
  timeFormat: varchar("time_format", { length: 10 }).default('12hr'), // '12hr' or '24hr' - time display format preference
  defaultCalendarReminders: jsonb("default_calendar_reminders").$type<Array<{method: 'popup' | 'email', minutes: number}>>().default(sql`'[{"method":"popup","minutes":0}]'::jsonb`), // Default Google Calendar reminder settings
  activeExcludedKeywords: text("active_excluded_keywords").array().default(sql`ARRAY[]::text[]`), // Keywords to filter out from Map Search results
  activeExcludedTypes: text("active_excluded_types").array().default(sql`ARRAY[]::text[]`), // Place types to exclude from Map Search API calls
  lastCategory: varchar("last_category", { length: 100 }), // Last selected category for Map Search (defaults to 'pet')
  selectedCategory: varchar("selected_category", { length: 100 }), // Category filter for CRM dashboard - users only see stores from this category
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saved exclusions for Map Search - global keywords and place types
export const savedExclusions = pgTable("saved_exclusions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(), // 'keyword' or 'place_type'
  value: varchar("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom reminders for client follow-ups
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(), // 'one_time', 'recurring', '6_month_warning', 're_order'
  triggerDate: timestamp("trigger_date"),
  intervalDays: integer("interval_days"), // For recurring reminders
  lastTriggered: timestamp("last_triggered"),
  nextTrigger: timestamp("next_trigger"),
  isActive: boolean("is_active").default(true),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  sendEmail: boolean("send_email").default(true),
  addToCalendar: boolean("add_to_calendar").default(false),
  emailTemplate: varchar("email_template", { length: 50 }).default('default'), // 'default', 'follow_up', 'check_in', 'custom'
  customEmailSubject: varchar("custom_email_subject", { length: 200 }),
  customEmailBody: text("custom_email_body"),
  googleCalendarEventId: varchar("google_calendar_event_id"), // Google Calendar event ID for sync
  scheduledAtUtc: timestamp("scheduled_at_utc"), // When the reminder should trigger in UTC
  reminderTimeZone: varchar("reminder_time_zone", { length: 100 }), // Timezone used when creating reminder
  dueDate: timestamp("due_date"), // Legacy field - kept for compatibility, new reminders use scheduledAtUtc
  storeMetadata: jsonb("store_metadata").$type<{
    storeName?: string;
    storeLink?: string;
    uniqueIdentifier?: string; // For linking back to Google Sheets
    sheetId?: string; // Which Google Sheet this reminder relates to
    customerTimeZone?: string; // Customer's timezone if using customer timezone mode
    [key: string]: any;
  }>(), // Store-related metadata for display and Google Sheets sync
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications for alerts and reminders
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: 'cascade' }),
  reminderId: varchar("reminder_id").references(() => reminders.id, { onDelete: 'cascade' }),
  orderId: varchar("order_id").references(() => orders.id),
  notificationType: varchar("notification_type", { length: 50 }).notNull(), // 're_order', 'reminder', 'commission_warning', 'tier_change'
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  priority: varchar("priority", { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  actionUrl: varchar("action_url", { length: 500 }),
  metadata: jsonb("metadata").$type<{
    commissionTier?: '25%' | '10%';
    daysUntilTierChange?: number;
    revenueAtRisk?: string;
    [key: string]: any;
  }>(), // Flexible metadata for commission warnings and other context
  createdAt: timestamp("created_at").defaultNow(),
});

// Dashboard widget layouts - save drag-and-drop positions
export const widgetLayouts = pgTable("widget_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dashboardType: varchar("dashboard_type", { length: 50 }).notNull().default('sales'), // 'sales', 'analytics', 'custom'
  layoutName: varchar("layout_name", { length: 100 }),
  layoutConfig: jsonb("layout_config").notNull(),
  visibleWidgets: jsonb("visible_widgets").$type<string[]>(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OpenAI settings table - stores API key and file search configuration
export const openaiSettings = pgTable("openai_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key"), // Encrypted OpenAI API key
  aiInstructions: text("ai_instructions"), // Custom system prompt for AI assistant
  vectorStoreId: varchar("vector_store_id"), // OpenAI vector store ID for file search
  assistantId: varchar("assistant_id"), // Reusable OpenAI assistant ID for performance optimization
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge base files table - tracks uploaded files
export const knowledgeBaseFiles = pgTable("knowledge_base_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  openaiFileId: varchar("openai_file_id", { length: 100 }), // OpenAI file ID
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  category: varchar("category", { length: 100 }).default('general'), // scripts, objections, product-info, etc.
  productCategory: varchar("product_category", { length: 100 }), // Product line: Pets, Cannabis, etc. - filters which agents see this file
  description: text("description"),
  processingStatus: varchar("processing_status", { length: 50 }).default('uploading'), // 'uploading', 'processing', 'ready', 'failed'
  isActive: boolean("is_active").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Projects table - organize conversations into folders
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table - ChatGPT-style conversation threads
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'set null' }),
  title: varchar("title", { length: 300 }).notNull(),
  contextData: jsonb("context_data").$type<{
    storeName?: string;
    pocName?: string;
    pocEmail?: string;
    pocPhone?: string;
    storeNotes?: string;
    [key: string]: any;
  }>(), // Store context from the page where conversation started
  threadId: varchar("thread_id"), // OpenAI thread ID for reusing threads (performance optimization)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat history table - stores individual messages within conversations
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  responseId: varchar("response_id"), // OpenAI response ID for state management
  metadata: jsonb("metadata").$type<{
    model?: string;
    tokensUsed?: number;
    filesSearched?: number;
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Templates table - per-user library of email/script templates
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // e.g., ['email', 'follow-up', 'objection-handler']
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table - global categories for Map Search filtering
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Imported Places table - tracks Google Maps place_ids to prevent duplicates
export const importedPlaces = pgTable(
  "imported_places",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    placeId: varchar("place_id", { length: 255 }).notNull().unique(), // Google Maps place_id
    importedAt: timestamp("imported_at").defaultNow(),
  },
  (table) => [index("idx_place_id").on(table.placeId)],
);

// Search History table - global history of Map Search queries
export const searchHistory = pgTable(
  "search_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    businessType: text("business_type").notNull(),
    category: varchar("category", { length: 100 }), // Category used for this search (e.g., 'pet', 'food', etc.)
    city: text("city").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull(),
    excludedKeywords: text("excluded_keywords").array().default(sql`ARRAY[]::text[]`), // Keywords to exclude from results
    excludedTypes: text("excluded_types").array().default(sql`ARRAY[]::text[]`), // Place types to exclude from API calls
    searchedAt: timestamp("searched_at").defaultNow(),
    searchCount: integer("search_count").notNull().default(1),
  },
  (table) => [index("idx_searched_at").on(table.searchedAt)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  csvUploads: many(csvUploads),
  assignedClients: many(clients),
  notes: many(notes),
  reminders: many(reminders),
  notifications: many(notifications),
  projects: many(projects),
  conversations: many(conversations),
  chatMessages: many(chatMessages),
  templatesCreated: many(templates),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [chatMessages.conversationId],
    references: [conversations.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, {
    fields: [templates.userId],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  assignedAgentUser: one(users, {
    fields: [clients.assignedAgent],
    references: [users.id],
  }),
  notes: many(notes),
  orders: many(orders),
  reminders: many(reminders),
  notifications: many(notifications),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  client: one(clients, {
    fields: [notes.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
}));

export const csvUploadsRelations = relations(csvUploads, ({ one }) => ({
  uploader: one(users, {
    fields: [csvUploads.uploadedBy],
    references: [users.id],
  }),
}));

export const googleSheetsRelations = relations(googleSheets, ({ one }) => ({
  connector: one(users, {
    fields: [googleSheets.connectedBy],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, {
    fields: [reminders.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [reminders.clientId],
    references: [clients.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [notifications.clientId],
    references: [clients.id],
  }),
  reminder: one(reminders, {
    fields: [notifications.reminderId],
    references: [reminders.id],
  }),
  order: one(orders, {
    fields: [notifications.orderId],
    references: [orders.id],
  }),
}));

// Zod Schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  syncedAt: true,
});

export const insertCsvUploadSchema = createInsertSchema(csvUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertGoogleSheetSchema = createInsertSchema(googleSheets).omit({
  id: true,
  createdAt: true,
});

export const insertUserIntegrationSchema = createInsertSchema(userIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDashboardCardSchema = createInsertSchema(dashboardCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertWidgetLayoutSchema = createInsertSchema(widgetLayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOpenaiSettingsSchema = createInsertSchema(openaiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeBaseFileSchema = createInsertSchema(knowledgeBaseFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  searchedAt: true,
});

export const insertSavedExclusionSchema = createInsertSchema(savedExclusions).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type CsvUpload = typeof csvUploads.$inferSelect;
export type InsertCsvUpload = z.infer<typeof insertCsvUploadSchema>;
export type GoogleSheet = typeof googleSheets.$inferSelect;
export type InsertGoogleSheet = z.infer<typeof insertGoogleSheetSchema>;
export type UserIntegration = typeof userIntegrations.$inferSelect;
export type InsertUserIntegration = z.infer<typeof insertUserIntegrationSchema>;
export type DashboardCard = typeof dashboardCards.$inferSelect;
export type InsertDashboardCard = z.infer<typeof insertDashboardCardSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type WidgetLayout = typeof widgetLayouts.$inferSelect;
export type InsertWidgetLayout = z.infer<typeof insertWidgetLayoutSchema>;
export type OpenaiSettings = typeof openaiSettings.$inferSelect;
export type InsertOpenaiSettings = z.infer<typeof insertOpenaiSettingsSchema>;
export type KnowledgeBaseFile = typeof knowledgeBaseFiles.$inferSelect;
export type InsertKnowledgeBaseFile = z.infer<typeof insertKnowledgeBaseFileSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SavedExclusion = typeof savedExclusions.$inferSelect;
export type InsertSavedExclusion = z.infer<typeof insertSavedExclusionSchema>;