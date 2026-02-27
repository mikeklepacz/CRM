import {
  dailySendSlots,
  sequenceRecipientMessages,
  sequenceRecipients,
  sequences,
  testDataNukeLog,
  testEmailSends,
  type InsertTestDataNukeLog,
  type InsertTestEmailSend,
  type TestDataNukeLog,
  type TestEmailSend,
} from "@shared/schema";
import { db } from "../db";
import { desc, eq, gt, or, sql } from "drizzle-orm";

export async function createTestEmailSendStorage(testSend: InsertTestEmailSend): Promise<TestEmailSend> {
  const [created] = await db.insert(testEmailSends).values(testSend).returning();
  return created;
}

export async function updateTestEmailSendStatusStorage(id: string, updates: Partial<InsertTestEmailSend>): Promise<TestEmailSend> {
  const [updated] = await db
    .update(testEmailSends)
    .set(updates)
    .where(eq(testEmailSends.id, id))
    .returning();
  return updated;
}

export async function getTestEmailSendByThreadIdStorage(threadId: string): Promise<TestEmailSend | undefined> {
  const [testSend] = await db
    .select()
    .from(testEmailSends)
    .where(eq(testEmailSends.gmailThreadId, threadId))
    .limit(1);
  return testSend;
}

export async function getTestEmailSendByIdStorage(id: string): Promise<TestEmailSend | undefined> {
  const [testSend] = await db
    .select()
    .from(testEmailSends)
    .where(eq(testEmailSends.id, id))
    .limit(1);
  return testSend;
}

export async function listTestEmailSendsForUserStorage(userId: string): Promise<TestEmailSend[]> {
  return await db
    .select()
    .from(testEmailSends)
    .where(eq(testEmailSends.createdBy, userId))
    .orderBy(desc(testEmailSends.createdAt))
    .limit(50);
}

export async function getTestDataNukeCountsStorage(emailPattern?: string): Promise<{
  recipientsCount: number;
  messagesCount: number;
  testEmailsCount: number;
  slotsCount: number;
}> {
  const buildEmailFilter = (emailColumn: any) => {
    if (!emailPattern) {
      return sql`1=1`;
    }
    const sanitizedPattern = emailPattern.includes('%') || emailPattern.includes('_')
      ? emailPattern
      : `%${emailPattern}%`;
    return sql`${emailColumn} ILIKE ${sanitizedPattern}`;
  };

  const [recipientsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sequenceRecipients)
    .where(buildEmailFilter(sequenceRecipients.email));

  const recipientsCount = recipientsResult?.count || 0;

  const [messagesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sequenceRecipientMessages)
    .where(sql`${sequenceRecipientMessages.recipientId} IN (
      SELECT ${sequenceRecipients.id}
      FROM ${sequenceRecipients}
      WHERE ${buildEmailFilter(sequenceRecipients.email)}
    )`);

  const messagesCount = messagesResult?.count || 0;

  const [testEmailsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testEmailSends)
    .where(buildEmailFilter(testEmailSends.recipientEmail));

  const testEmailsCount = testEmailsResult?.count || 0;

  const [slotsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dailySendSlots)
    .where(sql`${dailySendSlots.recipientId} IN (
      SELECT CAST(${sequenceRecipients.id} AS uuid)
      FROM ${sequenceRecipients}
      WHERE ${buildEmailFilter(sequenceRecipients.email)}
    )`);

  const slotsCount = slotsResult?.count || 0;

  return {
    recipientsCount,
    messagesCount,
    testEmailsCount,
    slotsCount,
  };
}

export async function nukeTestDataStorage(userId: string, tenantId: string, emailPattern?: string): Promise<{
  recipientsDeleted: number;
  messagesDeleted: number;
  testEmailsDeleted: number;
  slotsDeleted: number;
}> {
  return await db.transaction(async (tx) => {
    const buildEmailFilter = (emailColumn: any) => {
      if (!emailPattern) {
        return sql`1=1`;
      }
      const sanitizedPattern = emailPattern.includes('%') || emailPattern.includes('_')
        ? emailPattern
        : `%${emailPattern}%`;
      return sql`${emailColumn} ILIKE ${sanitizedPattern}`;
    };

    const affectedRecipients = await tx
      .select({ sequenceId: sequenceRecipients.sequenceId })
      .from(sequenceRecipients)
      .where(buildEmailFilter(sequenceRecipients.email));

    const affectedSequenceIds = [...new Set(affectedRecipients.map((r) => r.sequenceId))];

    const deletedMessages = await tx
      .delete(sequenceRecipientMessages)
      .where(sql`${sequenceRecipientMessages.recipientId} IN (
        SELECT ${sequenceRecipients.id}
        FROM ${sequenceRecipients}
        WHERE ${buildEmailFilter(sequenceRecipients.email)}
      )`)
      .returning({ id: sequenceRecipientMessages.id });

    const messagesDeleted = deletedMessages.length;

    const deletedSlots = await tx
      .delete(dailySendSlots)
      .where(sql`${dailySendSlots.recipientId} IN (
        SELECT CAST(${sequenceRecipients.id} AS uuid)
        FROM ${sequenceRecipients}
        WHERE ${buildEmailFilter(sequenceRecipients.email)}
      )`)
      .returning({ id: dailySendSlots.id });

    const slotsDeleted = deletedSlots.length;

    const deletedRecipients = await tx
      .delete(sequenceRecipients)
      .where(buildEmailFilter(sequenceRecipients.email))
      .returning({ id: sequenceRecipients.id });

    const recipientsDeleted = deletedRecipients.length;

    const deletedTestEmails = await tx
      .delete(testEmailSends)
      .where(buildEmailFilter(testEmailSends.recipientEmail))
      .returning({ id: testEmailSends.id });

    const testEmailsDeleted = deletedTestEmails.length;

    const sequencesWithCounts = await tx
      .select({ id: sequences.id })
      .from(sequences)
      .where(
        or(
          gt(sequences.totalRecipients, 0),
          gt(sequences.sentCount, 0),
          gt(sequences.repliedCount, 0),
          gt(sequences.failedCount, 0),
          gt(sequences.bouncedCount, 0)
        )
      );

    const allSequenceIdsToFix = [...new Set([
      ...affectedSequenceIds,
      ...sequencesWithCounts.map((s) => s.id),
    ])];

    for (const sequenceId of allSequenceIdsToFix) {
      const [recipientCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(sequenceRecipients)
        .where(eq(sequenceRecipients.sequenceId, sequenceId));

      const remainingRecipients = recipientCount?.count || 0;

      if (remainingRecipients === 0) {
        await tx
          .update(sequences)
          .set({
            totalRecipients: 0,
            sentCount: 0,
            failedCount: 0,
            repliedCount: 0,
            bouncedCount: 0,
            lastSentAt: null,
            updatedAt: new Date(),
          })
          .where(eq(sequences.id, sequenceId));
      } else {
        const [stats] = await tx
          .select({
            sent: sql<number>`count(*) filter (where ${sequenceRecipientMessages.sentAt} is not null)::int`,
            replied: sql<number>`count(distinct ${sequenceRecipients.id}) filter (where ${sequenceRecipients.repliedAt} is not null)::int`,
            failed: sql<number>`count(distinct ${sequenceRecipients.id}) filter (where ${sequenceRecipients.status} = 'failed')::int`,
            bounced: sql<number>`count(distinct ${sequenceRecipients.id}) filter (where ${sequenceRecipients.bounceType} is not null)::int`,
            lastSent: sql<Date>`max(${sequenceRecipientMessages.sentAt})`,
          })
          .from(sequenceRecipients)
          .leftJoin(sequenceRecipientMessages, eq(sequenceRecipients.id, sequenceRecipientMessages.recipientId))
          .where(eq(sequenceRecipients.sequenceId, sequenceId));

        await tx
          .update(sequences)
          .set({
            totalRecipients: remainingRecipients,
            sentCount: stats?.sent || 0,
            repliedCount: stats?.replied || 0,
            failedCount: stats?.failed || 0,
            bouncedCount: stats?.bounced || 0,
            lastSentAt: stats?.lastSent || null,
            updatedAt: new Date(),
          })
          .where(eq(sequences.id, sequenceId));
      }
    }

    await tx.insert(testDataNukeLog).values({
      executedBy: userId,
      tenantId,
      emailPattern: emailPattern || null,
      recipientsDeleted,
      messagesDeleted,
      testEmailsDeleted,
    });

    return {
      recipientsDeleted,
      messagesDeleted,
      testEmailsDeleted,
      slotsDeleted,
    };
  });
}

export async function logTestDataNukeStorage(log: InsertTestDataNukeLog): Promise<TestDataNukeLog> {
  const [created] = await db.insert(testDataNukeLog).values(log).returning();
  return created;
}
