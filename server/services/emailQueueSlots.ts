import { db } from "../db";
import { sql } from "drizzle-orm";

export async function cleanupExpiredUnsentSlots(now: Date) {
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const tenMinutesAgoIso = tenMinutesAgo.toISOString();

  await db.execute(sql`
    DELETE FROM daily_send_slots 
    WHERE sent = FALSE 
      AND slot_time_utc < ${tenMinutesAgoIso}
  `);
}

export async function getDueFilledSlots(now: Date) {
  const nowUtcIso = now.toISOString();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const tenMinutesAgoIso = tenMinutesAgo.toISOString();

  const result = await db.execute(sql`
    SELECT 
      dss.id, 
      dss.slot_time_utc, 
      dss.recipient_id,
      dss.email_account_id,
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
      AND dss.email_account_id IS NOT NULL
      AND dss.slot_time_utc >= ${tenMinutesAgoIso}
      AND dss.slot_time_utc <= ${nowUtcIso}
      AND s.status = 'active'
    ORDER BY dss.slot_time_utc ASC
  `);

  return {
    slots: (result as any).rows || [],
    windowStartIso: tenMinutesAgoIso,
    windowEndIso: nowUtcIso,
  };
}
