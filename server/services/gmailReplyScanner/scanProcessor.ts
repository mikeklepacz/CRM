import { db } from "../../db";
import { sequenceRecipientMessages, sequenceRecipients } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import type { GmailMessage, ScanResult } from "./types";

export async function processDeduplicatedMessage(params: {
  message: GmailMessage;
  result: ScanResult;
  dryRun: boolean;
  selectedEmails?: string[];
  waitDays: number;
  cutoffDate: Date;
  hasReply: boolean;
  effectiveTenantId: string;
  systemSequence: any;
  isBlacklisted: (email: string) => Promise<boolean>;
}) {
  const {
    message,
    result,
    dryRun,
    selectedEmails,
    waitDays,
    cutoffDate,
    hasReply,
    effectiveTenantId,
    systemSequence,
    isBlacklisted,
  } = params;

  result.scanned++;

  try {
    const blacklisted = await isBlacklisted(message.to);
    if (blacklisted) {
      result.details.push({
        email: message.to,
        status: "blacklisted",
        message: "Email is blacklisted - skipped",
      });
      return;
    }

    const [existingRecipient] = await db
      .select()
      .from(sequenceRecipients)
      .where(and(eq(sequenceRecipients.sequenceId, systemSequence.id), eq(sequenceRecipients.email, message.to)))
      .limit(1);

    const sentDate = new Date(parseInt(message.internalDate));
    const isOldEnough = sentDate <= cutoffDate;

    if (existingRecipient) {
      if (existingRecipient.currentStep === 1 && existingRecipient.status === "awaiting_reply") {
        if (hasReply) {
          if (!dryRun) {
            await db
              .update(sequenceRecipients)
              .set({
                status: "replied",
                nextSendAt: null,
                updatedAt: new Date(),
              })
              .where(eq(sequenceRecipients.id, existingRecipient.id));
          }

          result.details.push({
            recipientId: existingRecipient.id,
            email: message.to,
            status: "has_reply",
            message: dryRun ? "Has reply (dry run)" : "Marked as replied",
          });
        } else if (isOldEnough) {
          if (!dryRun) {
            const stepDelay = systemSequence.stepDelays?.[2] || 3;
            const nextSendAt = new Date();
            nextSendAt.setDate(nextSendAt.getDate() + Number(stepDelay));

            await db
              .update(sequenceRecipients)
              .set({
                currentStep: 2,
                status: "in_sequence",
                nextSendAt,
                updatedAt: new Date(),
              })
              .where(eq(sequenceRecipients.id, existingRecipient.id));

            result.promoted++;
          }

          result.details.push({
            recipientId: existingRecipient.id,
            email: message.to,
            status: "promoted",
            message: dryRun ? "Ready to promote (dry run)" : "Promoted to Step 2",
          });
        } else {
          const daysOld = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
          result.details.push({
            recipientId: existingRecipient.id,
            email: message.to,
            status: "too_recent",
            message: `Sent ${daysOld} days ago, waiting for ${waitDays} days`,
          });
        }
      }
      return;
    }

    if (hasReply) {
      result.details.push({
        email: message.to,
        status: "has_reply",
        message: "Already has reply - not enrolled",
        isNew: true,
      });
      return;
    }

    const shouldEnroll = !selectedEmails || selectedEmails.includes(message.to);
    if (!dryRun && !shouldEnroll) {
      return;
    }

    if (!dryRun) {
      const [newRecipient] = await db
        .insert(sequenceRecipients)
        .values({
          tenantId: effectiveTenantId,
          sequenceId: systemSequence.id,
          name: message.to,
          email: message.to,
          currentStep: 1,
          status: "awaiting_reply",
          nextSendAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await db.insert(sequenceRecipientMessages).values({
        tenantId: effectiveTenantId,
        recipientId: newRecipient.id,
        stepNumber: 1,
        messageId: message.id,
        threadId: message.threadId,
        subject: message.subject || "(No subject)",
        body: message.body || "",
        sentAt: sentDate,
        createdAt: new Date(),
      });

      result.newEnrollments++;

      if (isOldEnough) {
        const stepDelay = systemSequence.stepDelays?.[2] || 3;
        const nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + Number(stepDelay));

        await db
          .update(sequenceRecipients)
          .set({
            currentStep: 2,
            status: "in_sequence",
            nextSendAt,
            updatedAt: new Date(),
          })
          .where(eq(sequenceRecipients.id, newRecipient.id));

        result.promoted++;

        result.details.push({
          recipientId: newRecipient.id,
          email: message.to,
          status: "promoted",
          message: "Newly enrolled and promoted to Step 2",
          isNew: true,
        });
      } else {
        const daysOld = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
        result.details.push({
          recipientId: newRecipient.id,
          email: message.to,
          status: "newly_enrolled",
          message: `Enrolled at Step 1 (sent ${daysOld} days ago, waiting for ${waitDays} days)`,
          isNew: true,
        });
      }
      return;
    }

    const daysOld = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (isOldEnough) {
      result.details.push({
        email: message.to,
        status: "promoted",
        message: `Would be enrolled and promoted to Step 2 (sent ${daysOld} days ago)`,
        isNew: true,
      });
    } else {
      result.details.push({
        email: message.to,
        status: "newly_enrolled",
        message: `Would be enrolled at Step 1 (sent ${daysOld} days ago, needs ${waitDays - daysOld} more days)`,
        isNew: true,
      });
    }
  } catch (error: any) {
    console.error(`[ReplyScanner] Error processing ${message.to}:`, error);
    result.errors++;
    result.details.push({
      email: message.to,
      status: "error",
      message: error.message || "Unknown error",
    });
  }
}
