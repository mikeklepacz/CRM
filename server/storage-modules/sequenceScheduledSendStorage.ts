import {
  sequenceRecipients,
  sequenceScheduledSends,
  sequences,
  type InsertSequenceScheduledSend,
  type SequenceScheduledSend,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";

export async function insertScheduledSendsStorage(sends: InsertSequenceScheduledSend[]): Promise<SequenceScheduledSend[]> {
  if (sends.length === 0) return [];

  const created = await db
    .insert(sequenceScheduledSends)
    .values(sends)
    .returning();
  return created;
}

export async function getNextScheduledSendsStorage(limit: number): Promise<SequenceScheduledSend[]> {
  const now = new Date();

  const results = await db
    .select()
    .from(sequenceScheduledSends)
    .innerJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
    .where(
      and(
        eq(sequenceScheduledSends.status, 'pending'),
        lte(sequenceScheduledSends.scheduledAt, now),
        or(
          eq(sequences.status, 'active'),
          eq(sequenceScheduledSends.manualOverride, true)
        )
      )
    )
    .orderBy(
      sql`CASE WHEN ${sequenceScheduledSends.stepNumber} = 1 THEN 0 ELSE 1 END`,
      sequenceScheduledSends.scheduledAt
    )
    .limit(limit);

  return results.map(row => row.sequence_scheduled_sends);
}

export async function getUpcomingScheduledSendsStorage(limit: number): Promise<SequenceScheduledSend[]> {
  return await db
    .select()
    .from(sequenceScheduledSends)
    .where(eq(sequenceScheduledSends.status, 'pending'))
    .orderBy(sequenceScheduledSends.scheduledAt)
    .limit(limit);
}

export async function getLastScheduledSendForUserStorage(userId: string): Promise<SequenceScheduledSend | null> {
  const results = await db
    .select()
    .from(sequenceScheduledSends)
    .innerJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
    .where(
      and(
        eq(sequences.createdBy, userId),
        isNotNull(sequenceScheduledSends.scheduledAt)
      )
    )
    .orderBy(desc(sequenceScheduledSends.scheduledAt))
    .limit(1);

  return results.length > 0 ? results[0].sequence_scheduled_sends : null;
}

export async function clearScheduledAtForPendingSendsStorage(imminentThreshold: Date): Promise<number> {
  const updated = await db
    .update(sequenceScheduledSends)
    .set({
      scheduledAt: null,
      jitterMinutes: null
    })
    .where(and(
      eq(sequenceScheduledSends.status, 'pending'),
      or(
        isNull(sequenceScheduledSends.scheduledAt),
        gte(sequenceScheduledSends.scheduledAt, imminentThreshold)
      )
    ))
    .returning({ recipientId: sequenceScheduledSends.recipientId });

  if (updated.length > 0) {
    const recipientIds = [...new Set(updated.map(r => r.recipientId))];
    await db
      .update(sequenceRecipients)
      .set({ nextSendAt: null })
      .where(inArray(sequenceRecipients.id, recipientIds));
  }

  return updated.length;
}

export async function deleteRecipientScheduledSendsStorage(recipientId: string): Promise<number> {
  const deleted = await db
    .delete(sequenceScheduledSends)
    .where(and(
      eq(sequenceScheduledSends.recipientId, recipientId),
      eq(sequenceScheduledSends.status, 'pending')
    ))
    .returning();
  return deleted.length;
}

export async function deleteAllPendingScheduledSendsStorage(sequenceId?: string): Promise<number> {
  const conditions = [eq(sequenceScheduledSends.status, 'pending')];

  if (sequenceId) {
    conditions.push(eq(sequenceScheduledSends.sequenceId, sequenceId));
  }

  const deleted = await db
    .delete(sequenceScheduledSends)
    .where(and(...conditions))
    .returning();
  return deleted.length;
}

export async function updateScheduledSendStorage(
  id: string,
  updates: Partial<InsertSequenceScheduledSend>
): Promise<SequenceScheduledSend> {
  const [updated] = await db
    .update(sequenceScheduledSends)
    .set(updates)
    .where(eq(sequenceScheduledSends.id, id))
    .returning();
  return updated;
}

export async function claimScheduledSendStorage(id: string): Promise<boolean> {
  const [updated] = await db
    .update(sequenceScheduledSends)
    .set({ status: 'processing' })
    .where(and(
      eq(sequenceScheduledSends.id, id),
      eq(sequenceScheduledSends.status, 'pending')
    ))
    .returning();
  return !!updated;
}

export async function getScheduledSendsByRecipientStorage(recipientId: string): Promise<SequenceScheduledSend[]> {
  return await db
    .select()
    .from(sequenceScheduledSends)
    .where(eq(sequenceScheduledSends.recipientId, recipientId))
    .orderBy(sequenceScheduledSends.scheduledAt);
}

export async function getScheduledSendsQueueStorage(options: {
  search?: string;
  statusFilter?: 'active' | 'paused';
  limit: number;
  timeWindowDays?: number;
}): Promise<Array<{
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  stepNumber: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: 'sent' | 'scheduled' | 'overdue' | 'open';
  subject: string | null;
  threadId: string | null;
  messageId: string | null;
}>> {
  const { search, statusFilter = 'active', limit, timeWindowDays = 3 } = options;

  const now = new Date();
  const endTime = new Date(now.getTime() + timeWindowDays * 24 * 60 * 60 * 1000);
  const nowUtc = now.toISOString();

  const whereConditions: any[] = [];

  if (statusFilter === 'paused') {
    whereConditions.push(eq(sequenceRecipients.status, 'paused'));
  } else {
    whereConditions.push(
      or(
        eq(sequenceRecipients.status, 'pending'),
        eq(sequenceRecipients.status, 'in_sequence')
      )
    );
  }

  whereConditions.push(eq(sequenceScheduledSends.status, 'pending'));

  if (search && search.trim()) {
    const searchLower = search.trim().toLowerCase();
    whereConditions.push(
      or(
        sql`LOWER(${sequenceRecipients.email}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${sequenceRecipients.name}) LIKE ${`%${searchLower}%`}`
      )
    );
  }

  if (statusFilter === 'active') {
    whereConditions.push(
      and(
        isNotNull(sequenceScheduledSends.scheduledAt),
        lte(sequenceScheduledSends.scheduledAt, endTime)
      )
    );
  }

  const query = db
    .select({
      id: sequenceScheduledSends.id,
      recipientId: sequenceScheduledSends.recipientId,
      recipientEmail: sequenceRecipients.email,
      recipientName: sequenceRecipients.name,
      sequenceId: sequenceScheduledSends.sequenceId,
      sequenceName: sql<string>`COALESCE(${sequences.name}, '[Unnamed Sequence]')`.as('sequence_name'),
      stepNumber: sequenceScheduledSends.stepNumber,
      scheduledAt: sequenceScheduledSends.scheduledAt,
      sentAt: sequenceScheduledSends.sentAt,
      sendStatus: sequenceScheduledSends.status,
      subject: sequenceScheduledSends.subject,
      threadId: sequenceScheduledSends.threadId,
      messageId: sequenceScheduledSends.messageId,
    })
    .from(sequenceScheduledSends)
    .innerJoin(sequenceRecipients, eq(sequenceScheduledSends.recipientId, sequenceRecipients.id))
    .leftJoin(sequences, eq(sequenceScheduledSends.sequenceId, sequences.id))
    .where(and(...whereConditions))
    .orderBy(sequenceScheduledSends.scheduledAt)
    .limit(limit);

  const results = await query;

  return results.map((row: any) => ({
    recipientId: row.recipientId,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    sequenceId: row.sequenceId,
    sequenceName: row.sequenceName,
    stepNumber: row.stepNumber,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    status: row.sendStatus === 'sent'
      ? 'sent'
      : (row.scheduledAt && row.scheduledAt < now ? 'overdue' : 'scheduled'),
    subject: row.subject,
    threadId: row.threadId,
    messageId: row.messageId,
  }));
}
