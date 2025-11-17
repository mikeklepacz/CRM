// server/services/Matrix2/slotGenerator.ts
import { storage } from "../../storage";
import { getSlotsForDate, createSlots } from "./slotDb";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { randomInt } from "crypto";

/**
 * Generate slots for a single day based on E-Hub settings
 * 
 * @param dateIso - The date in YYYY-MM-DD format
 * @param adminTz - Admin timezone
 * @param settings - E-Hub settings
 */
export async function generateSlotsForDay(
  dateIso: string,
  adminTz: string,
  settings: {
    dailyEmailLimit: number;
    sendingHoursStart: number;
    sendingHoursEnd: number;
    minDelayMinutes: number;
    maxDelayMinutes: number;
  }
) {
  const { dailyEmailLimit, sendingHoursStart, sendingHoursEnd, minDelayMinutes, maxDelayMinutes } = settings;

  console.log(`[Matrix2 Generator] Generating up to ${dailyEmailLimit} slots for ${dateIso}`);
  console.log(`[Matrix2 Generator] Send window: ${sendingHoursStart}:00 - ${sendingHoursEnd}:00 (${adminTz})`);
  console.log(`[Matrix2 Generator] Pure jitter range: ${minDelayMinutes}-${maxDelayMinutes} minutes`);

  // Generate slots starting at sendingHoursStart in admin timezone
  const slots: Date[] = [];
  
  // Start time: dateIso at sendingHoursStart in admin timezone → convert to UTC
  const startTimeStr = `${dateIso}T${String(sendingHoursStart).padStart(2, '0')}:00:00`;
  let cursor = new Date(formatInTimeZone(startTimeStr, adminTz, "yyyy-MM-dd'T'HH:mm:ssXXX"));
  
  // End time boundary: dateIso at sendingHoursEnd
  const endTimeStr = `${dateIso}T${String(sendingHoursEnd).padStart(2, '0')}:00:00`;
  const endBoundary = new Date(formatInTimeZone(endTimeStr, adminTz, "yyyy-MM-dd'T'HH:mm:ssXXX"));

  let previousJitter: number | null = null;
  
  for (let i = 0; i < dailyEmailLimit; i++) {
    if (i === 0) {
      // First slot starts at the exact send hour
      slots.push(new Date(cursor));
    } else {
      // Subsequent slots: add pure random jitter (no even spacing)
      // Prevent consecutive duplicates for better randomness
      let jitter = randomInt(minDelayMinutes, maxDelayMinutes + 1);
      let attempts = 0;
      while (jitter === previousJitter && attempts < 10) {
        jitter = randomInt(minDelayMinutes, maxDelayMinutes + 1);
        attempts++;
      }
      previousJitter = jitter;
      
      cursor = addMinutes(cursor, jitter);
      
      // Stop if we've exceeded the send window boundary
      if (cursor >= endBoundary) {
        console.log(`[Matrix2 Generator] Reached send window boundary at slot ${i}, stopping`);
        break;
      }
      
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
 * Ensure 3 days worth of slots are always available
 * 
 * This function:
 * 1. Reads admin timezone from user_preferences
 * 2. Reads send window and rate limits from ehub_settings
 * 3. Checks which of the next 3 days need slots
 * 4. Generates slots for missing days (skipping weekends if configured)
 */
export async function ensureDailySlots() {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[Matrix2 Generator] No E-Hub settings found, skipping slot generation');
    return;
  }

  // Get admin timezone from user preferences
  const adminUser = await storage.getAdminUser();
  console.log('[Matrix2 Generator] Admin user preferences:', {
    hasUser: !!adminUser,
    timezone: adminUser?.timezone,
    fallback: !adminUser?.timezone ? 'America/New_York' : null
  });
  const adminTz = adminUser?.timezone || 'America/New_York';

  const now = new Date();
  const dailyLimit = settings.dailyEmailLimit || 20;
  const sendingHoursStart = settings.sendingHoursStart || 6;
  const sendingHoursEnd = settings.sendingHoursEnd || 23;
  const minDelayMinutes = settings.minDelayMinutes || 6;
  const maxDelayMinutes = settings.maxDelayMinutes || 10;
  const skipWeekends = settings.skipWeekends || false;

  console.log('[Matrix2 Generator] Ensuring 3 days worth of slots...');

  // Check next 3 calendar days
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateIso = formatInTimeZone(targetDate, adminTz, 'yyyy-MM-dd');
    
    // Skip weekends if configured
    if (skipWeekends) {
      const dayOfWeek = parseInt(formatInTimeZone(targetDate, adminTz, 'i')); // 1=Mon, 7=Sun
      if (dayOfWeek === 6 || dayOfWeek === 7) { // Saturday or Sunday
        console.log(`[Matrix2 Generator] Skipping ${dateIso} (weekend)`);
        continue;
      }
    }

    // Check if slots already exist for this day
    const existing = await getSlotsForDate(dateIso);
    if (existing.length >= dailyLimit) {
      console.log(`[Matrix2 Generator] Sufficient slots already exist for ${dateIso} (${existing.length}/${dailyLimit} slots)`);
      continue;
    }
    
    // If some slots exist but not enough, log warning and skip (don't partially fill)
    if (existing.length > 0 && existing.length < dailyLimit) {
      console.log(`[Matrix2 Generator] WARNING: Partial slots exist for ${dateIso} (${existing.length}/${dailyLimit}), skipping to prevent duplicates`);
      continue;
    }

    // Generate slots for this day
    await generateSlotsForDay(dateIso, adminTz, {
      dailyEmailLimit: dailyLimit,
      sendingHoursStart,
      sendingHoursEnd,
      minDelayMinutes,
      maxDelayMinutes,
    });
  }
}

/**
 * Helper to get admin user preferences (including timezone)
 * Finds the first user with a timezone set in their preferences
 */
async function getAdminUser() {
  const users = await storage.getAllUsers();
  if (!users || users.length === 0) {
    return null;
  }
  
  // Try to find the first user with a timezone set
  for (const user of users) {
    const preferences = await storage.getUserPreferences(user.id);
    if (preferences?.timezone) {
      console.log(`[Matrix2 Generator] Using timezone from user ${user.id}: ${preferences.timezone}`);
      return preferences;
    }
  }
  
  // Fallback: return first user's preferences even if no timezone
  console.log('[Matrix2 Generator] WARNING: No user with timezone found, using fallback');
  const preferences = await storage.getUserPreferences(users[0].id);
  return preferences;
}

// Extend storage interface with helper method
declare module '../../storage' {
  interface IStorage {
    getAdminUser(): Promise<{ timezone: string } | null>;
  }
}

// Add to storage implementation
storage.getAdminUser = getAdminUser;
