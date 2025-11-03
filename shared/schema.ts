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
  hasVoiceAccess: boolean("has_voice_access").notNull().default(false), // Access to Voice AI calling features (admins always have access)
  signature: text("signature"), // Custom email signature for AI-generated emails
  gmailLabels: text("gmail_labels").array(), // Gmail labels to auto-apply to drafts
  emailPreference: varchar("email_preference", { length: 20 }).default('mailto'), // 'gmail_draft' or 'mailto'
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
  lastContactDate: timestamp("last_contact_date"), // Last time agent made contact (call, email, etc.)
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
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }), // DEPRECATED - use commissions table instead
  syncedAt: timestamp("synced_at").defaultNow(),
});

// Commissions table - ledger for all commission records (primary agent and referral bonuses)
export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  agentId: varchar("agent_id").notNull().references(() => users.id), // Agent receiving this commission
  commissionKind: varchar("commission_kind", { length: 20 }).notNull(), // 'primary' or 'referral'
  sourceAgentId: varchar("source_agent_id").references(() => users.id), // For referral commissions, which agent generated the sale
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // e.g., 25.00 for 25%, 10.00 for 10%
  commissionDate: timestamp("commission_date").notNull(), // Date when the order was placed (source of truth for reports)
  calculatedOn: timestamp("calculated_on").defaultNow(), // When the commission was calculated
  notes: text("notes"),
}, (table) => [
  index("idx_commissions_agent_kind_calc").on(table.agentId, table.commissionKind, table.calculatedOn),
  index("idx_commissions_order").on(table.orderId),
  index("idx_commissions_source_agent").on(table.sourceAgentId),
]);

// System integrations - system-wide credentials (e.g., Google Sheets for CRM data)
export const systemIntegrations = pgTable("system_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 50 }).notNull().unique(), // 'google_sheets'
  // Google Sheets OAuth credentials (system-wide, managed by admin)
  googleClientId: varchar("google_client_id"),
  googleClientSecret: varchar("google_client_secret"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: bigint("google_token_expiry", { mode: "number" }),
  googleEmail: varchar("google_email"),
  connectedBy: varchar("connected_by").references(() => users.id), // Which admin connected it
  connectedAt: timestamp("connected_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  // Google Calendar/Gmail OAuth credentials (personal account per user)
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
  colorRowByStatus: boolean("color_row_by_status").default(false), // Color table rows based on status
  textAlign: varchar("text_align", { length: 20 }),
  freezeFirstColumn: boolean("freeze_first_column").default(false),
  autoKbAnalysis: boolean("auto_kb_analysis").default(false), // Auto-trigger WIC Coach + Aligner when threshold is met
  kbAnalysisThreshold: integer("kb_analysis_threshold").default(10), // Number of unanalyzed calls before auto-triggering
  loadingLogoUrl: text("loading_logo_url"), // Custom loading logo URL
  timezone: varchar("timezone", { length: 100 }), // IANA timezone (e.g., "America/New_York", "Europe/Warsaw")
  defaultTimezoneMode: varchar("default_timezone_mode", { length: 20 }).default('agent'), // 'agent' or 'customer' - default mode for new reminders
  timeFormat: varchar("time_format", { length: 10 }).default('12hr'), // '12hr' or '24hr' - time display format preference
  defaultCalendarReminders: jsonb("default_calendar_reminders").$type<Array<{method: 'popup' | 'email', minutes: number}>>().default(sql`'[{"method":"popup","minutes":0}]'::jsonb`), // Default Google Calendar reminder settings
  activeExcludedKeywords: text("active_excluded_keywords").array().default(sql`ARRAY[]::text[]`), // Keywords to filter out from Map Search results
  activeExcludedTypes: text("active_excluded_types").array().default(sql`ARRAY[]::text[]`), // Place types to exclude from Map Search API calls
  lastCategory: varchar("last_category", { length: 100 }), // Last selected category for Map Search (defaults to 'pet')
  selectedCategory: varchar("selected_category", { length: 100 }), // Category filter for CRM dashboard - users only see stores from this category
  autoLoadScript: boolean("auto_load_script").default(true), // Auto-load default script when clicking phone numbers
  viewAsAgent: boolean("view_as_agent").default(false), // For admins: toggle to view dashboard as an agent would see it
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
  
  // Simplified timezone handling: store local datetime as user sees it + IANA timezone
  scheduledDate: varchar("scheduled_date", { length: 10 }).notNull(), // YYYY-MM-DD in user's timezone
  scheduledTime: varchar("scheduled_time", { length: 5 }).notNull(), // HH:MM in 24hr format in user's timezone
  timezone: varchar("timezone", { length: 100 }).notNull(), // IANA timezone (e.g., "Europe/Warsaw", "America/New_York")
  
  // Legacy fields - kept for backward compatibility
  triggerDate: timestamp("trigger_date"),
  intervalDays: integer("interval_days"), // For recurring reminders
  lastTriggered: timestamp("last_triggered"),
  nextTrigger: timestamp("next_trigger"),
  scheduledAtUtc: timestamp("scheduled_at_utc"), // Deprecated - use scheduledDate/scheduledTime/timezone instead
  reminderTimeZone: varchar("reminder_time_zone", { length: 100 }), // Deprecated
  dueDate: timestamp("due_date"), // Deprecated
  
  isActive: boolean("is_active").default(true),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  sendEmail: boolean("send_email").default(true),
  addToCalendar: boolean("add_to_calendar").default(false),
  emailTemplate: varchar("email_template", { length: 50 }).default('default'), // 'default', 'follow_up', 'check_in', 'custom'
  customEmailSubject: varchar("custom_email_subject", { length: 200 }),
  customEmailBody: text("custom_email_body"),
  googleCalendarEventId: varchar("google_calendar_event_id"), // Google Calendar event ID for sync
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
}, (table) => [
  index("idx_reminders_user_scheduled").on(table.userId, table.scheduledDate),
]);

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
}, (table) => [
  index("idx_notifications_user_created").on(table.userId, table.createdAt),
]);

// Call History table - tracks phone calls made by agents
export const callHistory = pgTable("call_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  storeName: varchar("store_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  storeLink: varchar("store_link", { length: 500 }),
  calledAt: timestamp("called_at").defaultNow(),
}, (table) => [
  index("idx_call_history_agent_date").on(table.agentId, table.calledAt),
]);

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
}, (table) => [
  index("idx_projects_user_created").on(table.userId, table.createdAt),
]);

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
}, (table) => [
  index("idx_conversations_user_updated").on(table.userId, table.updatedAt),
]);

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
}, (table) => [
  index("idx_chat_messages_conversation_created").on(table.conversationId, table.createdAt),
]);

// Templates table - per-user library of email/script templates
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).default('Email'), // 'Email' or 'Script'
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // e.g., ['email', 'follow-up', 'objection-handler']
  isDefault: boolean("is_default").default(false), // Only one Script template can be default (auto-loads when phone clicked)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_templates_user_created").on(table.userId, table.createdAt),
]);

// User Tags table - personal tag collection per user for template organization
export const userTags = pgTable("user_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tag: varchar("tag", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_tags_user_id").on(table.userId),
]);

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

// Statuses table - system-wide status definitions with colors for light/dark modes
export const statuses = pgTable("statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayOrder: integer("display_order").notNull(),
  lightBgColor: varchar("light_bg_color", { length: 7 }).notNull(), // Hex color e.g. #dbeafe
  lightTextColor: varchar("light_text_color", { length: 7 }).notNull(), // Hex color e.g. #1e40af
  darkBgColor: varchar("dark_bg_color", { length: 7 }).notNull(), // Hex color e.g. #1e3a8a
  darkTextColor: varchar("dark_text_color", { length: 7 }).notNull(), // Hex color e.g. #bfdbfe
  isActive: boolean("is_active").default(true),
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
  userTags: many(userTags),
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

export const userTagsRelations = relations(userTags, ({ one }) => ({
  user: one(users, {
    fields: [userTags.userId],
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

export const callHistoryRelations = relations(callHistory, ({ one }) => ({
  agent: one(users, {
    fields: [callHistory.agentId],
    references: [users.id],
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

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  calculatedOn: true,
});

export const insertCsvUploadSchema = createInsertSchema(csvUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertGoogleSheetSchema = createInsertSchema(googleSheets).omit({
  id: true,
  createdAt: true,
});

export const insertSystemIntegrationSchema = createInsertSchema(systemIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertCallHistorySchema = createInsertSchema(callHistory).omit({
  id: true,
  calledAt: true,
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

export const insertUserTagSchema = createInsertSchema(userTags).omit({
  id: true,
  createdAt: true,
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

export const insertStatusSchema = createInsertSchema(statuses, {
  lightBgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  lightTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  darkBgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  darkTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Support Tickets table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 50 }).notNull().default('General Question'), // 'Bug Report', 'Feature Request', 'Technical Support', 'Account Issue', 'General Question', 'Other'
  status: varchar("status", { length: 20 }).notNull().default('open'), // 'open', 'in_progress', 'closed'
  priority: varchar("priority", { length: 20 }).default('normal'), // 'low', 'normal', 'high'
  lastReplyAt: timestamp("last_reply_at"),
  isUnreadByAdmin: boolean("is_unread_by_admin").notNull().default(true),
  isUnreadByUser: boolean("is_unread_by_user").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket Replies table
export const ticketReplies = pgTable("ticket_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Google Drive folder configuration - simple folder browser
export const driveFolders = pgTable("drive_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(), // Display name (e.g., "Cannabis", "Sales Materials")
  folderId: varchar("folder_id").notNull(), // Google Drive folder ID (extracted from URL)
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ElevenLabs API configuration (stores API key and Twilio number)
export const elevenLabsConfig = pgTable("elevenlabs_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKey: text("api_key").notNull(), // ElevenLabs API key
  phoneNumberId: varchar("phone_number_id", { length: 255 }), // ElevenLabs phone number ID for outbound calls
  twilioNumber: varchar("twilio_number", { length: 50 }), // Twilio phone number (for display only)
  webhookSecret: text("webhook_secret"), // Shared secret for webhook HMAC validation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ElevenLabs conversational AI agents
// ElevenLabs Phone Numbers - stores available phone numbers from ElevenLabs
export const elevenLabsPhoneNumbers = pgTable("elevenlabs_phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumberId: varchar("phone_number_id", { length: 255 }).notNull().unique(), // ElevenLabs phone number ID
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(), // Actual phone number (e.g., +1-845-668-4367)
  label: varchar("label", { length: 255 }), // Optional label/name for this number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const elevenLabsAgents = pgTable("elevenlabs_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(), // Display name (e.g., "Sales Cold Caller")
  agentId: varchar("agent_id", { length: 255 }).notNull(), // ElevenLabs agent ID
  phoneNumberId: varchar("phone_number_id", { length: 255 }), // ElevenLabs phone number ID for outbound calls (nullable)
  description: text("description"), // Purpose/description of this agent
  isDefault: boolean("is_default").default(false), // Default agent for calls
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice AI Call Sessions - main call records with AI analysis
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").unique(), // ElevenLabs conversation ID
  callSid: varchar("call_sid"), // Twilio call SID
  agentId: varchar("agent_id").notNull(), // ElevenLabs agent ID used
  clientId: varchar("client_id").notNull().references(() => clients.id), // Which store/client was called
  initiatedByUserId: varchar("initiated_by_user_id").references(() => users.id), // Which user started the call
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('initiated'), // 'initiated', 'in-progress', 'completed', 'failed', 'no-answer'
  callDurationSecs: integer("call_duration_secs"),
  costCredits: integer("cost_credits"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  lastAnalyzedAt: timestamp("last_analyzed_at"), // Track when call was last analyzed by Aligner to prevent duplicate analysis
  // AI Analysis (Step 2 - OpenAI Reflection)
  aiAnalysis: jsonb("ai_analysis").$type<{
    summary?: string;
    sentiment?: string;
    customerMood?: string;
    mainObjection?: string;
    keyMoment?: string;
    agentStrengths?: string;
    lessonLearned?: string;
  }>(),
  // Business Outcomes
  callSuccessful: boolean("call_successful"),
  interestLevel: varchar("interest_level", { length: 20 }), // 'hot', 'warm', 'cold', 'not-interested'
  followUpNeeded: boolean("follow_up_needed").default(false),
  followUpDate: timestamp("follow_up_date"),
  nextAction: text("next_action"),
  // Denormalized store snapshot for historical integrity
  storeSnapshot: jsonb("store_snapshot").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_call_sessions_client").on(table.clientId),
  index("idx_call_sessions_user").on(table.initiatedByUserId),
  index("idx_call_sessions_status").on(table.status),
  index("idx_call_sessions_started").on(table.startedAt),
  index("idx_call_sessions_agent_analyzed").on(table.agentId, table.lastAnalyzedAt),
]);

// Call Transcripts - conversation messages
export const callTranscripts = pgTable("call_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(), // Links to callSessions
  role: varchar("role", { length: 20 }).notNull(), // 'agent' or 'user'
  message: text("message").notNull(),
  timeInCallSecs: integer("time_in_call_secs"),
  toolCalls: jsonb("tool_calls"),
  toolResults: jsonb("tool_results"),
  metrics: jsonb("metrics").$type<Record<string, any>>(), // Latency, TTFB, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_call_transcripts_conversation").on(table.conversationId),
]);

// Call Events - status timeline and webhook payloads for debugging
export const callEvents = pgTable("call_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'webhook_received', 'status_change', 'error'
  status: varchar("status", { length: 50 }),
  payload: jsonb("payload").$type<Record<string, any>>(), // Full webhook payload for debugging
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_call_events_conversation").on(table.conversationId),
]);

// Call Campaigns - batch calling campaigns
export const callCampaigns = pgTable("call_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  scenario: varchar("scenario", { length: 50 }), // 'cold_call', 'follow_up', 'recovery', 'custom'
  agentId: varchar("agent_id").notNull(), // Which ElevenLabs agent to use
  createdByUserId: varchar("created_by_user_id").notNull().references(() => users.id),
  storeFilter: jsonb("store_filter").$type<Record<string, any>>(), // Filters used: {"status": "claimed", "state": "CA"}
  totalStores: integer("total_stores").default(0),
  status: varchar("status", { length: 50 }).notNull().default('scheduled'), // 'scheduled', 'in-progress', 'completed', 'cancelled'
  scheduledStart: timestamp("scheduled_start"),
  completedAt: timestamp("completed_at"),
  callsCompleted: integer("calls_completed").default(0),
  callsSuccessful: integer("calls_successful").default(0),
  callsFailed: integer("calls_failed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_call_campaigns_user").on(table.createdByUserId),
  index("idx_call_campaigns_status").on(table.status),
]);

// Call Campaign Targets - join table for campaign -> store mapping
export const callCampaignTargets = pgTable("call_campaign_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => callCampaigns.id, { onDelete: 'cascade' }),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  callSessionId: varchar("call_session_id").references(() => callSessions.id), // Links to actual call once made
  targetStatus: varchar("target_status", { length: 50 }).default('pending'), // 'pending', 'in-progress', 'completed', 'failed', 'skipped'
  scheduledFor: timestamp("scheduled_for"), // When this specific call should be made
  attemptCount: integer("attempt_count").default(0), // Number of call attempts made
  nextAttemptAt: timestamp("next_attempt_at"), // When to next attempt this call
  externalConversationId: varchar("external_conversation_id"), // ElevenLabs conversation ID
  lastError: text("last_error"), // Error message from last failed attempt
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_targets_campaign").on(table.campaignId),
  index("idx_campaign_targets_client").on(table.clientId),
  index("idx_campaign_targets_next_attempt").on(table.nextAttemptAt),
  index("idx_campaign_targets_status").on(table.targetStatus),
]);

// AI Insights - Historical tracking of call analysis
export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  agentId: varchar("agent_id"), // Optional filter: which ElevenLabs agent
  callCount: integer("call_count").notNull(),
  sentimentPositive: integer("sentiment_positive"),
  sentimentNeutral: integer("sentiment_neutral"),
  sentimentNegative: integer("sentiment_negative"),
  sentimentTrendsText: text("sentiment_trends_text"), // Text description of trends
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_insights_analyzed_at").on(table.analyzedAt),
  index("idx_ai_insights_agent").on(table.agentId),
]);

export const aiInsightObjections = pgTable("ai_insight_objections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").notNull().references(() => aiInsights.id, { onDelete: 'cascade' }),
  objection: text("objection").notNull(),
  frequency: integer("frequency").notNull(),
  exampleConversations: jsonb("example_conversations"), // Array of conversation metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_objections_insight").on(table.insightId),
]);

export const aiInsightPatterns = pgTable("ai_insight_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").notNull().references(() => aiInsights.id, { onDelete: 'cascade' }),
  pattern: text("pattern").notNull(),
  frequency: integer("frequency").notNull(),
  exampleConversations: jsonb("example_conversations"), // Array of conversation metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_patterns_insight").on(table.insightId),
]);

export const aiInsightRecommendations = pgTable("ai_insight_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").notNull().references(() => aiInsights.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority", { length: 20 }).notNull(), // 'high', 'medium', 'low'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recommendations_insight").on(table.insightId),
]);

// Knowledge Base Management - Self-evolving KB system
export const kbFiles = pgTable("kb_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  elevenlabsDocId: varchar("elevenlabs_doc_id").unique(), // ID from ElevenLabs API
  filename: varchar("filename", { length: 255 }).notNull().unique(), // Immutable, enforced by trigger
  currentContent: text("current_content"), // Latest approved content
  currentSyncVersion: varchar("current_sync_version"), // FK to kb_file_versions.id
  agentId: varchar("agent_id", { length: 255 }), // ElevenLabs agent ID (e.g., agent_7201k8xa9cshfmqvkd8tx3xf2j7a) - which agent this KB file is for
  locked: boolean("locked").default(false), // True if referenced in workflow nodes
  fileType: varchar("file_type", { length: 50 }).default('file'), // 'file', 'url', 'text'
  localUpdatedAt: timestamp("local_updated_at").defaultNow(), // Timestamp of last local edit (proposal approval, upload, etc.)
  elevenLabsUpdatedAt: timestamp("elevenlabs_updated_at"), // Timestamp from ElevenLabs API last modified date
  lastSyncedSource: varchar("last_synced_source", { length: 20 }), // 'local_to_remote', 'remote_to_local', or null
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_kb_files_filename").on(table.filename),
  index("idx_kb_files_locked_synced").on(table.locked, table.lastSyncedAt),
  index("idx_kb_files_agent").on(table.agentId),
]);

export const kbFileVersions = pgTable("kb_file_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kbFileId: varchar("kb_file_id").notNull().references(() => kbFiles.id, { onDelete: 'restrict' }), // Preserve history
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 50 }).notNull(), // 'elevenlabs_sync', 'aligner_approved', 'manual_edit'
  createdBy: varchar("created_by"), // User ID or 'system'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_kb_versions_file_id").on(table.kbFileId, table.createdAt),
  index("idx_kb_versions_number").on(table.kbFileId, table.versionNumber),
]);

export const kbChangeProposals = pgTable("kb_change_proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  kbFileId: varchar("kb_file_id").notNull().references(() => kbFiles.id, { onDelete: 'restrict' }),
  baseVersionId: varchar("base_version_id").notNull().references(() => kbFileVersions.id, { onDelete: 'restrict' }), // Optimistic locking
  proposedContent: text("proposed_content").notNull(),
  rationale: text("rationale"), // Why Aligner suggests this change
  aiInsightId: varchar("ai_insight_id").references(() => aiInsights.id), // Which analysis triggered it
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'approved', 'rejected', 'applied'
  appliedVersionId: varchar("applied_version_id").references(() => kbFileVersions.id, { onDelete: 'restrict' }), // Version created after approval
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"), // User ID
}, (table) => [
  index("idx_kb_proposals_status").on(table.status, table.createdAt),
  index("idx_kb_proposals_file_status").on(table.kbFileId, table.status),
]);

// Analysis Jobs - Track sequential call analysis progress
export const analysisJobs = pgTable("analysis_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(), // 'wick_coach', 'aligner', 'both'
  status: varchar("status", { length: 20 }).notNull().default('queued'), // 'queued', 'running', 'completed', 'failed', 'cancelled'
  agentId: varchar("agent_id"), // Optional filter: which ElevenLabs agent
  totalCalls: integer("total_calls").notNull(),
  currentCallIndex: integer("current_call_index").default(0), // Track progress through calls
  proposalsCreated: integer("proposals_created").default(0),
  insightId: varchar("insight_id").references(() => aiInsights.id), // Wick Coach insight if type includes wick_coach
  triggeredBy: varchar("triggered_by").notNull(), // 'manual' or 'auto_trigger'
  startedBy: varchar("started_by"), // User ID if manual
  errorMessage: text("error_message"), // If failed
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_analysis_jobs_status").on(table.status, table.createdAt),
  index("idx_analysis_jobs_agent").on(table.agentId),
]);

// OpenAI Assistants - Support multiple assistants with separate instructions and knowledge bases
export const openaiAssistants = pgTable("openai_assistants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(), // e.g., 'Sales Assistant', 'Aligner', 'Wick Coach'
  slug: varchar("slug", { length: 100 }).notNull().unique(), // e.g., 'sales-assistant', 'aligner', 'wick-coach'
  description: text("description"),
  assistantId: varchar("assistant_id"), // OpenAI assistant ID
  vectorStoreId: varchar("vector_store_id"), // OpenAI vector store ID for this assistant's KB
  instructions: text("instructions").notNull(), // System prompt for this assistant
  model: varchar("model", { length: 50 }).default('gpt-4o'), // OpenAI model to use
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_openai_assistants_slug").on(table.slug),
  index("idx_openai_assistants_active").on(table.isActive),
]);

// OpenAI Assistant Files - Link knowledge base files to specific assistants
export const openaiAssistantFiles = pgTable("openai_assistant_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assistantId: varchar("assistant_id").notNull().references(() => openaiAssistants.id, { onDelete: 'cascade' }),
  filename: varchar("filename", { length: 255 }).notNull(),
  openaiFileId: varchar("openai_file_id"), // OpenAI file ID
  fileSize: integer("file_size"), // in bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  category: varchar("category", { length: 100 }), // e.g., 'sales-script', 'objection-handling', 'product-info'
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastSyncedAt: timestamp("last_synced_at"),
}, (table) => [
  index("idx_assistant_files_assistant").on(table.assistantId),
]);

// Non-Duplicates tracking table
export const nonDuplicates = pgTable("non_duplicates", {
  id: integer("id").primaryKey(),
  link1: text("link1").notNull(),
  link2: text("link2").notNull(),
  markedByUserId: varchar("marked_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  markedAt: timestamp("marked_at").defaultNow(),
}, (table) => [
  index("idx_non_duplicates_links").on(table.link1, table.link2),
  index("idx_non_duplicates_links_reverse").on(table.link2, table.link1),
]);

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastReplyAt: true,
});

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({
  id: true,
  createdAt: true,
});

export const insertDriveFolderSchema = createInsertSchema(driveFolders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertElevenLabsConfigSchema = createInsertSchema(elevenLabsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertElevenLabsPhoneNumberSchema = createInsertSchema(elevenLabsPhoneNumbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertElevenLabsPhoneNumber = z.infer<typeof insertElevenLabsPhoneNumberSchema>;
export type ElevenLabsPhoneNumber = typeof elevenLabsPhoneNumbers.$inferSelect;

export const insertElevenLabsAgentSchema = createInsertSchema(elevenLabsAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallSessionSchema = createInsertSchema(callSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallTranscriptSchema = createInsertSchema(callTranscripts).omit({
  id: true,
  createdAt: true,
});

export const insertCallEventSchema = createInsertSchema(callEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCallCampaignSchema = createInsertSchema(callCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallCampaignTargetSchema = createInsertSchema(callCampaignTargets).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  analyzedAt: true,
  createdAt: true,
});

export const insertAiInsightObjectionSchema = createInsertSchema(aiInsightObjections).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightPatternSchema = createInsertSchema(aiInsightPatterns).omit({
  id: true,
  createdAt: true,
});

export const insertAiInsightRecommendationSchema = createInsertSchema(aiInsightRecommendations).omit({
  id: true,
  createdAt: true,
});

export const insertKbFileSchema = createInsertSchema(kbFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKbFileVersionSchema = createInsertSchema(kbFileVersions).omit({
  id: true,
  createdAt: true,
});

export const insertKbChangeProposalSchema = createInsertSchema(kbChangeProposals).omit({
  id: true,
  createdAt: true,
});

export const insertAnalysisJobSchema = createInsertSchema(analysisJobs).omit({
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
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type CsvUpload = typeof csvUploads.$inferSelect;
export type InsertCsvUpload = z.infer<typeof insertCsvUploadSchema>;
export type GoogleSheet = typeof googleSheets.$inferSelect;
export type InsertGoogleSheet = z.infer<typeof insertGoogleSheetSchema>;
export type SystemIntegration = typeof systemIntegrations.$inferSelect;
export type InsertSystemIntegration = z.infer<typeof insertSystemIntegrationSchema>;
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
export type CallHistory = typeof callHistory.$inferSelect;
export type InsertCallHistory = z.infer<typeof insertCallHistorySchema>;
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
export type UserTag = typeof userTags.$inferSelect;
export type InsertUserTag = z.infer<typeof insertUserTagSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SavedExclusion = typeof savedExclusions.$inferSelect;
export type InsertSavedExclusion = z.infer<typeof insertSavedExclusionSchema>;
export type Status = typeof statuses.$inferSelect;
export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type SelectStatus = typeof statuses.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type DriveFolder = typeof driveFolders.$inferSelect;
export type InsertDriveFolder = z.infer<typeof insertDriveFolderSchema>;
export type ElevenLabsConfig = typeof elevenLabsConfig.$inferSelect;
export type InsertElevenLabsConfig = z.infer<typeof insertElevenLabsConfigSchema>;
export type ElevenLabsAgent = typeof elevenLabsAgents.$inferSelect;
export type InsertElevenLabsAgent = z.infer<typeof insertElevenLabsAgentSchema>;
export type CallSession = typeof callSessions.$inferSelect;
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;
export type CallTranscript = typeof callTranscripts.$inferSelect;
export type InsertCallTranscript = z.infer<typeof insertCallTranscriptSchema>;
export type CallEvent = typeof callEvents.$inferSelect;
export type InsertCallEvent = z.infer<typeof insertCallEventSchema>;
export type CallCampaign = typeof callCampaigns.$inferSelect;
export type InsertCallCampaign = z.infer<typeof insertCallCampaignSchema>;
export type CallCampaignTarget = typeof callCampaignTargets.$inferSelect;
export type InsertCallCampaignTarget = z.infer<typeof insertCallCampaignTargetSchema>;
export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;
export type AiInsightObjection = typeof aiInsightObjections.$inferSelect;
export type InsertAiInsightObjection = z.infer<typeof insertAiInsightObjectionSchema>;
export type AiInsightPattern = typeof aiInsightPatterns.$inferSelect;
export type InsertAiInsightPattern = z.infer<typeof insertAiInsightPatternSchema>;
export type AiInsightRecommendation = typeof aiInsightRecommendations.$inferSelect;
export type InsertAiInsightRecommendation = z.infer<typeof insertAiInsightRecommendationSchema>;
export type KbFile = typeof kbFiles.$inferSelect;
export type InsertKbFile = z.infer<typeof insertKbFileSchema>;
export type KbFileVersion = typeof kbFileVersions.$inferSelect;
export type InsertKbFileVersion = z.infer<typeof insertKbFileVersionSchema>;
export type KbChangeProposal = typeof kbChangeProposals.$inferSelect;
export type InsertKbChangeProposal = z.infer<typeof insertKbChangeProposalSchema>;
export type AnalysisJob = typeof analysisJobs.$inferSelect;
export type InsertAnalysisJob = z.infer<typeof insertAnalysisJobSchema>;
export type NonDuplicate = typeof nonDuplicates.$inferSelect;
export type InsertNonDuplicate = Omit<typeof nonDuplicates.$inferInsert, 'id' | 'markedAt'>;