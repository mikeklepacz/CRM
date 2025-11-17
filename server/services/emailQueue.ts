// server/services/emailQueue.ts
import { ensureDailySlots } from "./Matrix2/slotGenerator";
import { assignRecipientsToSlots } from "./Matrix2/slotAssigner";
import { storage } from "../storage";
import { sendEmailToRecipient } from "./emailSender";
import { markSlotSent } from "./Matrix2/slotDb";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { dailySendSlots, sequenceRecipients } from "../../shared/schema";
import { formatInTimeZone } from "date-fns-tz";

// Queue state
let isProcessing = false;
let queueInterval: NodeJS.Timeout | null = null;

export async function processEmailQueue() {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[EmailQueue] No E-Hub settings found, skipping processing');
    return;
  }

  // Check if we're within sending hours (admin timezone)
  const adminUser = await storage.getAdminUser();
  const adminTz = adminUser?.timezone || 'America/New_York';
  const now = new Date();
  const currentHour = parseInt(formatInTimeZone(now, adminTz, 'HH'));
  const sendingHoursStart = settings.sendingHoursStart || 6;
  const sendingHoursEnd = settings.sendingHoursEnd || 23;
  
  if (currentHour < sendingHoursStart || currentHour >= sendingHoursEnd) {
    console.log(`[EmailQueue] Outside sending hours (${currentHour}:00 not in ${sendingHoursStart}:00-${sendingHoursEnd}:00 ${adminTz})`);
    return;
  }

  // Generate today's slots if they don't exist
  await ensureDailySlots();
  
  // Assign eligible recipients to empty slots
  await assignRecipientsToSlots();

  const nowUtcIso = new Date().toISOString();

  // Get slots that are ready to send (filled, not sent, time has arrived)
  const result = await db.execute(sql`
    SELECT id, slot_time_utc, recipient_id
    FROM daily_send_slots
    WHERE sent = FALSE
      AND filled = TRUE
      AND recipient_id IS NOT NULL
      AND slot_time_utc <= ${nowUtcIso}
    ORDER BY slot_time_utc ASC
    LIMIT 10
  `);

  const slots = Array.isArray(result) ? result : [];

  if (slots.length === 0) {
    console.log('[EmailQueue] No slots ready to send');
    return;
  }

  console.log(`[EmailQueue] Processing ${slots.length} ready slots`);

  for (const slot of slots) {
    try {
      const ok = await sendEmailToRecipient(slot.recipient_id);
      if (ok) {
        await markSlotSent(slot.id);
        console.log(`[EmailQueue] ✅ Sent email for slot ${slot.id} to recipient ${slot.recipient_id}`);
        
        // CRITICAL: Update recipient metadata after successful send
        const recipient = await storage.getRecipientById(slot.recipient_id);
        if (recipient) {
          const nextStep = (recipient.currentStep || 0) + 1;
          await db
            .update(sequenceRecipients)
            .set({
              currentStep: nextStep,
              lastStepSentAt: now,
              status: 'in_sequence',
              updatedAt: now
            })
            .where(eq(sequenceRecipients.id, slot.recipient_id));
        }
      } else {
        console.error(`[EmailQueue] ❌ Failed to send email for slot ${slot.id}`);
        // Unfill the slot so it can be reassigned
        await db
          .update(dailySendSlots)
          .set({ filled: false, recipientId: null })
          .where(eq(dailySendSlots.id, slot.id));
      }
    } catch (error) {
      console.error(`[EmailQueue] Error sending slot ${slot.id}:`, error);
      // Unfill the slot on error
      await db
        .update(dailySendSlots)
        .set({ filled: false, recipientId: null })
        .where(eq(dailySendSlots.id, slot.id));
    }
  }
}

/**
 * Start the email queue processor
 * Runs every 60 seconds to process pending emails
 */
export function startEmailQueueProcessor() {
  console.log('[EmailQueue] Starting email queue processor (Matrix2)...');
  
  // Run immediately on startup
  processEmailQueue().catch(err => {
    console.error('[EmailQueue] Error in initial queue processing:', err);
  });

  // Then run every 60 seconds
  queueInterval = setInterval(async () => {
    if (isProcessing) {
      console.log('[EmailQueue] Queue already processing, skipping this cycle');
      return;
    }

    isProcessing = true;
    try {
      await processEmailQueue();
    } catch (error) {
      console.error('[EmailQueue] Error processing email queue:', error);
    } finally {
      isProcessing = false;
    }
  }, 60000); // 60 seconds

  console.log('[EmailQueue] ✅ Queue processor started (60s interval)');
}