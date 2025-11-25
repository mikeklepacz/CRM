// server/services/emailQueue.ts
import { ensureDailySlots } from "./Matrix2/slotGenerator";
import { assignRecipientsToSlots } from "./Matrix2/slotAssigner";
import { storage } from "../storage";
import { sendEmailToRecipient } from "./emailSender";
import { markSlotSent, getNextAvailableSlot, fillSlot } from "./Matrix2/slotDb";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { dailySendSlots, sequenceRecipients } from "../../shared/schema";
import { formatInTimeZone } from "date-fns-tz";
import { shouldSendEmail } from "./replyGuard";

// Queue state
let isProcessing = false;
let queueInterval: NodeJS.Timeout | null = null;

/**
 * Recursively bump displaced recipient forward (domino effect)
 * When someone takes your slot, you take the next slot, displacing the next person, etc.
 */
async function cascadeBumpRecipient(displacedRecipientId: string, fromSlotTime: string): Promise<void> {
  console.log(`[EmailQueue] 🌊 Cascading bump for recipient ${displacedRecipientId}...`);
  
  // Find next available slot after the one they were displaced from
  const nextSlotResult = await db.execute(sql`
    SELECT id, slot_time_utc, filled, recipient_id
    FROM daily_send_slots
    WHERE slot_time_utc > ${fromSlotTime}
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
    LIMIT 1
  `);
  const nextSlotRows = (nextSlotResult as any).rows || [];
  
  if (nextSlotRows.length === 0) {
    console.warn(`[EmailQueue] ⚠️  No next slot available for cascading bump - recipient ${displacedRecipientId} goes to pool`);
    return; // End of chain - this person stays in pool
  }
  
  const nextSlot = nextSlotRows[0];
  const nextDisplacedRecipientId = nextSlot.recipient_id; // Who's currently in that slot
  
  // Take the next slot
  await fillSlot(nextSlot.id, displacedRecipientId);
  console.log(`[EmailQueue] 🔄 Cascaded: ${displacedRecipientId} → slot ${nextSlot.id} (was ${nextSlot.slot_time_utc})`);
  
  // If someone was in that next slot, cascade them forward too (domino effect)
  if (nextDisplacedRecipientId) {
    await cascadeBumpRecipient(nextDisplacedRecipientId, nextSlot.slot_time_utc);
  }
}

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
    console.log(`[EmailQueue] Outside sending hours (${currentHour}:00 not in ${sendingHoursStart}:00-${String(sendingHoursEnd).padStart(2, '0')}:00 ${adminTz}, duration=${duration}h)`);
    return;
  }

  // ALWAYS run slot assignment on every cycle (not just after sends)
  // This ensures newly enrolled/resumed recipients get scheduled
  console.log('[EmailQueue] Running slot assignment for waiting recipients...');
  try {
    await assignRecipientsToSlots();
  } catch (assignError) {
    console.error('[EmailQueue] ⚠️ Error during slot assignment:', assignError);
    // Don't fail the queue - continue to send ready emails
  }

  const nowUtcIso = new Date().toISOString();

  // Get slots that are ready to send (filled, not sent, time has arrived)
  // CRITICAL: Only send if sequence is ACTIVE (pause/resume controls sending)
  const result = await db.execute(sql`
    SELECT 
      dss.id, 
      dss.slot_time_utc, 
      dss.recipient_id,
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
      AND dss.slot_time_utc <= ${nowUtcIso}
      AND s.status = 'active'
    ORDER BY dss.slot_time_utc ASC
    LIMIT 10
  `);

  const slots = (result as any).rows || [];

  if (slots.length === 0) {
    console.log('[EmailQueue] No slots ready to send (or all sequences paused)');
    return;
  }

  console.log(`[EmailQueue] Processing ${slots.length} ready slots from ACTIVE sequences`);

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
          console.log(`[EmailQueue] 🛑 Reply detected for recipient ${slot.recipient_id} - stopping sequence`);
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
          
          // Clear the slot
          await db.update(dailySendSlots)
            .set({ filled: false, recipientId: null })
            .where(eq(dailySendSlots.id, slot.id));
          
          continue; // Skip to next slot
        }
      }
      
      const ok = await sendEmailToRecipient(slot.recipient_id);
      if (ok) {
        await markSlotSent(slot.id);
        console.log(`[EmailQueue] ✅ Sent email for slot ${slot.id} to recipient ${slot.recipient_id} (sequence: ${slot.sequence_name})`);
        // Note: Recipient metadata is updated inside sendEmailToRecipient()
        
        // Immediately trigger slot assignment for next step (Matrix2 multi-step progression)
        try {
          // First, run general assignment for any waiting recipients
          await assignRecipientsToSlots();
          
          // Then explicitly assign THIS recipient who just advanced to next step
          // They won't show up in general assignment query because they just got updated
          const { assignSingleRecipient } = await import('./Matrix2/slotAssigner');
          await assignSingleRecipient(slot.recipient_id);
          
          console.log(`[EmailQueue] 📧 Post-send slot assignment completed for recipient ${slot.recipient_id}`);
        } catch (assignError) {
          console.error(`[EmailQueue] ⚠️  Error during post-send slot assignment for recipient ${slot.recipient_id}:`, assignError);
          // Don't rethrow - continue processing other slots even if assignment fails
        }
      } else {
        console.error(`[EmailQueue] ❌ Failed to send email for slot ${slot.id} - initiating cascade bump`);
        // Clear current slot first
        await db
          .update(dailySendSlots)
          .set({ filled: false, recipientId: null })
          .where(eq(dailySendSlots.id, slot.id));
        
        // Cascade the failed recipient forward (domino effect)
        await cascadeBumpRecipient(slot.recipient_id, slot.slot_time_utc);
      }
    } catch (error) {
      console.error(`[EmailQueue] Error sending slot ${slot.id}:`, error);
      // Clear current slot first
      await db
        .update(dailySendSlots)
        .set({ filled: false, recipientId: null })
        .where(eq(dailySendSlots.id, slot.id));
      
      // Cascade the failed recipient forward (domino effect)
      await cascadeBumpRecipient(slot.recipient_id, slot.slot_time_utc);
    }
  }
}

/**
 * Trigger immediate email queue processing
 * Called by "Send Now" button to process emails without waiting for next cycle
 */
export async function triggerImmediateQueueProcess() {
  if (isProcessing) {
    console.log('[EmailQueue] Queue already processing, will send next cycle');
    return;
  }

  console.log('[EmailQueue] ⚡ IMMEDIATE TRIGGER: Processing queue now...');
  isProcessing = true;
  try {
    await processEmailQueue();
  } catch (error) {
    console.error('[EmailQueue] Error in immediate queue processing:', error);
  } finally {
    isProcessing = false;
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