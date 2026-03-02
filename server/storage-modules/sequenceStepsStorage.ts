import {
  sequenceRecipientMessages,
  sequences,
  sequenceSteps,
  type InsertSequenceRecipientMessage,
  type InsertSequenceStep,
  type Sequence,
  type SequenceRecipientMessage,
  type SequenceStep,
} from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

export async function createSequenceStepStorage(step: InsertSequenceStep): Promise<SequenceStep> {
  const [created] = await db
    .insert(sequenceSteps)
    .values(step)
    .returning();
  return created;
}

export async function getSequenceStepsStorage(sequenceId: string): Promise<SequenceStep[]> {
  return await db
    .select()
    .from(sequenceSteps)
    .where(eq(sequenceSteps.sequenceId, sequenceId))
    .orderBy(sequenceSteps.stepNumber);
}

export async function updateSequenceStepStorage(id: string, updates: Partial<InsertSequenceStep>): Promise<SequenceStep> {
  const [updated] = await db
    .update(sequenceSteps)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(sequenceSteps.id, id))
    .returning();
  return updated;
}

export async function deleteSequenceStepStorage(id: string): Promise<boolean> {
  const result = await db.delete(sequenceSteps).where(eq(sequenceSteps.id, id)).returning();
  return result.length > 0;
}

export async function replaceSequenceStepsStorage(
  sequenceId: string,
  stepDelays: number[],
  tenantId: string
): Promise<SequenceStep[]> {
  for (let i = 0; i < stepDelays.length; i++) {
    if (stepDelays[i] < 0) {
      throw new Error(`Invalid step delay at index ${i}: must be non-negative`);
    }
    if (i > 0 && stepDelays[i] <= stepDelays[i - 1]) {
      throw new Error(`Invalid step delays: must be strictly ascending (got ${stepDelays[i - 1]} then ${stepDelays[i]})`);
    }
  }

  return await db.transaction(async (tx) => {
    await tx.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, sequenceId));

    if (stepDelays.length === 0) {
      return [];
    }

    const newSteps = stepDelays.map((delayDays, index) => ({
      sequenceId,
      stepNumber: index + 1,
      delayDays: delayDays.toString(),
      tenantId,
    }));

    const created = await tx.insert(sequenceSteps).values(newSteps as any).returning();

    await tx
      .update(sequences)
      .set({ stepDelays: stepDelays.map((d) => d.toString()), updatedAt: new Date() } as any)
      .where(eq(sequences.id, sequenceId));

    return created;
  });
}

export async function createRecipientMessageStorage(message: InsertSequenceRecipientMessage): Promise<SequenceRecipientMessage> {
  const [created] = await db
    .insert(sequenceRecipientMessages)
    .values(message)
    .returning();
  return created;
}

export async function getRecipientMessagesStorage(recipientId: string): Promise<SequenceRecipientMessage[]> {
  return await db
    .select()
    .from(sequenceRecipientMessages)
    .where(eq(sequenceRecipientMessages.recipientId, recipientId))
    .orderBy(sequenceRecipientMessages.sentAt);
}

export async function deleteRecipientMessagesStorage(recipientId: string): Promise<void> {
  await db
    .delete(sequenceRecipientMessages)
    .where(eq(sequenceRecipientMessages.recipientId, recipientId));
}

export async function appendSequenceStrategyMessagesStorage(
  sequenceId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string; createdBy?: string }>,
  threadId?: string
): Promise<Sequence> {
  const timestamp = new Date().toISOString();

  const newMessages = messages.map(msg => ({
    id: crypto.randomUUID(),
    role: msg.role,
    content: msg.content,
    createdAt: timestamp,
    createdBy: msg.createdBy,
  }));

  const result = await db.execute(sql`
    UPDATE sequences
    SET
      strategy_transcript = jsonb_build_object(
        'messages',
        COALESCE(strategy_transcript->'messages', '[]'::jsonb) || ${JSON.stringify(newMessages)}::jsonb,
        'lastUpdatedAt',
        ${timestamp}::text,
        'summary',
        COALESCE(strategy_transcript->'summary', 'null'::jsonb),
        'threadId',
        ${threadId ? sql`to_jsonb(${threadId}::text)` : sql`COALESCE(strategy_transcript->'threadId', 'null'::jsonb)`}
      ),
      updated_at = NOW()
    WHERE id = ${sequenceId}
    RETURNING *
  `);

  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error(`Sequence ${sequenceId} not found`);
  }

  return result.rows[0] as Sequence;
}
