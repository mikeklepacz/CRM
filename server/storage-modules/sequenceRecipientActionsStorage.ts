import {
  sequenceRecipientMessages,
  sequenceRecipients,
  sequences,
  type SequenceRecipient,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, sql } from "drizzle-orm";

export async function removeRecipientStorage(id: string, tenantId?: string): Promise<SequenceRecipient> {
  const [recipient] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  if (!recipient) {
    throw new Error('Recipient not found');
  }

  const { releaseAllRecipientSlots } = await import('../services/Matrix2/matrix2Helper');
  await releaseAllRecipientSlots(id);

  await db
    .delete(sequenceRecipientMessages)
    .where(
      tenantId
        ? and(
            eq(sequenceRecipientMessages.recipientId, id),
            eq(sequenceRecipientMessages.tenantId, tenantId)
          )
        : eq(sequenceRecipientMessages.recipientId, id)
    );

  await db
    .delete(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    );

  await db
    .update(sequences)
    .set({
      totalRecipients: sql`GREATEST(${sequences.totalRecipients} - 1, 0)`,
      updatedAt: new Date()
    })
    .where(eq(sequences.id, recipient.sequenceId));

  return recipient;
}

export async function sendRecipientNowStorage(id: string, tenantId?: string): Promise<SequenceRecipient> {
  const [recipient] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  if (!recipient) {
    throw new Error(`Recipient ${id} not found`);
  }

  if (recipient.status !== 'pending' && recipient.status !== 'in_sequence') {
    throw new Error(`Cannot send: recipient status is ${recipient.status}`);
  }

  const { getRecipientSlot, forceSendNow } = await import('../services/Matrix2/matrix2Helper');
  const slot = await getRecipientSlot(id);

  if (!slot) {
    throw new Error('No slot assigned for this recipient');
  }

  await forceSendNow(slot.id);

  const { triggerImmediateQueueProcess } = await import('../services/emailQueue');
  triggerImmediateQueueProcess().catch(err => {
    console.error('[Storage] Error triggering immediate queue process:', err);
  });

  const [updated] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  return updated!;
}

export async function delayRecipientStorage(id: string, hours: number, tenantId?: string): Promise<SequenceRecipient> {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
    throw new Error('Hours must be a finite number between 0 and 720 (30 days)');
  }

  const [recipient] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  if (!recipient) {
    throw new Error(`Recipient ${id} not found`);
  }

  if (recipient.status !== 'pending' && recipient.status !== 'in_sequence') {
    throw new Error(`Cannot delay: recipient status is ${recipient.status}`);
  }

  const { getRecipientSlot, updateSlotTime } = await import('../services/Matrix2/matrix2Helper');
  const slot = await getRecipientSlot(id);

  if (!slot) {
    throw new Error('No slot assigned for this recipient');
  }

  const delayMs = hours * 60 * 60 * 1000;
  const newSlotTime = new Date(slot.slotTimeUtc.getTime() + delayMs);

  await updateSlotTime(slot.id, newSlotTime);

  const [updated] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  return updated!;
}

export async function skipRecipientStepStorage(id: string, tenantId?: string): Promise<SequenceRecipient> {
  const [recipientData] = await db
    .select({
      recipient: sequenceRecipients,
      stepDelays: sequences.stepDelays,
      repeatLastStep: sequences.repeatLastStep,
    })
    .from(sequenceRecipients)
    .leftJoin(sequences, eq(sequenceRecipients.sequenceId, sequences.id))
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .limit(1);

  if (!recipientData) {
    throw new Error(`Recipient ${id} not found`);
  }

  const { recipient, stepDelays, repeatLastStep } = recipientData;
  const oldCurrentStep = recipient.currentStep || 0;
  const newStep = oldCurrentStep + 1;
  const delays = stepDelays ? stepDelays.map((d: string) => parseFloat(d)) : [];
  const now = new Date();

  const { releaseAllRecipientSlots } = await import('../services/Matrix2/matrix2Helper');
  await releaseAllRecipientSlots(id);

  let recipientStatus = 'in_sequence';
  if (newStep >= delays.length && !repeatLastStep) {
    recipientStatus = 'completed';
  }

  const [updated] = await db
    .update(sequenceRecipients)
    .set({
      currentStep: newStep,
      nextSendAt: null,
      status: recipientStatus,
      updatedAt: now
    })
    .where(
      tenantId
        ? and(eq(sequenceRecipients.id, id), eq(sequenceRecipients.tenantId, tenantId))
        : eq(sequenceRecipients.id, id)
    )
    .returning();

  return updated;
}
