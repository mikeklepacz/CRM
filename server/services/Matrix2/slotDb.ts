// server/services/Matrix2/slotDb.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

export interface DailySlot {
  id: string;
  slot_time_utc: string;
  filled: boolean;
  sent: boolean;
  recipient_id: string | null;
  sequence_id: string | null;
  step: number | null;
}

export async function getSlotsForDate(dateIso: string): Promise<DailySlot[]> {
  const rows = await db.execute(sql`
    SELECT id, slot_time_utc, filled, sent, recipient_id, sequence_id, step
    FROM daily_send_slots
    WHERE date = ${dateIso}
    ORDER BY slot_time_utc ASC
  `);
  return rows as any;
}

export async function createSlots(dateIso: string, slots: Date[]) {
  for (const dt of slots) {
    await db.execute(sql`
      INSERT INTO daily_send_slots (date, slot_time_utc, filled, sent)
      VALUES (${dateIso}, ${dt.toISOString()}, FALSE, FALSE)
    `);
  }
}

export async function getEmptySlots(dateIso: string): Promise<DailySlot[]> {
  const rows = await db.execute(sql`
    SELECT id, slot_time_utc
    FROM daily_send_slots
    WHERE date = ${dateIso}
      AND filled = FALSE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
  `);
  return rows as any;
}

export async function fillSlot(
  slotId: string,
  recipientId: string,
  sequenceId: string,
  step: number
) {
  await db.execute(sql`
    UPDATE daily_send_slots
    SET
      filled = TRUE,
      recipient_id = ${recipientId},
      sequence_id = ${sequenceId},
      step = ${step}
    WHERE id = ${slotId}
  `);
}

export async function markSlotSent(slotId: string) {
  await db.execute(sql`
    UPDATE daily_send_slots
    SET sent = TRUE
    WHERE id = ${slotId}
  `);
}