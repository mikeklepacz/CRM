// server/services/matrix2/slotGenerator.ts

import { v4 as uuid } from "uuid";
import { formatInTimeZone } from "date-fns-tz";
import { addMinutes } from "date-fns";

import { insertSlots } from "./slotDb";
import { getEhubSettings } from "../ehubContactsService"; // Reads admin settings

// CONFIG:
// N = number of slots per day
// sendHourLocal = target send time in recipient local timezone (default 16:00 = 4 PM)
// jitterMin/jitterMax = minute ranges between slots

export interface SlotGenConfig {
  slotsPerDay: number;     // e.g., 20 or 50
  sendHourLocal: number;   // 16 = 4 PM
  jitterMin: number;       // 12
  jitterMax: number;       // 20
}

export async function generateDailySlots(config: SlotGenConfig) {
  const { slotsPerDay, sendHourLocal, jitterMin, jitterMax } = config;

  // Admin timezone (from E-Hub settings)
  const settings = await getEhubSettings();
  const adminTz = settings.timezone || "Europe/Warsaw";

  // Today in admin timezone (clean YYYY-MM-DD)
  const dayKey = formatInTimeZone(new Date(), adminTz, "yyyy-MM-dd");

  console.log(`\n[MATRIX 2.0] Generating daily slots for ${dayKey}`);

  const slots = [];
  let currentTs: Date | null = null;

  for (let i = 0; i < slotsPerDay; i++) {
    // Base time for today at 4 PM admin-local → convert to UTC
    if (i === 0) {
      const adminLocalIso = `${dayKey}T${String(sendHourLocal).padStart(2,"0")}:00:00`;
      const asUtc = new Date(formatInTimeZone(adminLocalIso, adminTz, "yyyy-MM-dd'T'HH:mm:ssXXX"));
      currentTs = asUtc;
    } else {
      // Add jitter between slots
      const jitter = randInt(jitterMin, jitterMax);
      currentTs = addMinutes(currentTs!, jitter);
    }

    slots.push({
      id: uuid(),
      slot_ts: currentTs!,
      day_key: dayKey,
    });
  }

  console.log(`[MATRIX 2.0] Created ${slots.length} jittered slots`);

  await insertSlots(slots);

  console.log(`[MATRIX 2.0] Slots written to DB for ${dayKey}`);
}

// -------------------------------------------------------

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}