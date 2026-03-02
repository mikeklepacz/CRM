import {
  commissions,
  notes,
  orders,
  type Commission,
  type InsertCommission,
  type InsertNote,
  type InsertOrder,
  type Note,
  type Order,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getClientNotesStorage(clientId: string, tenantId: string): Promise<Note[]> {
  return await db
    .select()
    .from(notes)
    .where(and(eq(notes.clientId, clientId), eq(notes.tenantId, tenantId)))
    .orderBy(notes.createdAt);
}

export async function createNoteStorage(note: InsertNote): Promise<Note> {
  const [newNote] = await db.insert(notes).values(note).returning();
  return newNote;
}

export async function createOrderStorage(order: InsertOrder): Promise<Order> {
  const [newOrder] = await db.insert(orders).values(order).returning();
  return newOrder;
}

export async function getOrderByIdStorage(id: string, tenantId: string): Promise<Order | undefined> {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
  return order;
}

export async function updateOrderStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertOrder>
): Promise<Order> {
  const [updated] = await db
    .update(orders)
    .set(updates)
    .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function getAllOrdersStorage(tenantId: string): Promise<Order[]> {
  return await db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(orders.orderDate);
}

export async function deleteOrderStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(orders).where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
}

export async function createCommissionStorage(commission: InsertCommission): Promise<Commission> {
  const [newCommission] = await db.insert(commissions).values(commission).returning();
  return newCommission;
}

export async function getCommissionsByAgentStorage(agentId: string, tenantId: string): Promise<Commission[]> {
  return await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.agentId, agentId), eq(commissions.tenantId, tenantId)))
    .orderBy(desc(commissions.calculatedOn));
}

export async function getCommissionsByOrderStorage(orderId: string, tenantId: string): Promise<Commission[]> {
  return await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.orderId, orderId), eq(commissions.tenantId, tenantId)));
}

export async function deleteCommissionsByOrderStorage(orderId: string, tenantId: string): Promise<void> {
  await db.delete(commissions).where(and(eq(commissions.orderId, orderId), eq(commissions.tenantId, tenantId)));
}

export async function getOrdersByClientStorage(clientId: string, tenantId: string): Promise<Order[]> {
  return await db
    .select()
    .from(orders)
    .where(and(eq(orders.clientId, clientId), eq(orders.tenantId, tenantId)))
    .orderBy(desc(orders.orderDate));
}
