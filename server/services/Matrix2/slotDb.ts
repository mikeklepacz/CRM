// server/services/Matrix2/slotDb.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

export interface DailySlot {
  id: string;
  slot_time_utc: string;
  filled: boolean;
  sent: boolean;
  recipient_id: string | null;
}

export async function getSlotsForDate(dateIso: string): Promise<DailySlot[]> {
  const result = await db.execute(sql`
    SELECT id, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date = ${dateIso}
    ORDER BY slot_time_utc ASC
  `);
  const rows = (result as any).rows || [];
  return rows;
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
  console.log('[SlotDb.getEmptySlots] Fetching empty slots for:', dateIso);

  const result = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date = ${dateIso}
      AND filled = FALSE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
  `);

  const rows = (result as any).rows || [];

  console.log('[SlotDb.getEmptySlots] Found:', {
    count: rows.length,
    dateIso,
    sample: rows.slice(0, 3)
  });

  return rows;
}

export async function fillSlot(
  slotId: string,
  recipientId: string
) {
  await db.execute(sql`
    UPDATE daily_send_slots
    SET
      filled = TRUE,
      recipient_id = ${recipientId}
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

export async function deleteSlotsFromDate(dateIso: string) {
  console.log('[SlotDb.deleteSlotsFromDate] Deleting slots from:', dateIso);
  
  await db.execute(sql`
    DELETE FROM daily_send_slots
    WHERE slot_date >= ${dateIso}
  `);
  
  console.log('[SlotDb.deleteSlotsFromDate] ✅ Deleted slots from', dateIso);
}

export async function getScheduledSlotsFromDate(dateIso: string): Promise<DailySlot[]> {
  console.log('[SlotDb.getScheduledSlotsFromDate] Fetching scheduled slots from:', dateIso);
  
  const result = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date >= ${dateIso}
      AND filled = TRUE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
  `);
  
  const rows = (result as any).rows || [];
  
  console.log('[SlotDb.getScheduledSlotsFromDate] Found:', {
    count: rows.length,
    fromDate: dateIso,
    sample: rows.slice(0, 3)
  });
  
  return rows;
}