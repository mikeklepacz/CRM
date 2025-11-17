// server/services/Matrix2/slotGenerator.ts
import { storage } from "../../storage";
import { getSlotsForDate, createSlots } from "./slotDb";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { randomInt } from "crypto";

/**
 * Generate daily slots for email sending based on E-Hub settings
 * 
 * This function:
 * 1. Reads admin timezone from user_preferences
 * 2. Reads send window and rate limits from ehub_settings
 * 3. Generates N slots with jittered timing
 * 4. Inserts them into daily_send_slots (idempotent - won't duplicate)
 */
export async function ensureDailySlots() {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[Matrix2 Generator] No E-Hub settings found, skipping slot generation');
    return;
  }

  // Get admin timezone from user preferences
  // The logged-in admin's timezone is the reference for the send window
  const adminUser = await storage.getAdminUser();
  const adminTz = adminUser?.timezone || 'America/New_York'; // Fallback to EST

  // Today's date in admin timezone
  const now = new Date();
  const dateIso = formatInTimeZone(now, adminTz, 'yyyy-MM-dd');

  // Check if slots already exist for today
  const existing = await getSlotsForDate(dateIso);
  if (existing.length > 0) {
    console.log(`[Matrix2 Generator] Slots already exist for ${dateIso}, skipping generation`);
    return;
  }

  // Read settings
  const dailyLimit = settings.dailyEmailLimit || 20;
  const sendingHoursStart = settings.sendingHoursStart || 6;
  const sendingHoursEnd = settings.sendingHoursEnd || 23;
  const minDelayMinutes = settings.minDelayMinutes || 6;
  const maxDelayMinutes = settings.maxDelayMinutes || 10;

  console.log(`[Matrix2 Generator] Generating ${dailyLimit} slots for ${dateIso}`);
  console.log(`[Matrix2 Generator] Send window: ${sendingHoursStart}:00 - ${sendingHoursEnd}:00 (${adminTz})`);
  console.log(`[Matrix2 Generator] Jitter range: ${minDelayMinutes}-${maxDelayMinutes} minutes`);

  // Calculate total send window in minutes
  const windowMinutes = (sendingHoursEnd - sendingHoursStart) * 60;
  
  // Calculate even spacing if we need to fit all slots
  const evenSpacing = Math.floor(windowMinutes / dailyLimit);

  // Generate slots starting at sendingHoursStart in admin timezone
  const slots: Date[] = [];
  
  // Start time: today at sendingHoursStart in admin timezone → convert to UTC
  const startTimeStr = `${dateIso}T${String(sendingHoursStart).padStart(2, '0')}:00:00`;
  let cursor = new Date(formatInTimeZone(startTimeStr, adminTz, "yyyy-MM-dd'T'HH:mm:ssXXX"));

  for (let i = 0; i < dailyLimit; i++) {
    if (i === 0) {
      // First slot starts at the exact send hour
      slots.push(new Date(cursor));
    } else {
      // Subsequent slots: add even spacing + random jitter
      const jitter = randomInt(minDelayMinutes, maxDelayMinutes + 1);
      const totalDelay = Math.max(evenSpacing, jitter); // Use larger of even spacing or jitter
      cursor = addMinutes(cursor, totalDelay);
      slots.push(new Date(cursor));
    }
  }

  // Insert slots into database
  await createSlots(dateIso, slots);

  console.log(`[Matrix2 Generator] Created ${slots.length} slots for ${dateIso}`);
  console.log(`[Matrix2 Generator] First slot: ${slots[0].toISOString()}`);
  console.log(`[Matrix2 Generator] Last slot: ${slots[slots.length - 1].toISOString()}`);
}

/**
 * Helper to get admin user (first user, or can be modified to get current logged-in user)
 */
async function getAdminUser() {
  // For now, get the first user's preferences
  // In production, you'd get the currently logged-in admin user
  const users = await storage.getAllUsers();
  return users[0] || null;
}

// Extend storage interface with helper method
declare module '../../storage' {
  interface IStorage {
    getAdminUser(): Promise<{ timezone: string } | null>;
  }
}

// Add to storage implementation
storage.getAdminUser = getAdminUser;
