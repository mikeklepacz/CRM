import { sequenceRecipients, sequences, users, type InsertSequence, type Sequence } from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, sql } from "drizzle-orm";

export async function createSequenceStorage(sequence: InsertSequence): Promise<Sequence> {
  const [created] = await db
    .insert(sequences)
    .values(sequence as any)
    .returning();
  return created;
}

export async function getSequenceStorage(id: string, tenantId: string): Promise<Sequence | undefined> {
  const [sequence] = await db
    .select()
    .from(sequences)
    .where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId)))
    .limit(1);
  return sequence;
}

export async function listSequencesStorage(
  tenantId: string,
  filters?: { createdBy?: string; status?: string; projectId?: string }
): Promise<Sequence[]> {
  const conditions = [eq(sequences.tenantId, tenantId)];
  if (filters?.createdBy) {
    conditions.push(eq(sequences.createdBy, filters.createdBy));
  }
  if (filters?.status) {
    conditions.push(eq(sequences.status, filters.status));
  }
  if (filters?.projectId) {
    conditions.push(eq(sequences.projectId, filters.projectId));
  }

  return await db.select().from(sequences).where(and(...conditions)).orderBy(desc(sequences.createdAt));
}

export async function updateSequenceStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertSequence>
): Promise<Sequence | undefined> {
  const [updated] = await db
    .update(sequences)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteSequenceStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db.delete(sequences).where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId))).returning();
  return result.length > 0;
}

export async function getOrCreateManualFollowUpsSequenceStorage(tenantId: string): Promise<Sequence> {
  const [existing] = await db
    .select()
    .from(sequences)
    .where(and(eq(sequences.isSystem, true), eq(sequences.tenantId, tenantId)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const adminUser = await getAdminUserForSequencesStorage();
  if (!adminUser) {
    throw new Error('No admin user found to create system sequence');
  }

  const [created] = await db
    .insert(sequences)
    .values({
      tenantId,
      name: 'Manual Follow-Ups',
      isSystem: true,
      status: 'paused',
      createdBy: adminUser.id,
      stepDelays: ['3', '7', '14'],
    })
    .returning();

  return created;
}

export async function getAdminUserForSequencesStorage(): Promise<{ id: string; name: string } | undefined> {
  const adminUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1);
  const admin = adminUsers[0];
  if (!admin) return undefined;
  return {
    id: admin.id,
    name: [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email || 'Admin',
  };
}

export async function updateSequenceStatsStorage(
  id: string,
  tenantId: string,
  stats: { sentCount?: number; failedCount?: number; repliedCount?: number; lastSentAt?: Date }
): Promise<Sequence> {
  const [updated] = await db
    .update(sequences)
    .set({ ...stats, updatedAt: new Date() })
    .where(and(eq(sequences.id, id), eq(sequences.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function incrementSequenceSentCountStorage(id: string, tenantId: string): Promise<void> {
  await db.execute(sql`
    UPDATE sequences
    SET
      sent_count = sent_count + 1,
      last_sent_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenantId}
  `);
}

export async function syncSequenceRecipientCountsStorage(
  tenantId: string
): Promise<{ updated: number; sequences: Array<{ id: string; name: string; oldCount: number; newCount: number }> }> {
  const allSequences = await db.select().from(sequences).where(eq(sequences.tenantId, tenantId));

  const results = [];
  let updated = 0;

  for (const sequence of allSequences) {
    const recipientCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sequenceRecipients)
      .where(
        and(
          eq(sequenceRecipients.sequenceId, sequence.id),
          sql`${sequenceRecipients.status} != 'removed'`
        )
      );

    const actualCount = recipientCount[0]?.count || 0;
    const oldCount = sequence.totalRecipients || 0;

    if (actualCount !== oldCount) {
      await db
        .update(sequences)
        .set({
          totalRecipients: actualCount,
          updatedAt: new Date()
        })
        .where(and(eq(sequences.id, sequence.id), eq(sequences.tenantId, tenantId)));

      results.push({
        id: sequence.id,
        name: sequence.name,
        oldCount,
        newCount: actualCount
      });
      updated++;
    }
  }

  return { updated, sequences: results };
}
