import {
  sequenceRecipientMessages,
  sequenceRecipients,
  sequences,
  type SequenceRecipient,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";

export async function getQueueViewStorage(): Promise<Array<SequenceRecipient & { sequenceName: string }>> {
  const results = await db
    .select({
      id: sequenceRecipients.id,
      sequenceId: sequenceRecipients.sequenceId,
      sequenceName: sequences.name,
      email: sequenceRecipients.email,
      name: sequenceRecipients.name,
      status: sequenceRecipients.status,
      currentStep: sequenceRecipients.currentStep,
      nextSendAt: sequenceRecipients.nextSendAt,
      lastStepSentAt: sequenceRecipients.lastStepSentAt,
      sentAt: sequenceRecipients.sentAt,
      businessHours: sequenceRecipients.businessHours,
      timezone: sequenceRecipients.timezone,
      salesSummary: sequenceRecipients.salesSummary,
      threadId: sequenceRecipients.threadId,
      createdAt: sequenceRecipients.createdAt,
      updatedAt: sequenceRecipients.updatedAt,
    })
    .from(sequenceRecipients)
    .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
    .where(
      or(
        eq(sequenceRecipients.status, 'pending'),
        eq(sequenceRecipients.status, 'in_sequence')
      )
    )
    .orderBy(sequenceRecipients.nextSendAt);

  return results as Array<SequenceRecipient & { sequenceName: string }>;
}

export async function getIndividualSendsQueueStorage(options: {
  search?: string;
  statusFilter?: 'active' | 'paused';
}): Promise<Array<{
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  sequenceId: string;
  sequenceName: string;
  stepNumber: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: 'sent' | 'scheduled' | 'overdue';
  subject: string | null;
  threadId: string | null;
  messageId: string | null;
}>> {
  const { search, statusFilter = 'active' } = options;

  const now = new Date();

  const whereConditions: any[] = [
    statusFilter === 'paused'
      ? eq(sequenceRecipients.status, 'paused')
      : or(
          eq(sequenceRecipients.status, 'pending'),
          eq(sequenceRecipients.status, 'in_sequence')
        )
  ];

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
    whereConditions.push(isNotNull(sequenceRecipients.nextSendAt));
  }

  const recipients = await db
    .select({
      id: sequenceRecipients.id,
      sequenceId: sequenceRecipients.sequenceId,
      sequenceName: sql<string>`COALESCE(${sequences.name}, '[Unnamed Sequence]')`.as('sequence_name'),
      email: sequenceRecipients.email,
      name: sequenceRecipients.name,
      status: sequenceRecipients.status,
      currentStep: sequenceRecipients.currentStep,
      nextSendAt: sequenceRecipients.nextSendAt,
      lastStepSentAt: sequenceRecipients.lastStepSentAt,
      threadId: sequenceRecipients.threadId,
      stepDelays: sequences.stepDelays,
      repeatLastStep: sequences.repeatLastStep,
    })
    .from(sequenceRecipients)
    .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
    .where(and(...whereConditions));

  const individualSends: Array<{
    recipientId: string;
    recipientEmail: string;
    recipientName: string;
    sequenceId: string;
    sequenceName: string;
    stepNumber: number;
    scheduledAt: Date | null;
    sentAt: Date | null;
    status: 'sent' | 'scheduled' | 'overdue';
    subject: string | null;
    threadId: string | null;
    messageId: string | null;
  }> = [];

  for (const recipient of recipients) {
    const sentMessages = await db
      .select()
      .from(sequenceRecipientMessages)
      .where(eq(sequenceRecipientMessages.recipientId, recipient.id))
      .orderBy(sequenceRecipientMessages.stepNumber);

    for (const message of sentMessages) {
      individualSends.push({
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        recipientName: recipient.name || '',
        sequenceId: recipient.sequenceId,
        sequenceName: recipient.sequenceName || '',
        stepNumber: message.stepNumber,
        scheduledAt: null,
        sentAt: message.sentAt,
        status: 'sent',
        subject: message.subject,
        threadId: message.threadId,
        messageId: message.messageId,
      });
    }

    if (statusFilter === 'paused') {
      continue;
    }

    if (recipient.nextSendAt) {
      const currentStep = recipient.currentStep || 0;
      const nextStep = currentStep + 1;
      const status: 'scheduled' | 'overdue' = recipient.nextSendAt < now ? 'overdue' : 'scheduled';

      individualSends.push({
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        recipientName: recipient.name || '',
        sequenceId: recipient.sequenceId,
        sequenceName: recipient.sequenceName || '',
        stepNumber: nextStep,
        scheduledAt: recipient.nextSendAt,
        sentAt: null,
        status,
        subject: null,
        threadId: recipient.threadId,
        messageId: null,
      });
    }
  }

  individualSends.sort((a, b) => {
    const timeA = a.sentAt || a.scheduledAt;
    const timeB = b.sentAt || b.scheduledAt;

    if (!timeA && !timeB) return a.recipientId.localeCompare(b.recipientId);
    if (!timeA) return 1;
    if (!timeB) return -1;

    const timeDiff = timeA.getTime() - timeB.getTime();
    if (timeDiff !== 0) return timeDiff;

    return a.recipientId.localeCompare(b.recipientId);
  });

  return individualSends.slice(0, 50);
}
