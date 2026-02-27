import { callEvents, type CallEvent, type InsertCallEvent } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function createCallEventStorage(event: InsertCallEvent): Promise<CallEvent> {
  const [newEvent] = await db.insert(callEvents).values(event).returning();
  return newEvent;
}

export async function getCallEventsStorage(conversationId: string): Promise<CallEvent[]> {
  return await db.select().from(callEvents)
    .where(eq(callEvents.conversationId, conversationId))
    .orderBy(callEvents.createdAt);
}
