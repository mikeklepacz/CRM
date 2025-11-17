// server/services/emailQueue.ts
import { ensureDailySlots } from "./Matrix2/slotGenerator";
import { assignRecipientsToSlots } from "./Matrix2/slotAssigner";
import { storage } from "../storage";
import { sendEmail } from "./emailSender";
import { markSlotSent } from "./Matrix2/slotDb";
import { db } from "../db";
import { sql } from "drizzle-orm";

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