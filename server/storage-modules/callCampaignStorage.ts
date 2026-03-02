import {
  callCampaigns,
  callCampaignTargets,
  type CallCampaign,
  type CallCampaignTarget,
  type InsertCallCampaign,
  type InsertCallCampaignTarget,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";

export async function createCallCampaignStorage(campaign: InsertCallCampaign): Promise<CallCampaign> {
  const [newCampaign] = await db.insert(callCampaigns).values(campaign).returning();
  return newCampaign;
}

export async function getCallCampaignStorage(id: string, tenantId: string): Promise<CallCampaign | undefined> {
  const [campaign] = await db.select().from(callCampaigns).where(and(eq(callCampaigns.id, id), eq(callCampaigns.tenantId, tenantId)));
  return campaign;
}

export async function getCallCampaignsStorage(
  tenantId: string,
  filters?: { createdByUserId?: string; status?: string }
): Promise<CallCampaign[]> {
  const conditions = [eq(callCampaigns.tenantId, tenantId)];
  if (filters?.createdByUserId) conditions.push(eq(callCampaigns.createdByUserId, filters.createdByUserId));
  if (filters?.status) conditions.push(eq(callCampaigns.status, filters.status));

  return await db.select().from(callCampaigns).where(and(...conditions)).orderBy(desc(callCampaigns.createdAt));
}

export async function updateCallCampaignStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertCallCampaign>
): Promise<CallCampaign> {
  const [updated] = await db.update(callCampaigns)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(callCampaigns.id, id), eq(callCampaigns.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function createCallCampaignTargetStorage(target: InsertCallCampaignTarget): Promise<CallCampaignTarget> {
  const [newTarget] = await db.insert(callCampaignTargets).values(target).returning();
  return newTarget;
}

export async function getCallCampaignTargetStorage(id: string, tenantId: string): Promise<CallCampaignTarget | undefined> {
  const [target] = await db.select().from(callCampaignTargets).where(and(eq(callCampaignTargets.id, id), eq(callCampaignTargets.tenantId, tenantId)));
  return target;
}

export async function getCallCampaignTargetsStorage(campaignId: string, tenantId: string): Promise<CallCampaignTarget[]> {
  return await db.select().from(callCampaignTargets)
    .where(and(eq(callCampaignTargets.campaignId, campaignId), eq(callCampaignTargets.tenantId, tenantId)));
}

export async function getCallTargetsBySessionStorage(conversationId: string, tenantId: string): Promise<CallCampaignTarget[]> {
  return await db.select().from(callCampaignTargets)
    .where(and(eq(callCampaignTargets.externalConversationId, conversationId), eq(callCampaignTargets.tenantId, tenantId)));
}

export async function getCallTargetsReadyForCallingStorage(): Promise<CallCampaignTarget[]> {
  const now = new Date();
  return await db.select().from(callCampaignTargets)
    .where(
      and(
        eq(callCampaignTargets.targetStatus, 'pending'),
        or(
          lte(callCampaignTargets.nextAttemptAt, now),
          isNull(callCampaignTargets.nextAttemptAt)
        )
      )
    )
    .orderBy(callCampaignTargets.nextAttemptAt)
    .limit(50);
}

export async function updateCallCampaignTargetStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertCallCampaignTarget>
): Promise<CallCampaignTarget> {
  const [updated] = await db.update(callCampaignTargets)
    .set(updates)
    .where(and(eq(callCampaignTargets.id, id), eq(callCampaignTargets.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function incrementCampaignCallsStorage(
  campaignId: string,
  tenantId: string,
  type: 'successful' | 'failed'
): Promise<void> {
  const campaign = await getCallCampaignStorage(campaignId, tenantId);
  if (!campaign) return;

  const updates: any = {
    callsCompleted: (campaign.callsCompleted || 0) + 1,
    updatedAt: new Date(),
  };

  if (type === 'successful') {
    updates.callsSuccessful = (campaign.callsSuccessful || 0) + 1;
  } else {
    updates.callsFailed = (campaign.callsFailed || 0) + 1;
  }

  await db.update(callCampaigns)
    .set(updates)
    .where(and(eq(callCampaigns.id, campaignId), eq(callCampaigns.tenantId, tenantId)));
}
