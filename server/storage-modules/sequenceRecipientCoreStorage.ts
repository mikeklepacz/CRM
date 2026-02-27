import {
  sequenceRecipients,
  sequences,
  type InsertSequenceRecipient,
  type SequenceRecipient,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";

export async function addRecipientsStorage(recipients: InsertSequenceRecipient[]): Promise<SequenceRecipient[]> {
  if (recipients.length === 0) return [];

  const created = await db
    .insert(sequenceRecipients)
    .values(recipients)
    .returning();

  if (created.length > 0) {
    const countsBySequence = created.reduce((acc, recipient) => {
      acc[recipient.sequenceId] = (acc[recipient.sequenceId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [sequenceId, count] of Object.entries(countsBySequence)) {
      await db
        .update(sequences)
        .set({
          totalRecipients: sql`${sequences.totalRecipients} + ${count}`,
          updatedAt: new Date()
        })
        .where(eq(sequences.id, sequenceId));
    }
  }

  return created;
}

export async function getRecipientsStorage(
  sequenceId: string,
  filters?: { status?: string; limit?: number }
): Promise<SequenceRecipient[]> {
  let query: any = db
    .select()
    .from(sequenceRecipients)
    .where(eq(sequenceRecipients.sequenceId, sequenceId));

  if (filters?.status) {
    query = query.where(
      and(
        eq(sequenceRecipients.sequenceId, sequenceId),
        eq(sequenceRecipients.status, filters.status)
      )
    ) as any;
  }

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query.orderBy(desc(sequenceRecipients.createdAt));
}

export async function getRecipientStorage(id: string): Promise<SequenceRecipient | undefined> {
  const [recipient] = await db
    .select()
    .from(sequenceRecipients)
    .where(eq(sequenceRecipients.id, id))
    .limit(1);
  return recipient;
}

export async function getNextRecipientsToSendStorage(limit: number): Promise<SequenceRecipient[]> {
  const now = new Date();

  const followUps = await db
    .select()
    .from(sequenceRecipients)
    .where(
      and(
        eq(sequenceRecipients.status, 'in_sequence'),
        gt(sequenceRecipients.currentStep, 0),
        isNull(sequenceRecipients.repliedAt),
        or(
          isNull(sequenceRecipients.nextSendAt),
          lte(sequenceRecipients.nextSendAt, now)
        )
      )
    )
    .orderBy(sequenceRecipients.nextSendAt)
    .limit(limit);

  const remaining = limit - followUps.length;
  let freshEmails: SequenceRecipient[] = [];

  if (remaining > 0) {
    freshEmails = await db
      .select()
      .from(sequenceRecipients)
      .where(
        and(
          inArray(sequenceRecipients.status, ['pending', 'in_sequence']),
          eq(sequenceRecipients.currentStep, 0),
          isNull(sequenceRecipients.repliedAt),
          or(
            isNull(sequenceRecipients.nextSendAt),
            lte(sequenceRecipients.nextSendAt, now)
          )
        )
      )
      .orderBy(sequenceRecipients.nextSendAt)
      .limit(remaining);
  }

  return [...followUps, ...freshEmails];
}

export async function getAllPendingRecipientsStorage(): Promise<SequenceRecipient[]> {
  return await db
    .select()
    .from(sequenceRecipients)
    .where(
      inArray(sequenceRecipients.status, ['in_sequence', 'pending'])
    )
    .orderBy(sequenceRecipients.nextSendAt);
}

export async function getActiveRecipientsWithThreadsStorage(): Promise<SequenceRecipient[]> {
  return await db
    .select()
    .from(sequenceRecipients)
    .where(
      and(
        eq(sequenceRecipients.status, 'in_sequence'),
        isNotNull(sequenceRecipients.threadId),
        isNull(sequenceRecipients.repliedAt)
      )
    );
}
