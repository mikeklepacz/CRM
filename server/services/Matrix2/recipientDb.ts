// server/services/Matrix2/recipientDb.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

export async function getEligibleRecipientsForAssignment() {
  const rows = await db.execute(sql`
    SELECT
      id,
      recipient_id,
      sequence_id,
      current_step,
      timezone,
      business_hours,
      step_delay,
      last_step_sent_at,
      state,
      status
    FROM sequence_recipients
    WHERE status = 'active'
      AND ready_for_send = TRUE
      AND timezone IS NOT NULL
    ORDER BY created_at ASC
  `);
  return rows as any[];
}

export async function markRecipientScheduled(recipientId: string, isoUtc: string) {
  await db.execute(sql`
    INSERT INTO sequence_scheduled_sends (recipient_id, scheduled_at)
    VALUES (${recipientId}, ${isoUtc})
  `);

  await db.execute(sql`
    UPDATE sequence_recipients
    SET
      last_step_sent_at = ${isoUtc},
      ready_for_send = FALSE
    WHERE id = ${recipientId}
  `);
}