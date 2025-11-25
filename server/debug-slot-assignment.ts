
// Run this with: npx tsx server/debug-slot-assignment.ts

import { db } from "./db";
import { sql } from "drizzle-orm";

async function debugSlotAssignment() {

  // 1. Check recipients in sequence
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
  
  recipients.forEach((r: any) => {
  });

  // 2. Check today's slots
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
  
  const emptySlots = slots.filter((s: any) => !s.filled);
  const filledSlots = slots.filter((s: any) => s.filled);
  
  if (slots.length === 0) {
  }

  // 3. Check E-Hub settings
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
  } else {
  }

  // 4. Check if assignment should run now
  const now = new Date();
  const adminTz = 'America/New_York'; // Default from code
  const currentHourET = parseInt(now.toLocaleString('en-US', { timeZone: adminTz, hour: '2-digit', hour12: false }));
  const sendStart = settings[0]?.sending_hours_start || 6;
  const sendEnd = settings[0]?.sending_hours_end || 23;
  

  process.exit(0);
}

debugSlotAssignment().catch(() => {});
