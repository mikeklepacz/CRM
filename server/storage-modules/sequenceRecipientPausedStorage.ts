import {
  sequenceRecipientMessages,
  sequenceRecipients,
  sequences,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";

export async function getPausedRecipientsStorage(tenantId?: string): Promise<Array<{
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  currentStep: number;
  totalSteps: number;
  lastStepSentAt: Date | null;
  pausedAt: Date | null;
  messageHistory: Array<{
    stepNumber: number;
    subject: string | null;
    sentAt: Date | null;
    threadId: string | null;
    messageId: string | null;
  }>;
}>> {
  const pausedRecipients = await db
    .select({
      id: sequenceRecipients.id,
      email: sequenceRecipients.email,
      name: sequenceRecipients.name,
      sequenceId: sequenceRecipients.sequenceId,
      currentStep: sequenceRecipients.currentStep,
      lastStepSentAt: sequenceRecipients.lastStepSentAt,
      updatedAt: sequenceRecipients.updatedAt,
      sequenceName: sequences.name,
      stepDelays: sequences.stepDelays,
    })
    .from(sequenceRecipients)
    .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
    .where(
      tenantId
        ? and(
            eq(sequenceRecipients.status, 'paused'),
            eq(sequenceRecipients.tenantId, tenantId)
          )
        : eq(sequenceRecipients.status, 'paused')
    );

  const result = [];

  for (const recipient of pausedRecipients) {
    const messages = await db
      .select({
        stepNumber: sequenceRecipientMessages.stepNumber,
        subject: sequenceRecipientMessages.subject,
        sentAt: sequenceRecipientMessages.sentAt,
        threadId: sequenceRecipientMessages.threadId,
        messageId: sequenceRecipientMessages.messageId,
      })
      .from(sequenceRecipientMessages)
      .where(eq(sequenceRecipientMessages.recipientId, recipient.id))
      .orderBy(sequenceRecipientMessages.stepNumber);

    const totalSteps = recipient.stepDelays ? recipient.stepDelays.length : 0;

    result.push({
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      recipientName: recipient.name || '',
      sequenceId: recipient.sequenceId,
      sequenceName: recipient.sequenceName || '',
      currentStep: recipient.currentStep || 0,
      totalSteps,
      lastStepSentAt: recipient.lastStepSentAt,
      pausedAt: recipient.updatedAt,
      messageHistory: messages,
    });
  }

  result.sort((a, b) => {
    if (!a.pausedAt && !b.pausedAt) return 0;
    if (!a.pausedAt) return 1;
    if (!b.pausedAt) return -1;
    return b.pausedAt.getTime() - a.pausedAt.getTime();
  });

  return result;
}

export async function getPausedRecipientsCountStorage(tenantId?: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(
            eq(sequenceRecipients.status, 'paused'),
            eq(sequenceRecipients.tenantId, tenantId)
          )
        : eq(sequenceRecipients.status, 'paused')
    );

  return Number(result[0]?.count || 0);
}
