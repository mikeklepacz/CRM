// server/services/matrix2/slotDb.ts

import { db } from "../../db";
import { sql } from "drizzle-orm";

// TABLE SCHEMA (CREATE THIS LATER IN MIGRATION)
// daily_send_slots:
//   id (uuid primary key)
//   slot_ts (timestamptz) - absolute UTC timestamp when email will be sent
//   is_filled (boolean)
//   recipient_id (uuid nullable)
//   created_at (timestamptz)
//   day_key (text) - "YYYY-MM-DD" in UTC (used for daily grouping)

export interface SlotRecord {
  id: string;
  slot_ts: Date;
  is_filled: boolean;
  recipient_id: string | null;
  day_key: string;
  created_at: Date;
}

const SLOT_TABLE = "daily_send_slots";

// -------------------------------------------------------
// INSERT A BATCH OF SLOTS
// -------------------------------------------------------
export async function insertSlots(slots: { id: string; slot_ts: Date; day_key: string }[]) {
  if (!slots.length) return;
  await db.execute(
    sql`
      INSERT INTO ${sql.identifier(SLOT_TABLE)} (id, slot_ts, day_key, is_filled, created_at)
      VALUES ${sql.join(
        slots.map(
          (s) =>
            sql`(${s.id}, ${s.slot_ts.toISOString()}, ${s.day_key}, false, NOW())`
        ),
        sql`,`
      )}
    `
  );
}

// -------------------------------------------------------
// GET ALL SLOTS FOR A GIVEN UTC DAY
// -------------------------------------------------------
export async function getSlotsByDay(dayKey: string): Promise<SlotRecord[]> {
  const { rows } = await db.execute(
    sql`
      SELECT *
      FROM ${sql.identifier(SLOT_TABLE)}
      WHERE day_key = ${dayKey}
      ORDER BY slot_ts ASC
    `
  );

  return rows as SlotRecord[];
}

// -------------------------------------------------------
// MARK SLOT AS FILLED
// -------------------------------------------------------
export async function fillSlot(slotId: string, recipientId: string) {
  await db.execute(
    sql`
      UPDATE ${sql.identifier(SLOT_TABLE)}
      SET is_filled = true,
          recipient_id = ${recipientId}
      WHERE id = ${slotId}
    `
  );
}

// -------------------------------------------------------
// CLEAR SLOTS OLDER THAN N DAYS
// -------------------------------------------------------
export async function cleanupOldSlots(days: number = 7) {
  await db.execute(
    sql`
      DELETE FROM ${sql.identifier(SLOT_TABLE)}
      WHERE slot_ts < NOW() - INTERVAL '${days} days'
    `
  );
}