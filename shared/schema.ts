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

// Client data table - stores CSV data + tracking fields
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // CSV data stored as JSONB for flexibility
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
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  syncedAt: timestamp("synced_at").defaultNow(),
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
