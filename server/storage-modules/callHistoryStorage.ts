import { callHistory, type CallHistory, type InsertCallHistory } from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function createCallHistoryStorage(callData: InsertCallHistory): Promise<CallHistory> {
  const [newCall] = await db
    .insert(callHistory)
    .values(callData)
    .returning();
  return newCall;
}

export async function getUserCallHistoryStorage(userId: string, tenantId: string): Promise<CallHistory[]> {
  return await db
    .select()
    .from(callHistory)
    .where(and(eq(callHistory.agentId, userId), eq(callHistory.tenantId, tenantId)))
    .orderBy(desc(callHistory.calledAt));
}

export async function getAllCallHistoryStorage(tenantId: string, agentId?: string): Promise<CallHistory[]> {
  if (agentId) {
    return await db
      .select()
      .from(callHistory)
      .where(and(eq(callHistory.agentId, agentId), eq(callHistory.tenantId, tenantId)))
      .orderBy(desc(callHistory.calledAt));
  }
  return await db
    .select()
    .from(callHistory)
    .where(eq(callHistory.tenantId, tenantId))
    .orderBy(desc(callHistory.calledAt));
}
