import {
  categories,
  qualificationCampaigns,
  qualificationLeads,
  type InsertQualificationCampaign,
  type InsertQualificationLead,
  type QualificationCampaign,
  type QualificationLead,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

export async function listQualificationCampaignsStorage(tenantId: string): Promise<QualificationCampaign[]> {
  return await db.select()
    .from(qualificationCampaigns)
    .where(eq(qualificationCampaigns.tenantId, tenantId))
    .orderBy(desc(qualificationCampaigns.createdAt));
}

export async function getActiveQualificationCampaignStorage(tenantId: string): Promise<QualificationCampaign | undefined> {
  const [campaign] = await db.select()
    .from(qualificationCampaigns)
    .where(and(
      eq(qualificationCampaigns.tenantId, tenantId),
      eq(qualificationCampaigns.isActive, true)
    ))
    .orderBy(desc(qualificationCampaigns.createdAt))
    .limit(1);
  return campaign;
}

export async function getQualificationCampaignStorage(id: string, tenantId: string): Promise<QualificationCampaign | undefined> {
  const [campaign] = await db.select()
    .from(qualificationCampaigns)
    .where(and(eq(qualificationCampaigns.id, id), eq(qualificationCampaigns.tenantId, tenantId)));
  return campaign;
}

export async function createQualificationCampaignStorage(data: InsertQualificationCampaign): Promise<QualificationCampaign> {
  const [created] = await db.insert(qualificationCampaigns).values(data as any).returning();
  return created;
}

export async function updateQualificationCampaignStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertQualificationCampaign>
): Promise<QualificationCampaign> {
  const [updated] = await db.update(qualificationCampaigns)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(qualificationCampaigns.id, id), eq(qualificationCampaigns.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteQualificationCampaignStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db.delete(qualificationCampaigns)
    .where(and(eq(qualificationCampaigns.id, id), eq(qualificationCampaigns.tenantId, tenantId)));
  return (result as any).rowCount > 0;
}

export async function listQualificationLeadsStorage(
  tenantId: string,
  filters?: { campaignId?: string; status?: string; callStatus?: string; projectId?: string; limit?: number; offset?: number }
): Promise<{ leads: QualificationLead[]; total: number }> {
  const conditions = [eq(qualificationLeads.tenantId, tenantId)];

  if (filters?.campaignId) {
    conditions.push(eq(qualificationLeads.campaignId, filters.campaignId));
  }
  if (filters?.status) {
    conditions.push(eq(qualificationLeads.status, filters.status));
  }
  if (filters?.callStatus) {
    conditions.push(eq(qualificationLeads.callStatus, filters.callStatus));
  }

  if (filters?.projectId) {
    const projectCategories = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(
        eq(categories.tenantId, tenantId),
        or(eq(categories.projectId, filters.projectId), isNull(categories.projectId))
      ));
    const categoryNames = projectCategories.map(c => c.name.toLowerCase());

    if (categoryNames.length > 0) {
      conditions.push(or(
        eq(qualificationLeads.projectId, filters.projectId),
        and(
          isNull(qualificationLeads.projectId),
          inArray(sql`LOWER(${qualificationLeads.category})`, categoryNames)
        )
      ) as any);
    } else {
      conditions.push(eq(qualificationLeads.projectId, filters.projectId));
    }
  }

  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const leads = await db.select()
    .from(qualificationLeads)
    .where(and(...conditions))
    .orderBy(desc(qualificationLeads.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(qualificationLeads)
    .where(and(...conditions));

  return { leads, total: Number(count) };
}

export async function getQualificationLeadStorage(id: string, tenantId: string): Promise<QualificationLead | undefined> {
  const [lead] = await db.select()
    .from(qualificationLeads)
    .where(and(eq(qualificationLeads.id, id), eq(qualificationLeads.tenantId, tenantId)));
  return lead;
}

export async function findQualificationLeadBySourceIdStorage(tenantId: string, sourceId: string): Promise<QualificationLead | undefined> {
  const [lead] = await db.select()
    .from(qualificationLeads)
    .where(and(
      eq(qualificationLeads.tenantId, tenantId),
      eq(qualificationLeads.sourceId, sourceId)
    ));
  return lead;
}

export async function createQualificationLeadStorage(data: InsertQualificationLead): Promise<QualificationLead> {
  const [created] = await db.insert(qualificationLeads).values(data as any).returning();
  return created;
}

export async function createQualificationLeadsStorage(leads: InsertQualificationLead[]): Promise<QualificationLead[]> {
  if (leads.length === 0) return [];
  return await db.insert(qualificationLeads).values(leads as any).returning();
}

export async function updateQualificationLeadStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertQualificationLead>
): Promise<QualificationLead> {
  const [updated] = await db.update(qualificationLeads)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(qualificationLeads.id, id), eq(qualificationLeads.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteQualificationLeadStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db.delete(qualificationLeads)
    .where(and(eq(qualificationLeads.id, id), eq(qualificationLeads.tenantId, tenantId)));
  return (result as any).rowCount > 0;
}

export async function deleteQualificationLeadsStorage(ids: string[], tenantId: string): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await db.delete(qualificationLeads)
    .where(and(inArray(qualificationLeads.id, ids), eq(qualificationLeads.tenantId, tenantId)));
  return (result as any).rowCount || 0;
}

export async function getQualificationLeadStatsStorage(
  tenantId: string,
  campaignId?: string,
  projectId?: string
): Promise<{ total: number; byStatus: Record<string, number>; byCallStatus: Record<string, number>; averageScore: number | null }> {
  const conditions = [eq(qualificationLeads.tenantId, tenantId)];
  if (campaignId) {
    conditions.push(eq(qualificationLeads.campaignId, campaignId));
  }

  if (projectId) {
    const projectCategories = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(
        eq(categories.tenantId, tenantId),
        or(eq(categories.projectId, projectId), isNull(categories.projectId))
      ));
    const categoryNames = projectCategories.map(c => c.name.toLowerCase());

    if (categoryNames.length > 0) {
      conditions.push(or(
        eq(qualificationLeads.projectId, projectId),
        and(
          isNull(qualificationLeads.projectId),
          inArray(sql`LOWER(${qualificationLeads.category})`, categoryNames)
        )
      ) as any);
    } else {
      conditions.push(eq(qualificationLeads.projectId, projectId));
    }
  }

  const leads = await db.select()
    .from(qualificationLeads)
    .where(and(...conditions));

  const byStatus: Record<string, number> = {};
  const byCallStatus: Record<string, number> = {};
  let scoreSum = 0;
  let scoreCount = 0;

  for (const lead of leads) {
    const status = lead.status || 'new';
    const callStatus = lead.callStatus || 'pending';
    byStatus[status] = (byStatus[status] || 0) + 1;
    byCallStatus[callStatus] = (byCallStatus[callStatus] || 0) + 1;
    if (lead.score !== null) {
      scoreSum += lead.score;
      scoreCount++;
    }
  }

  return {
    total: leads.length,
    byStatus,
    byCallStatus,
    averageScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
  };
}
