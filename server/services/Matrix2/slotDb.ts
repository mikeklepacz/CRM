// server/services/Matrix2/slotDb.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

export interface DailySlot {
  id: string;
  slot_date: string;
  slot_time_utc: string;
  filled: boolean;
  sent: boolean;
  recipient_id: string | null;
}

export async function getSlotsForDate(dateIso: string): Promise<DailySlot[]> {
  const rows = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date = ${dateIso}
    ORDER BY slot_time_utc ASC
  `);
  return rows as any;
}

export async function createSlots(dateIso: string, slots: Date[]) {
  for (const dt of slots) {
    await db.execute(sql`
      INSERT INTO daily_send_slots (slot_date, slot_time_utc, filled, sent)
      VALUES (${dateIso}, ${dt.toISOString()}, FALSE, FALSE)
    `);
  }
}

export async function getEmptySlots(dateIso: string): Promise<DailySlot[]> {
  const rows = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date = ${dateIso}
      AND filled = FALSE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
  `);
  return rows as any;
}

export async function fillSlot(
  slotId: string,
  recipientId: string
) {
  await db.execute(sql`
    UPDATE daily_send_slots
    SET
      filled = TRUE,
      recipient_id = ${recipientId},
      updated_at = NOW()
    WHERE id = ${slotId}
  `);
}

export async function markSlotSent(slotId: string) {
  await db.execute(sql`
    UPDATE daily_send_slots
    SET 
      sent = TRUE,
      updated_at = NOW()
    WHERE id = ${slotId}
  `);
}

/**
 * Get ready-to-send slots (filled, not sent, time has arrived)
 */
export async function getReadySlots(limit: number = 10): Promise<DailySlot[]> {
  const nowUtc = new Date().toISOString();
  
  const rows = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE sent = FALSE
      AND filled = TRUE
      AND slot_time_utc <= ${nowUtc}
    ORDER BY slot_time_utc ASC
    LIMIT ${limit}
  `);
  
  return rows as any;
}
