import {
  callSessions,
  type CallSession,
  type InsertCallSession,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";

export async function createCallSessionStorage(session: InsertCallSession): Promise<CallSession> {
  const [newSession] = await db.insert(callSessions).values(session as any).returning();
  return newSession;
}

export async function getCallSessionStorage(id: string, tenantId: string): Promise<CallSession | undefined> {
  const [session] = await db.select().from(callSessions).where(and(eq(callSessions.id, id), eq(callSessions.tenantId, tenantId)));
  return session;
}

export async function getCallSessionByConversationIdStorage(conversationId: string, tenantId: string): Promise<CallSession | undefined> {
  const [session] = await db.select().from(callSessions).where(and(eq(callSessions.conversationId, conversationId), eq(callSessions.tenantId, tenantId)));
  return session;
}

export async function getCallSessionByCallSidStorage(callSid: string, tenantId: string): Promise<CallSession | undefined> {
  const [session] = await db.select().from(callSessions).where(and(eq(callSessions.callSid, callSid), eq(callSessions.tenantId, tenantId)));
  return session;
}

export async function getCallSessionByCallSidOnlyStorage(callSid: string): Promise<CallSession | undefined> {
  const [session] = await db.select().from(callSessions).where(eq(callSessions.callSid, callSid));
  return session;
}

export async function getOrphanedCallSessionsStorage(tenantId: string): Promise<CallSession[]> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return await db.select().from(callSessions)
    .where(and(
      eq(callSessions.tenantId, tenantId),
      or(
        eq(callSessions.status, 'completed'),
        eq(callSessions.status, 'in-progress')
      ),
      or(
        isNull(callSessions.conversationId),
        isNull(callSessions.aiAnalysis)
      ),
      gt(callSessions.startedAt, twoHoursAgo)
    ))
    .orderBy(desc(callSessions.startedAt));
}

export async function getCallSessionsStorage(
  tenantId: string,
  filters?: { clientId?: string; initiatedByUserId?: string; status?: string; qualificationLeadId?: string }
): Promise<CallSession[]> {
  const conditions = [eq(callSessions.tenantId, tenantId)];
  if (filters?.clientId) conditions.push(eq(callSessions.clientId, filters.clientId));
  if (filters?.initiatedByUserId) conditions.push(eq(callSessions.initiatedByUserId, filters.initiatedByUserId));
  if (filters?.status) conditions.push(eq(callSessions.status, filters.status));
  if (filters?.qualificationLeadId) conditions.push(eq(callSessions.qualificationLeadId, filters.qualificationLeadId));

  return await db.select().from(callSessions).where(and(...conditions)).orderBy(desc(callSessions.startedAt));
}

export async function updateCallSessionStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertCallSession>
): Promise<CallSession> {
  const [updated] = await db.update(callSessions)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(callSessions.id, id), eq(callSessions.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function updateCallSessionByConversationIdStorage(
  conversationId: string,
  tenantId: string,
  updates: Partial<InsertCallSession>
): Promise<CallSession> {
  const [updated] = await db.update(callSessions)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(callSessions.conversationId, conversationId), eq(callSessions.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteCallSessionStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(callSessions).where(and(eq(callSessions.id, id), eq(callSessions.tenantId, tenantId)));
}

export async function markCallsAsAnalyzedStorage(conversationIds: string[]): Promise<void> {
  if (conversationIds.length === 0) return;

  await db.update(callSessions)
    .set({ lastAnalyzedAt: new Date() })
    .where(inArray(callSessions.conversationId, conversationIds));
}
