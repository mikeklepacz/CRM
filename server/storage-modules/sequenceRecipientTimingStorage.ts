import { sequenceRecipients } from "@shared/schema";
import { db } from "../db";
import { and, gte, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";

export async function getQueueTailStorage(options?: { excludeRecipientId?: string }): Promise<Date | null> {
  const conditions = [
    inArray(sequenceRecipients.status, ['pending', 'in_sequence']),
    isNotNull(sequenceRecipients.nextSendAt),
  ];

  if (options?.excludeRecipientId) {
    conditions.push(ne(sequenceRecipients.id, options.excludeRecipientId));
  }

  try {
    const [result] = await db
      .select({ maxSendAt: sql<Date>`MAX(${sequenceRecipients.nextSendAt})` })
      .from(sequenceRecipients)
      .where(and(...conditions));

    return result?.maxSendAt || null;
  } catch (error) {
    console.error('[getQueueTail] Error querying queue tail:', error);
    return null;
  }
}

export async function getDailyScheduledCountStorage(options?: { date?: Date; excludeRecipientId?: string }): Promise<number> {
  const now = options?.date || new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const conditions = [
    inArray(sequenceRecipients.status, ['pending', 'in_sequence']),
    isNotNull(sequenceRecipients.nextSendAt),
    gte(sequenceRecipients.nextSendAt, now),
    lt(sequenceRecipients.nextSendAt, next24Hours),
  ];

  if (options?.excludeRecipientId) {
    conditions.push(ne(sequenceRecipients.id, options.excludeRecipientId));
  }

  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sequenceRecipients)
      .where(and(...conditions));

    return Number(result?.count || 0);
  } catch (error) {
    console.error('[getDailyScheduledCount] Error counting scheduled sends:', error);
    return 0;
  }
}
