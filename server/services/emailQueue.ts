// server/services/emailQueue.ts
import { ensureDailySlots } from "./Matrix2/slotGenerator";
import { assignRecipientsToSlots } from "./Matrix2/slotAssigner";
import { storage } from "../storage";
import { sendEmail } from "./emailSender";
import { markSlotSent } from "./Matrix2/slotDb";
import { db } from "../db";
import { sql } from "drizzle-orm";

// Queue state
let isProcessing = false;
let queueInterval: NodeJS.Timeout | null = null;

export async function processEmailQueue() {
  const settings = await storage.getEhubSettings();

  await ensureDailySlots();
  await assignRecipientsToSlots();

  const nowUtcIso = new Date().toISOString();

  const slots = await db.execute(sql`
    SELECT id, slot_time_utc, recipient_id
    FROM daily_send_slots
    WHERE sent = FALSE
      AND filled = TRUE
      AND slot_time_utc <= ${nowUtcIso}
    ORDER BY slot_time_utc ASC
  `);

  for (const slot of slots as any[]) {
    if (!slot.recipient_id) continue;

    const ok = await sendEmail(slot.recipient_id);
    if (ok) {
      await markSlotSent(slot.id);
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