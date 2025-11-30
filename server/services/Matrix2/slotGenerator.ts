/**
 * CRITICAL: Matrix2 Email Slot Generation System
 * 
 * Slot-first architecture: Pre-generates daily email sending slots to enable rate-limiting,
 * geographic distribution, and predictable queue management. Recipients are assigned to
 * available slots, not the other way around.
 * 
 * ARCHITECTURE DECISIONS (DO NOT CHANGE WITHOUT UNDERSTANDING):
 * 
 * 1. BOUNDARY CALCULATION:
 *    - Slots are generated within: sendingHoursStart to sendingHoursStart + sendingHoursDuration
 *    - Midnight crossover: If duration goes past 24:00, slots span into next day (e.g., 22:00 + 5h = 03:00 tomorrow)
 *    - Formula for end hour: (startHour + duration) % 24
 *    - DO NOT use sendingHoursEnd directly - use duration-based calculation to handle midnight properly
 * 
 * 2. JITTER STRATEGY:
 *    - Pure random jitter: Each slot's delay is independently random between min/max (NOT evenly spaced)
 *    - Why: Prevents thundering herd (all recipients sending at same time)
 *    - First slot: Starts at exact sendingHoursStart (no jitter)
 *    - Subsequent slots: Each adds random delay from minDelayMinutes to maxDelayMinutes
 *    - Duplicate prevention: If random jitter equals previous, regenerate (max 10 attempts)
 * 
 * 3. TIMEZONE HANDLING:
 *    - All times stored in UTC in database
 *    - All boundary calculations done in admin timezone
 *    - Conversions: admin TZ → UTC for storage, UTC → admin TZ for checking boundaries
 *    - DO NOT mix timezones in calculations - always convert first
 * 
 * 4. TODAY'S SLOT GENERATION:
 *    - If generating for today and window hasn't started yet: Start from sendingHoursStart
 *    - If generating for today and window has started: Start from NOW (don't wait for window start)
 *    - Why: Avoids needlessly delaying emails until tomorrow
 * 
 * 5. MIDDLEWARE INTEGRATION:
 *    - Emits matrix:slotsChanged event after creation
 *    - Frontend listens for event and invalidates /api/matrix2/slots cache
 *    - Keeps 2-minute fallback polling as safety net
 * 
 * SAFEGUARDS:
 * - DO NOT change end hour calculation - midnight crossover logic is fragile
 * - DO NOT remove "today" special case - breaks real-time sending for same-day schedules
 * - DO NOT change jitter strategy from pure random - evenly spaced causes rate limiting issues
 * - DO NOT change timezone conversions - will cause slots in wrong time windows
 */

// server/services/Matrix2/slotGenerator.ts
import { storage } from "../../storage";
import { getSlotsForDate, createSlots } from "./slotDb";
import { addMinutes, addDays, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { randomInt } from "crypto";
import { eventGateway } from "../events/gateway";

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
    sendingHoursDuration?: number;
    sendingHoursEnd?: number;
    minDelayMinutes: number;
    maxDelayMinutes: number;
  }
) {
  const { dailyEmailLimit, sendingHoursStart, minDelayMinutes, maxDelayMinutes } = settings;
  
  // Phase 1-3: Support both duration and end hour for backward compatibility
  // Fallback logic: if duration not set, calculate from end hour
  const sendingHoursDuration = settings.sendingHoursDuration || 
    (settings.sendingHoursEnd === settings.sendingHoursStart ? 24 : 
     ((settings.sendingHoursEnd! - settings.sendingHoursStart + 24) % 24));
  const endHourCalculated = (sendingHoursStart + sendingHoursDuration) % 24;
  const needsNextDay = (sendingHoursStart + sendingHoursDuration) >= 24;

  // Generate slots starting at sendingHoursStart in admin timezone
  const slots: Date[] = [];
  
  // Start time: dateIso at sendingHoursStart in admin timezone → convert to UTC
  const startTimeStr = `${dateIso}T${String(sendingHoursStart).padStart(2, '0')}:00:00`;
  let cursor = new Date(formatInTimeZone(startTimeStr, adminTz, "yyyy-MM-dd'T'HH:mm:ssXXX"));
  
  // If generating for today and we're already past the window start, start from NOW instead
  const now = new Date();
  const todayIso = formatInTimeZone(now, adminTz, 'yyyy-MM-dd');
  if (dateIso === todayIso && now > cursor) {
    cursor = now;
  }
  
  // End time boundary: dateIso + duration hours
  // If duration spans past midnight, use next day for endBoundary
  const endDate = needsNextDay ? addDays(parseISO(dateIso), 1) : parseISO(dateIso);
  const endDateIso = formatInTimeZone(endDate, adminTz, 'yyyy-MM-dd');
  const endTimeStr = `${endDateIso}T${String(endHourCalculated).padStart(2, '0')}:00:00`;
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
        break;
      }
      
      slots.push(new Date(cursor));
    }
  }

  // Insert slots into database
  await createSlots(dateIso, slots);

  // Emit WebSocket event for real-time UI updates
  eventGateway.emit('matrix:slotsChanged', {
    date: dateIso,
    slotCount: slots.length,
    firstSlot: slots[0].toISOString(),
    lastSlot: slots[slots.length - 1].toISOString(),
  });
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
  const tenantId = await storage.getAdminTenantId();
  if (!tenantId) {
    return;
  }
  
  const settings = await storage.getEhubSettings(tenantId);
  if (!settings) {
    return;
  }

  // Get admin timezone from user preferences
  const adminUser = await storage.getAdminUser();
  const adminTz = adminUser?.timezone || 'America/New_York';

  const now = new Date();
  const dailyLimit = settings.dailyEmailLimit || 20;
  const sendingHoursStart = settings.sendingHoursStart || 6;
  const minDelayMinutes = settings.minDelayMinutes || 6;
  const maxDelayMinutes = settings.maxDelayMinutes || 10;
  const excludedDays = settings.excludedDays || [];
  
  // Phase 1-3: Support both duration and end hour for backward compatibility
  const sendingHoursDuration = settings.sendingHoursDuration || 
    (settings.sendingHoursEnd === settings.sendingHoursStart ? 24 : 
     ((settings.sendingHoursEnd! - settings.sendingHoursStart + 24) % 24));

  // Check next 3 calendar days
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateIso = formatInTimeZone(targetDate, adminTz, 'yyyy-MM-dd');
    
    // Skip excluded days if configured
    const dayOfWeek = parseInt(formatInTimeZone(targetDate, adminTz, 'i')); // 1=Mon, 7=Sun
    // Convert ISO day (1=Mon, 7=Sun) to JS day (0=Sun, 1=Mon, etc.)
    const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    if (excludedDays.includes(jsDay)) {
      continue;
    }

    // Check if slots already exist for this day
    const existing = await getSlotsForDate(dateIso);
    if (existing.length >= dailyLimit) {
      continue;
    }
    
    // If some slots exist but not enough, skip (don't partially fill)
    if (existing.length > 0 && existing.length < dailyLimit) {
      continue;
    }

    // Generate slots for this day
    await generateSlotsForDay(dateIso, adminTz, {
      dailyEmailLimit: dailyLimit,
      sendingHoursStart,
      sendingHoursDuration,
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
      return preferences;
    }
  }
  
  // Fallback: return first user's preferences even if no timezone
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
