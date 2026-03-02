import {
  sequenceRecipients,
  sequences,
  type InsertSequenceRecipient,
  type SequenceRecipient,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function updateRecipientStatusStorage(
  id: string,
  updates: Partial<InsertSequenceRecipient>
): Promise<SequenceRecipient> {
  const [updated] = await db
    .update(sequenceRecipients)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(sequenceRecipients.id, id))
    .returning();
  return updated;
}

export async function findRecipientByEmailStorage(
  sequenceId: string,
  email: string
): Promise<SequenceRecipient | undefined> {
  const [recipient] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      and(
        eq(sequenceRecipients.sequenceId, sequenceId),
        eq(sequenceRecipients.email, email)
      )
    )
    .limit(1);
  return recipient;
}

export async function pauseRecipientStorage(id: string, tenantId?: string): Promise<SequenceRecipient> {
  const [existing] = await db
    .select({ id: sequenceRecipients.id })
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  if (!existing) {
    throw new Error('Recipient not found');
  }

  const { releaseAllRecipientSlots } = await import('../services/Matrix2/matrix2Helper');
  await releaseAllRecipientSlots(id);

  const [updated] = await db
    .update(sequenceRecipients)
    .set({
      status: 'paused',
      nextSendAt: null,
      updatedAt: new Date()
    })
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .returning();

  if (!updated) {
    throw new Error('Recipient not found');
  }
  return updated;
}

export async function resumeRecipientStorage(id: string, tenantId?: string): Promise<SequenceRecipient> {
  const [result] = await db
    .select({
      recipient: sequenceRecipients,
      sequence: sequences,
    })
    .from(sequenceRecipients)
    .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  if (!result || !result.sequence) {
    throw new Error(`Recipient ${id} or sequence not found`);
  }

  const recipient = result.recipient;
  const sequence = result.sequence;
  const stepDelays = (sequence.stepDelays || []).map((d: string) => parseFloat(d));
  const currentStep = recipient.currentStep || 0;

  if (currentStep >= stepDelays.length && !sequence.repeatLastStep) {
    throw new Error(`Recipient ${id} has completed sequence and cannot be resumed`);
  }

  const [updated] = await db
    .update(sequenceRecipients)
    .set({
      status: 'in_sequence',
      nextSendAt: null,
      updatedAt: new Date()
    })
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .returning();
  if (!updated) {
    throw new Error(`Recipient ${id} not found`);
  }
  return updated;
}
