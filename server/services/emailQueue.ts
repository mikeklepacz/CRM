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
  const sendingHoursEnd = settings.sendingHoursEnd || 23;
  
  // Only send emails during configured sending hours
  // (Slot assignment happens on-demand when recipients are enrolled)
  if (currentHour < sendingHoursStart || currentHour >= sendingHoursEnd) {
    console.log(`[EmailQueue] Outside sending hours (${currentHour}:00 not in ${sendingHoursStart}:00-${sendingHoursEnd}:00 ${adminTz})`);
    return;
  }

  const nowUtcIso = new Date().toISOString();

  // Get slots that are ready to send (filled, not sent, time has arrived)
  // CRITICAL: Only send if sequence is ACTIVE (pause/resume controls sending)
  const result = await db.execute(sql`
    SELECT 
      dss.id, 
      dss.slot_time_utc, 
      dss.recipient_id,
      s.status as sequence_status,
      s.name as sequence_name
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
      const ok = await sendEmailToRecipient(slot.recipient_id);
      if (ok) {
        await markSlotSent(slot.id);
        console.log(`[EmailQueue] ✅ Sent email for slot ${slot.id} to recipient ${slot.recipient_id} (sequence: ${slot.sequence_name})`);
        // Note: Recipient metadata is updated inside sendEmailToRecipient()
        
        // Immediately trigger slot assignment for next step (Matrix2 multi-step progression)
        try {
          await assignRecipientsToSlots();
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