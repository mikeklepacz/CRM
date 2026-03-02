import {
  ticketReplies,
  tickets,
  type InsertTicket,
  type InsertTicketReply,
  type Ticket,
  type TicketReply,
} from "@shared/schema";
import { db } from "../db";
import { desc, eq, sql } from "drizzle-orm";

export async function getAllTicketsStorage(): Promise<Ticket[]> {
  return await db
    .select()
    .from(tickets)
    .orderBy(desc(tickets.createdAt));
}

export async function getUserTicketsStorage(userId: string): Promise<Ticket[]> {
  return await db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.createdAt));
}

export async function getTicketStorage(id: string): Promise<Ticket | undefined> {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, id));
  return ticket;
}

export async function createTicketStorage(ticket: InsertTicket): Promise<Ticket> {
  const [newTicket] = await db
    .insert(tickets)
    .values(ticket)
    .returning();
  return newTicket;
}

export async function updateTicketStorage(id: string, updates: Partial<InsertTicket>): Promise<Ticket> {
  const [updated] = await db
    .update(tickets)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, id))
    .returning();
  return updated;
}

export async function getUnreadAdminCountStorage(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(eq(tickets.isUnreadByAdmin, true));
  return result[0]?.count || 0;
}

export async function markTicketReadByAdminStorage(id: string): Promise<Ticket> {
  const [updated] = await db
    .update(tickets)
    .set({ isUnreadByAdmin: false })
    .where(eq(tickets.id, id))
    .returning();
  return updated;
}

export async function markTicketReadByUserStorage(id: string): Promise<Ticket> {
  const [updated] = await db
    .update(tickets)
    .set({ isUnreadByUser: false })
    .where(eq(tickets.id, id))
    .returning();
  return updated;
}

export async function getTicketRepliesStorage(ticketId: string): Promise<TicketReply[]> {
  return await db
    .select()
    .from(ticketReplies)
    .where(eq(ticketReplies.ticketId, ticketId))
    .orderBy(ticketReplies.createdAt);
}

export async function createTicketReplyStorage(reply: InsertTicketReply): Promise<TicketReply> {
  const [newReply] = await db
    .insert(ticketReplies)
    .values(reply)
    .returning();

  await db
    .update(tickets)
    .set({
      lastReplyAt: new Date(),
      status: 'replied',
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, reply.ticketId));

  return newReply;
}
