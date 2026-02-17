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

// Queue state
let isProcessing = false;
let queueInterval: NodeJS.Timeout | null = null;

export async function processEmailQueue() {
  const tenantId = await storage.getAdminTenantId();
  if (!tenantId) {
    return;
  }
  
  const settings = await storage.getEhubSettings(tenantId);
  if (!settings) {
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
  
  if (!inSendingWindow) {
    return;
  }

  // ALWAYS run slot assignment on every cycle (not just after sends)
  // This ensures newly enrolled/resumed recipients get scheduled
  try {
    await assignRecipientsToSlots();
  } catch (assignError) {
    // Don't fail the queue - continue to send ready emails
  }

  // Reuse 'now' from sending hours check above
  const nowUtcIso = now.toISOString();
  
  // EXPIRED SLOT CLEANUP: DELETE any expired slots older than 10 minutes
  // Recipients return to bin naturally - they're no longer assigned to any slot
  // NO catch-up behavior - expired slots are just gone
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const tenMinutesAgoIso = tenMinutesAgo.toISOString();
  
  await db.execute(sql`
    DELETE FROM daily_send_slots 
    WHERE sent = FALSE 
      AND slot_time_utc < ${tenMinutesAgoIso}
  `);

  // Get slots that are ready to send NOW (present-focused)
  // CRITICAL: Only find slots within current 10-minute window
  // CRITICAL: Only send if sequence is ACTIVE (pause/resume controls sending)
  // CRITICAL: Only process slots with valid email_account_id (block legacy NULL slots)
  // NO LIMIT - slot generation IS the daily limit, no batching possible
  const result = await db.execute(sql`
    SELECT 
      dss.id, 
      dss.slot_time_utc, 
      dss.recipient_id,
      dss.email_account_id,
      s.id as sequence_id,
      s.status as sequence_status,
      s.name as sequence_name,
      sr.thread_id as thread_id,
      s.created_by as user_id
    FROM daily_send_slots dss
    INNER JOIN sequence_recipients sr ON dss.recipient_id::varchar = sr.id
    INNER JOIN sequences s ON sr.sequence_id = s.id
    WHERE dss.sent = FALSE
      AND dss.filled = TRUE
      AND dss.recipient_id IS NOT NULL
      AND dss.email_account_id IS NOT NULL
      AND dss.slot_time_utc >= ${tenMinutesAgoIso}
      AND dss.slot_time_utc <= ${nowUtcIso}
      AND s.status = 'active'
    ORDER BY dss.slot_time_utc ASC
  `);

  const slots = (result as any).rows || [];

  if (slots.length === 0) {
    return;
  }

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
          // Don't rethrow - continue processing other slots even if assignment fails
        }
      } else {
        // DELETE the slot - recipient returns to bin for next assignment cycle
        await db.delete(dailySendSlots).where(eq(dailySendSlots.id, slot.id));
      }
    } catch (error) {
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
    return;
  }

  isProcessing = true;
  try {
    await processEmailQueue();
  } catch (error) {
    // Error handling without logging
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the email queue processor
 * Runs every 60 seconds to process pending emails
 */
export function startEmailQueueProcessor() {
  // Run immediately on startup
  processEmailQueue().catch(err => {
    // Error handling without logging
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
      // Error handling without logging
    } finally {
      isProcessing = false;
    }
  }, 60000); // 60 seconds
}
