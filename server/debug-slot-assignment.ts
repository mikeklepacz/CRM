
// Run this with: npx tsx server/debug-slot-assignment.ts

import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugSlotAssignment() {
  console.log("=== SLOT ASSIGNMENT DEBUG ===\n");

  // 1. Check recipients in sequence
  console.log("1. Recipients with status='in_sequence':");
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
    WHERE sr.status = 'in_sequence'
  `);
  
  console.log(`Found ${recipients.length} recipient(s)`);
  recipients.forEach((r: any) => {
    console.log(`  - ${r.email}`);
    console.log(`    timezone: ${r.timezone || 'MISSING ❌'}`);
    console.log(`    business_hours: ${r.business_hours || 'MISSING ❌'}`);
    console.log(`    state: ${r.state || 'MISSING ❌'}`);
    console.log(`    next_send_at: ${r.next_send_at}`);
    console.log(`    current_step: ${r.current_step}`);
  });

  // 2. Check today's slots
  console.log("\n2. Today's slots in daily_send_slots:");
  const today = new Date().toISOString().slice(0, 10);
  const slots = await db.execute(sql`
    SELECT 
      id,
      slot_date,
      slot_time_utc,
      filled,
      sent,
      recipient_id
    FROM daily_send_slots
    WHERE slot_date = ${today}
    ORDER BY slot_time_utc ASC
  `);
  
  console.log(`Found ${slots.length} slot(s) for ${today}`);
  const emptySlots = slots.filter((s: any) => !s.filled);
  const filledSlots = slots.filter((s: any) => s.filled);
  console.log(`  - Empty: ${emptySlots.length}`);
  console.log(`  - Filled: ${filledSlots.length}`);
  
  if (slots.length === 0) {
    console.log("  ❌ NO SLOTS EXIST - slotGenerator hasn't run yet!");
  }

  // 3. Check E-Hub settings
  console.log("\n3. E-Hub settings:");
  const settings = await db.execute(sql`
    SELECT 
      daily_email_limit,
      sending_hours_start,
      sending_hours_end,
      min_delay_minutes,
      max_delay_minutes,
      skip_weekends,
      client_window_start_offset,
      client_window_end_hour
    FROM ehub_settings
    LIMIT 1
  `);
  
  if (settings.length > 0) {
    console.log(`  daily_email_limit: ${settings[0].daily_email_limit}`);
    console.log(`  sending_hours: ${settings[0].sending_hours_start}:00 - ${settings[0].sending_hours_end}:00`);
    console.log(`  skip_weekends: ${settings[0].skip_weekends}`);
  } else {
    console.log("  ❌ NO SETTINGS FOUND");
  }

  // 4. Check if assignment should run now
  console.log("\n4. Current time check:");
  const now = new Date();
  const adminTz = 'America/New_York'; // Default from code
  const currentHourET = parseInt(now.toLocaleString('en-US', { timeZone: adminTz, hour: '2-digit', hour12: false }));
  const sendStart = settings[0]?.sending_hours_start || 6;
  const sendEnd = settings[0]?.sending_hours_end || 23;
  
  console.log(`  Current hour (${adminTz}): ${currentHourET}:00`);
  console.log(`  Sending window: ${sendStart}:00 - ${sendEnd}:00`);
  console.log(`  Can assign now: ${currentHourET >= sendStart && currentHourET < sendEnd ? '✅' : '❌'}`);

  console.log("\n=== END DEBUG ===");
  process.exit(0);
}

debugSlotAssignment().catch(console.error);
