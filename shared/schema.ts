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
  referredBy: varchar("referred_by").references(() => users.id), // MLM: who referred this user
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
  uniqueIdentifier: varchar("unique_identifier").unique(), // Leafly link or other unique ID
  googleSheetId: varchar("google_sheet_id"), // ID of the connected Google Sheet
  googleSheetRowId: integer("google_sheet_row_id"), // Row number in Google Sheet
  // CSV/Sheet data stored as JSONB for flexibility
  data: jsonb("data").notNull().$type<Record<string, any>>(),
  // Tracking fields
  assignedAgent: varchar("assigned_agent").references(() => users.id),
  claimDate: timestamp("claim_date"),
  status: varchar("status", { length: 50 }).default('unassigned'), // unassigned, claimed, active, inactive
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
  // Google OAuth credentials
  googleClientId: varchar("google_client_id"),
  googleClientSecret: varchar("google_client_secret"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: bigint("google_token_expiry", { mode: "number" }),
  googleEmail: varchar("google_email"),
  googleConnectedAt: timestamp("google_connected_at"),
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

// User preferences for Client Dashboard view - syncs across devices
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
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    bodyBackground: string;
    headerBackground: string;
    statusColors?: { [status: string]: { background: string; text: string } };
  }>(),
  darkModeColors: jsonb("dark_mode_colors").$type<{
    background: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
    bodyBackground: string;
    headerBackground: string;
    statusColors?: { [status: string]: { background: string; text: string } };
  }>(),
  textAlign: varchar("text_align", { length: 20 }),
  freezeFirstColumn: boolean("freeze_first_column").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  csvUploads: many(csvUploads),
  assignedClients: many(clients),
  notes: many(notes),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  assignedAgentUser: one(users, {
    fields: [clients.assignedAgent],
    references: [users.id],
  }),
  notes: many(notes),
  orders: many(orders),
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