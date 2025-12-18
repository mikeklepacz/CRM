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
  const result = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date = ${dateIso}
      AND filled = FALSE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
  `);

  const rows = (result as any).rows || [];
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
  await db.execute(sql`
    DELETE FROM daily_send_slots
    WHERE slot_date >= ${dateIso}
  `);
}

export async function getScheduledSlotsFromDate(dateIso: string): Promise<DailySlot[]> {
  const result = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_date >= ${dateIso}
      AND filled = TRUE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
  `);
  
  const rows = (result as any).rows || [];
  return rows;
}

/**
 * Find the next available (empty) slot after a given slot time
 * Used for retrying failed sends by moving them to the next slot
 */
export async function getNextAvailableSlot(afterSlotTimeUtc: string): Promise<DailySlot | null> {
  const result = await db.execute(sql`
    SELECT id, slot_date, slot_time_utc, filled, sent, recipient_id
    FROM daily_send_slots
    WHERE slot_time_utc > ${afterSlotTimeUtc}
      AND filled = FALSE
      AND sent = FALSE
    ORDER BY slot_time_utc ASC
    LIMIT 1
  `);
  
  const rows = (result as any).rows || [];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Clear slots assigned to recipients from a specific sequence
 * Called when a sequence is deleted to free up those slots
 */
export async function clearSlotsForSequence(sequenceId: string) {
  const result = await db.execute(sql`
    UPDATE daily_send_slots
    SET filled = FALSE, recipient_id = NULL
    WHERE recipient_id::VARCHAR IN (
      SELECT id FROM sequence_recipients WHERE sequence_id = ${sequenceId}
    )
  `);
  
  const affectedRows = (result as any).rowCount || 0;
  return affectedRows;
}

/**
 * Clear slots assigned to a specific recipient
 * Called when a recipient is deleted to free up those slots
 */
export async function clearSlotsForRecipient(recipientId: string) {
  const result = await db.execute(sql`
    UPDATE daily_send_slots
    SET filled = FALSE, recipient_id = NULL
    WHERE recipient_id = ${recipientId}
  `);
  
  const affectedRows = (result as any).rowCount || 0;
  return affectedRows;
}

/**
 * Clear all orphaned slots (pointing to deleted recipients)
 * Useful for cleanup after sequence deletion or data corruption
 */
export async function clearOrphanedSlots() {
  const result = await db.execute(sql`
    UPDATE daily_send_slots
    SET filled = FALSE, recipient_id = NULL
    WHERE recipient_id IS NOT NULL
      AND recipient_id NOT IN (SELECT id FROM sequence_recipients)
  `);
  
  const affectedRows = (result as any).rowCount || 0;
  return affectedRows;
}

/**
 * Clear all UNSENT slots for a sequence's recipients
 * Called when a sequence is PAUSED to prevent fire-hose on unpause
 * Only clears slots where sent=FALSE, preserving send history
 * Recipients go back to the assignment pool and get fresh future slots on unpause
 */
export async function clearUnsentSlotsForSequence(sequenceId: string): Promise<number> {
  const result = await db.execute(sql`
    UPDATE daily_send_slots
    SET filled = FALSE, recipient_id = NULL
    WHERE sent = FALSE
      AND recipient_id IS NOT NULL
      AND recipient_id::VARCHAR IN (
        SELECT id FROM sequence_recipients WHERE sequence_id = ${sequenceId}
      )
  `);
  
  const affectedRows = (result as any).rowCount || 0;
  return affectedRows;
}