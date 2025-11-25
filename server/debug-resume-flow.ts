
// Run this with: npx tsx server/debug-resume-flow.ts

import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugResumeFlow() {
  console.log("=== RESUME FLOW DEBUG ===\n");

  // 1. Check the resumed recipient
  console.log("1. Checking recipient michael@naturalmaterials.pl:");
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
    console.log("  ❌ Recipient not found!");
    process.exit(1);
  }

  const recipient: any = recipients[0];
  console.log(`  - Status: ${recipient.status}`);
  console.log(`  - Current step: ${recipient.current_step}`);
  console.log(`  - Timezone: ${recipient.timezone || 'MISSING ❌'}`);
  console.log(`  - Business hours: ${recipient.business_hours || 'MISSING ❌'}`);
  console.log(`  - State: ${recipient.state || 'MISSING ❌'}`);
  console.log(`  - Next send at: ${recipient.next_send_at}`);
  console.log(`  - Last step sent: ${recipient.last_step_sent_at}`);
  console.log(`  - Step delays: ${recipient.step_delays}`);

  // 2. Check if they have any filled slots
  console.log("\n2. Checking assigned slots:");
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
    console.log("  ❌ No slots assigned to this recipient!");
  } else {
    slots.forEach((slot: any) => {
      console.log(`  - Slot: ${slot.slot_time_utc}, filled: ${slot.filled}, sent: ${slot.sent}`);
    });
  }

  // 3. Check eligibility query (from slotAssigner)
  console.log("\n3. Checking if recipient appears in eligibility query:");
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
    console.log(`  ✅ Recipient IS eligible for slot assignment`);
  } else {
    console.log(`  ❌ Recipient NOT eligible - likely already has a filled slot`);
  }

  // 4. Check available empty slots
  console.log("\n4. Checking available empty slots:");
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
    console.log(`  - ${row.slot_date}: ${row.empty_count} empty slots`);
  });

  process.exit(0);
}

debugResumeFlow();
