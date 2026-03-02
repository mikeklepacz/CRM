// server/services/emailQueue.ts
// ensureDailySlots imported but not used in this file - slot generation handled by slotGenerator
// import { ensureDailySlots } from "./Matrix2/slotGenerator";
import { assignRecipientsToSlots } from "./Matrix2/slotAssigner";
import { storage } from "../storage";
import { sendEmailToRecipient } from "./emailSender";
import { markSlotSent } from "./Matrix2/slotDb";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { dailySendSlots, sequenceRecipients } from "../../shared/schema";
import { formatInTimeZone } from "date-fns-tz";
import { shouldSendEmail } from "./replyGuard";
import { resolveTenantTimezone } from "./tenantTimezone";
import { cleanupExpiredUnsentSlots, getDueFilledSlots } from "./emailQueueSlots";

// Queue state
let isProcessing = false;
let queueInterval: NodeJS.Timeout | null = null;
const EHUB_DEBUG = process.env.E_HUB_DEBUG === "1";

function debugLog(message: string, data?: Record<string, unknown>) {
  if (!EHUB_DEBUG) return;
  if (data) {
    console.log(`[EHubQueue] ${message}`, data);
    return;
  }
  console.log(`[EHubQueue] ${message}`);
}

export async function processEmailQueue() {
  return processEmailQueueWithOptions({ ignoreSendingWindow: false });
}

async function processEmailQueueWithOptions(options: { ignoreSendingWindow: boolean }) {
  const tenantId = await storage.getAdminTenantId();
  if (!tenantId) {
    debugLog("Skipping cycle: no admin tenant");
    return;
  }
  
  const settings = await storage.getEhubSettings(tenantId);
  if (!settings) {
    debugLog("Skipping cycle: no E-Hub settings", { tenantId });
    return;
  }

  // Check if we're within sending hours (admin timezone from user preferences)
  const adminTz = await getAdminTimezone(tenantId);
  const now = new Date();
  const currentHour = parseInt(formatInTimeZone(now, adminTz, 'HH'));
  const sendingHoursStart = settings.sendingHoursStart || 6;
  // Compute end hour from duration (Phase 1-3: support both duration and end hour for backwards compat)
  const duration = settings.sendingHoursDuration || ((settings.sendingHoursEnd || 23) - sendingHoursStart) || 5;
  const sendingHoursEnd = (sendingHoursStart + duration) % 24;
  
  // Only send emails during configured sending hours
  // (Slot assignment happens on-demand when recipients are enrolled)
  // For windows crossing midnight (e.g., 20-04), check differently
  const inSendingWindow = duration >= 24 
    ? true // 24-hour window, always in range
    : sendingHoursEnd > sendingHoursStart
      ? currentHour >= sendingHoursStart && currentHour < sendingHoursEnd
      : currentHour >= sendingHoursStart || currentHour < sendingHoursEnd;
  
  if (!options.ignoreSendingWindow && !inSendingWindow) {
    debugLog("Skipping cycle: outside sending window", {
      tenantId,
      adminTz,
      currentHour,
      sendingHoursStart,
      sendingHoursEnd,
      duration,
    });
    return;
  }

  if (options.ignoreSendingWindow && !inSendingWindow) {
    debugLog("Bypassing sending window for immediate/manual send", {
      tenantId,
      adminTz,
      currentHour,
      sendingHoursStart,
      sendingHoursEnd,
      duration,
    });
  }

  // ALWAYS run slot assignment on every cycle (not just after sends)
  // This ensures newly enrolled/resumed recipients get scheduled
  try {
    await assignRecipientsToSlots();
  } catch (assignError) {
    console.error("[EHubQueue] Slot assignment failed before send cycle:", assignError);
  }

  // Reuse 'now' from sending hours check above
  await cleanupExpiredUnsentSlots(now);
  const { slots, windowStartIso: tenMinutesAgoIso, windowEndIso: nowUtcIso } = await getDueFilledSlots(now);

  if (slots.length === 0) {
    debugLog("No due slots in current window", { tenantId, nowUtcIso, tenMinutesAgoIso });
    return;
  }

  debugLog("Processing due slots", { tenantId, dueCount: slots.length });

  for (const slot of slots) {
    try {
      // REPLY GUARD: Check for replies before sending
      // Use HARDCODED admin user ID for Gmail API access (same as emailSender.ts)
      const ADMIN_USER_ID = '4df35876-ab89-4860-8656-0440accfea14'; // michael@naturalmaterials.eu
      
      if (slot.thread_id) {
        const canSend = await shouldSendEmail({
          userId: ADMIN_USER_ID,
          threadId: slot.thread_id,
          scheduledAt: new Date(slot.slot_time_utc),
        });
        
        if (!canSend) {
          debugLog("Blocked by reply guard; marking replied", {
            recipientId: slot.recipient_id,
            slotId: slot.id,
            threadId: slot.thread_id,
          });
          // Mark recipient as replied and cancel slot
          await db.update(sequenceRecipients)
            .set({ 
              status: 'replied',
              repliedAt: new Date(),
            })
            .where(eq(sequenceRecipients.id, slot.recipient_id));
          
          // Increment sequence's replied_count
          await db.execute(sql`
            UPDATE sequences 
            SET 
              replied_count = replied_count + 1,
              updated_at = NOW()
            WHERE id = ${slot.sequence_id}
          `);
          
          // DELETE the slot - recipient already marked as replied
          await db.delete(dailySendSlots).where(eq(dailySendSlots.id, slot.id));
          
          continue; // Skip to next slot
        }
      }
      
      const ok = await sendEmailToRecipient(slot.recipient_id);
      if (ok) {
        debugLog("Email sent successfully", {
          recipientId: slot.recipient_id,
          slotId: slot.id,
          slotTimeUtc: slot.slot_time_utc,
        });
        await markSlotSent(slot.id);
        // Note: Recipient metadata is updated inside sendEmailToRecipient()
        
        // Immediately trigger slot assignment for next step (Matrix2 multi-step progression)
        try {
          // First, run general assignment for any waiting recipients
          await assignRecipientsToSlots();
          
          // Then explicitly assign THIS recipient who just advanced to next step
          // They won't show up in general assignment query because they just got updated
          const { assignSingleRecipient } = await import('./Matrix2/slotAssigner');
          await assignSingleRecipient(slot.recipient_id);
        } catch (assignError) {
          console.error("[EHubQueue] Post-send slot assignment failed:", assignError);
        }
      } else {
        console.error("[EHubQueue] sendEmailToRecipient returned false; deleting slot", {
          recipientId: slot.recipient_id,
          slotId: slot.id,
          slotTimeUtc: slot.slot_time_utc,
        });
        await db.update(sequenceRecipients)
          .set({
            status: 'in_sequence',
            errorLog: `Send failed at ${new Date().toISOString()} (slot ${slot.id})`,
          })
          .where(eq(sequenceRecipients.id, slot.recipient_id));
        // DELETE the slot - recipient returns to bin for next assignment cycle
        await db.delete(dailySendSlots).where(eq(dailySendSlots.id, slot.id));
      }
    } catch (error) {
      console.error("[EHubQueue] Error while processing slot; deleting slot", {
        recipientId: slot.recipient_id,
        slotId: slot.id,
        slotTimeUtc: slot.slot_time_utc,
        error,
      });
      await db.update(sequenceRecipients)
        .set({
          status: 'in_sequence',
          errorLog: `Queue exception at ${new Date().toISOString()} (slot ${slot.id})`,
        })
        .where(eq(sequenceRecipients.id, slot.recipient_id));
      // DELETE the slot - recipient returns to bin for next assignment cycle
      await db.delete(dailySendSlots).where(eq(dailySendSlots.id, slot.id));
    }
  }
}

async function getAdminTimezone(tenantId: string): Promise<string> {
  const adminUser = await storage.getAdminUser();
  if (!adminUser?.id) {
    throw new Error("E-Hub queue processing aborted: no admin user found");
  }

  const adminPreferences = await storage.getUserPreferences(adminUser.id, tenantId);
  if (!adminPreferences?.timezone) {
    throw new Error(
      `E-Hub queue processing aborted: timezone missing for admin user ${adminUser.id} in tenant ${tenantId}`
    );
  }

  return adminPreferences.timezone;
}

/**
 * Trigger immediate email queue processing
 * Called by "Send Now" button to process emails without waiting for next cycle
 */
export async function triggerImmediateQueueProcess() {
  if (isProcessing) {
    debugLog("Immediate queue trigger skipped: already processing");
    return;
  }

  isProcessing = true;
  try {
    debugLog("Immediate queue trigger started");
    await processEmailQueueWithOptions({ ignoreSendingWindow: true });
  } catch (error) {
    console.error("[EHubQueue] Immediate queue processing failed:", error);
  } finally {
    isProcessing = false;
    debugLog("Immediate queue trigger completed");
  }
}

/**
 * Start the email queue processor
 * Runs every 60 seconds to process pending emails
 */
export function startEmailQueueProcessor() {
  // Run immediately on startup
  processEmailQueue().catch(err => {
    console.error("[EHubQueue] Initial startup cycle failed:", err);
  });

  // Then run every 60 seconds
  queueInterval = setInterval(async () => {
    if (isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      await processEmailQueue();
    } catch (error) {
      console.error("[EHubQueue] Scheduled cycle failed:", error);
    } finally {
      isProcessing = false;
    }
  }, 60000); // 60 seconds
}
