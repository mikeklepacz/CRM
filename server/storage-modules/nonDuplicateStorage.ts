import {
  callCampaignTargets,
  callSessions,
  nonDuplicates,
  type CallSession,
  type NonDuplicate,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, lte } from "drizzle-orm";

export async function markAsNotDuplicateStorage(
  link1: string,
  link2: string,
  userId: string,
  tenantId: string
): Promise<NonDuplicate> {
  const [first, second] = link1 < link2 ? [link1, link2] : [link2, link1];

  const [result] = await db
    .insert(nonDuplicates)
    .values({
      link1: first,
      link2: second,
      markedByUserId: userId,
      tenantId,
    } as any)
    .onConflictDoNothing()
    .returning();

  if (!result) {
    const [existing] = await db
      .select()
      .from(nonDuplicates)
      .where(and(eq(nonDuplicates.link1, first), eq(nonDuplicates.link2, second)));
    return existing;
  }

  return result;
}

export async function isMarkedAsNotDuplicateStorage(link1: string, link2: string): Promise<boolean> {
  const [first, second] = link1 < link2 ? [link1, link2] : [link2, link1];

  const [result] = await db
    .select()
    .from(nonDuplicates)
    .where(and(eq(nonDuplicates.link1, first), eq(nonDuplicates.link2, second)))
    .limit(1);

  return !!result;
}

export async function getAllNonDuplicatesStorage(): Promise<NonDuplicate[]> {
  return await db.select().from(nonDuplicates);
}

export async function removeNonDuplicateMarkStorage(link1: string, link2: string): Promise<void> {
  const [first, second] = link1 < link2 ? [link1, link2] : [link2, link1];

  await db
    .delete(nonDuplicates)
    .where(and(eq(nonDuplicates.link1, first), eq(nonDuplicates.link2, second)));
}

export async function getStaleInProgressTargetsStorage(beforeDate: Date): Promise<any[]> {
  return await db
    .select()
    .from(callCampaignTargets)
    .where(and(eq(callCampaignTargets.targetStatus, "in-progress"), lte(callCampaignTargets.createdAt, beforeDate)));
}

export async function getStaleInitiatedSessionsStorage(beforeDate: Date): Promise<CallSession[]> {
  return await db
    .select()
    .from(callSessions)
    .where(and(eq(callSessions.status, "initiated"), lte(callSessions.startedAt, beforeDate)));
}

export async function markStaleSessionsAsFailedStorage(beforeDate: Date): Promise<number> {
  const result = await db
    .update(callSessions)
    .set({
      status: "failed",
      updatedAt: new Date(),
    })
    .where(and(eq(callSessions.status, "initiated"), lte(callSessions.startedAt, beforeDate)))
    .returning({ id: callSessions.id });
  return result.length;
}
