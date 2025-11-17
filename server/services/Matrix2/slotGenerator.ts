// server/services/Matrix2/slotGenerator.ts
import { storage } from "../../storage";
import { getSlotsForDate, createSlots } from "./slotDb";
import { addMinutes, formatISO9075 } from "date-fns";
import { randomInt } from "crypto";

export async function ensureDailySlots() {
  const settings = await storage.getEhubSettings();
  const adminTz = settings.admin_timezone; // user_preferences.timezone

  const today = new Date();
  const dateIso = formatISO9075(today, { representation: "date" });
  const existing = await getSlotsForDate(dateIso);
  if (existing.length > 0) return;

  const count = settings.daily_email_limit;
  const jitterMin = settings.jitter_min;
  const jitterMax = settings.jitter_max;
  const startHour = settings.sending_hours_start;

  const base = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      startHour
    )
  );

  const slots: Date[] = [];
  let cursor = base;

  for (let i = 0; i < count; i++) {
    const jitter = randomInt(jitterMin, jitterMax + 1);
    cursor = addMinutes(cursor, jitter);
    slots.push(new Date(cursor));
  }

  await createSlots(dateIso, slots);
}