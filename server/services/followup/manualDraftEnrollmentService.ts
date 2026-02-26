import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { emailBlacklist, sequenceRecipientMessages, sequenceRecipients, sequences, userPreferences } from "@shared/schema";
import { storage } from "../../storage";

type EnrollManualFollowUpParams = {
  tenantId: string;
  userId: string;
  recipientEmail: string;
  subject?: string | null;
  body?: string | null;
  clientLink?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  enforceClientLink?: boolean;
  respectBlacklistPreference?: boolean;
  updateSentStats?: boolean;
  setExplicitTimestamps?: boolean;
};

type EnrollManualFollowUpResult = {
  enrolled: boolean;
  reason?: "missing_client_link" | "blacklisted" | "already_enrolled";
};

export async function enrollManualFollowUpRecipient(
  params: EnrollManualFollowUpParams
): Promise<EnrollManualFollowUpResult> {
  const {
    tenantId,
    userId,
    recipientEmail,
    subject,
    body,
    clientLink,
    threadId,
    messageId,
    enforceClientLink = false,
    respectBlacklistPreference = false,
    updateSentStats = false,
    setExplicitTimestamps = false,
  } = params;

  if (enforceClientLink && !clientLink) {
    return { enrolled: false, reason: "missing_client_link" };
  }

  if (respectBlacklistPreference) {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    const blacklistCheckEnabled = prefs?.blacklistCheckEnabled ?? true;

    if (blacklistCheckEnabled) {
      const [blacklisted] = await db
        .select()
        .from(emailBlacklist)
        .where(eq(emailBlacklist.email, recipientEmail.toLowerCase()))
        .limit(1);

      if (blacklisted) {
        return { enrolled: false, reason: "blacklisted" };
      }
    }
  }

  const manualFollowUpsSequence = await storage.getOrCreateManualFollowUpsSequence(tenantId);

  const [existing] = await db
    .select()
    .from(sequenceRecipients)
    .where(
      and(
        eq(sequenceRecipients.sequenceId, manualFollowUpsSequence.id),
        eq(sequenceRecipients.email, recipientEmail)
      )
    )
    .limit(1);

  if (existing) {
    return { enrolled: false, reason: "already_enrolled" };
  }

  const recipientInsertValues: any = {
    sequenceId: manualFollowUpsSequence.id,
    tenantId,
    name: recipientEmail,
    email: recipientEmail,
    link: clientLink || null,
    status: "awaiting_reply",
    currentStep: 1,
  };

  if (setExplicitTimestamps) {
    recipientInsertValues.nextSendAt = null;
    recipientInsertValues.createdAt = new Date();
    recipientInsertValues.updatedAt = new Date();
  }

  const [newRecipient] = await db.insert(sequenceRecipients).values(recipientInsertValues).returning();

  await db.insert(sequenceRecipientMessages).values({
    recipientId: newRecipient.id,
    tenantId,
    stepNumber: 1,
    subject: subject || "(No subject)",
    body: body || "",
    sentAt: new Date(),
    threadId: threadId || null,
    messageId: messageId || null,
    createdAt: new Date(),
  });

  if (updateSentStats) {
    await db
      .update(sequences)
      .set({
        totalRecipients: sql`${sequences.totalRecipients} + 1`,
        sentCount: sql`${sequences.sentCount} + 1`,
        lastSentAt: new Date(),
      })
      .where(eq(sequences.id, manualFollowUpsSequence.id));
  } else {
    await db
      .update(sequences)
      .set({
        totalRecipients: sql`${sequences.totalRecipients} + 1`,
      })
      .where(eq(sequences.id, manualFollowUpsSequence.id));
  }

  return { enrolled: true };
}
