
// Run this with: npx tsx server/debug-resume-flow.ts

import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugResumeFlow() {

  // 1. Check the resumed recipient
  const recipients = await db.execute(sql`
    SELECT 
      sr.id,
      sr.email,
      sr.status,
      sr.current_step,
      sr.timezone,
      sr.business_hours,
      sr.state,
      sr.next_send_at,
      sr.last_step_sent_at,
      s.step_delays
    FROM sequence_recipients sr
    LEFT JOIN sequences s ON sr.sequence_id = s.id
    WHERE sr.email = 'michael@naturalmaterials.pl'
  `);
  
  if (recipients.length === 0) {
    process.exit(1);
  }

  const recipient: any = recipients[0];

  // 2. Check if they have any filled slots
  const slots = await db.execute(sql`
    SELECT 
      id,
      slot_time_utc,
      filled,
      sent,
      recipient_id
    FROM daily_send_slots
    WHERE recipient_id = ${recipient.id}::uuid
    ORDER BY slot_time_utc
    LIMIT 5
  `);

  if (slots.length === 0) {
  } else {
    slots.forEach((slot: any) => {
    });
  }

  // 3. Check eligibility query (from slotAssigner)
  const eligible = await db.execute(sql`
    SELECT
      sr.id,
      sr.email,
      sr.current_step,
      sr.status
    FROM sequence_recipients sr
    INNER JOIN sequences s ON sr.sequence_id = s.id
    LEFT JOIN daily_send_slots dss ON sr.id = dss.recipient_id::varchar 
      AND dss.filled = TRUE 
      AND dss.sent = FALSE
    WHERE sr.status = 'in_sequence'
      AND sr.timezone IS NOT NULL
      AND sr.timezone != ''
      AND sr.business_hours IS NOT NULL
      AND sr.business_hours != ''
      AND dss.id IS NULL
    ORDER BY sr.created_at ASC
  `);

  const found = eligible.find((r: any) => r.email === 'michael@naturalmaterials.pl');
  if (found) {
  } else {
  }

  // 4. Check available empty slots
  const emptySlots = await db.execute(sql`
    SELECT 
      slot_date,
      COUNT(*) as empty_count
    FROM daily_send_slots
    WHERE filled = FALSE
      AND slot_time_utc >= NOW()
    GROUP BY slot_date
    ORDER BY slot_date
    LIMIT 3
  `);

  emptySlots.forEach((row: any) => {
  });

  process.exit(0);
}

debugResumeFlow();
