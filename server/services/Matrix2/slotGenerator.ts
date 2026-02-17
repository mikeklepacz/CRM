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
import { getSlotsForDateAndAccount, createSlots } from "./slotDb";
import { getInUseSenderAccountIds } from "./senderAccountScope";
import { assignRecipientsToSlots } from "./slotAssigner";
import { addMinutes, addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { randomInt } from "crypto";
import { eventGateway } from "../events/gateway";

/**
 * Generate slots for a single day for a specific email account
 * Each email account gets its own dailyLimit slots
 * 
 * @param dateIso - The date in YYYY-MM-DD format
 * @param adminTz - Admin timezone
 * @param tenantId - Tenant ID
 * @param emailAccountId - Email account ID this slot belongs to
 * @param settings - E-Hub settings
 */
export async function generateSlotsForDayAndAccount(
  dateIso: string,
  adminTz: string,
  tenantId: string,
  emailAccountId: string,
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
  const sendingHoursDuration = settings.sendingHoursDuration || 
    (settings.sendingHoursEnd === settings.sendingHoursStart ? 24 : 
     ((settings.sendingHoursEnd! - settings.sendingHoursStart + 24) % 24));
  const endHourCalculated = (sendingHoursStart + sendingHoursDuration) % 24;
  const needsNextDay = (sendingHoursStart + sendingHoursDuration) >= 24;

  const slots: Date[] = [];
  
  // Start time: local admin datetime -> UTC for storage
  const startTimeStr = `${dateIso}T${String(sendingHoursStart).padStart(2, "0")}:00:00`;
  let cursor = fromZonedTime(startTimeStr, adminTz);
  
  // If generating for today and we're already past the window start, start from NOW instead
  const now = new Date();
  const todayIso = formatInTimeZone(now, adminTz, 'yyyy-MM-dd');
  if (dateIso === todayIso && now > cursor) {
    cursor = now;
  }
  
  // End boundary: local admin datetime -> UTC for storage
  const localMidnightUtc = fromZonedTime(`${dateIso}T00:00:00`, adminTz);
  const endDateIso = needsNextDay
    ? formatInTimeZone(addDays(localMidnightUtc, 1), adminTz, "yyyy-MM-dd")
    : dateIso;
  const endTimeStr = `${endDateIso}T${String(endHourCalculated).padStart(2, "0")}:00:00`;
  const endBoundary = fromZonedTime(endTimeStr, adminTz);
  
  let previousJitter: number | null = null;
  
  for (let i = 0; i < dailyEmailLimit; i++) {
    if (i === 0) {
      slots.push(new Date(cursor));
    } else {
      let jitter = randomInt(minDelayMinutes, maxDelayMinutes + 1);
      let attempts = 0;
      while (jitter === previousJitter && attempts < 10) {
        jitter = randomInt(minDelayMinutes, maxDelayMinutes + 1);
        attempts++;
      }
      previousJitter = jitter;
      
      cursor = addMinutes(cursor, jitter);
      
      if (cursor >= endBoundary) {
        break;
      }
      
      slots.push(new Date(cursor));
    }
  }

  // Insert slots with email_account_id
  await createSlots(dateIso, slots, tenantId, emailAccountId);

  return slots;
}

/**
 * Legacy wrapper for backward compatibility
 * Generates slots without email account (for migration period)
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
  // This is now a no-op - slots are generated per email account in ensureDailySlots
  console.warn('[SlotGenerator] generateSlotsForDay called without email account - skipping');
}

/**
 * Ensure 3 days worth of slots are always available for ALL active email accounts
 * 
 * This function:
 * 1. Gets all active email accounts in the pool
 * 2. For each account, generates dailyLimit slots per day
 * 3. Skips weekends/holidays if configured
 * 
 * Result: If 2 accounts with dailyLimit=100, total 200 slots per day
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

  // Get all active email accounts in the pool
  const emailAccounts = await storage.getActiveEmailAccounts(tenantId);
  if (!emailAccounts || emailAccounts.length === 0) {
    return;
  }
  const inUseSenderAccountIds = await getInUseSenderAccountIds(tenantId);
  if (inUseSenderAccountIds.size === 0) {
    return;
  }
  const scopedEmailAccounts = emailAccounts.filter((account) => inUseSenderAccountIds.has(account.id));
  if (scopedEmailAccounts.length === 0) {
    return;
  }

  // Use admin profile timezone from user preferences.
  const adminTz = await getAdminTimezone(tenantId);

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

  let totalSlotsGenerated = 0;

  // Check next 3 calendar days
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateIso = formatInTimeZone(targetDate, adminTz, 'yyyy-MM-dd');
    
    // Skip excluded days if configured
    const dayOfWeek = parseInt(formatInTimeZone(targetDate, adminTz, 'i')); // 1=Mon, 7=Sun
    const jsDay = dayOfWeek === 7 ? 0 : dayOfWeek;
    if (excludedDays.includes(jsDay)) {
      continue;
    }

    // Generate slots for EACH email account
    for (const account of scopedEmailAccounts) {
      // Check if slots already exist for this account + day
      const existing = await getSlotsForDateAndAccount(dateIso, account.id);
      if (existing.length >= dailyLimit) {
        continue;
      }
      
      // If some slots exist but not enough, skip (don't partially fill)
      if (existing.length > 0 && existing.length < dailyLimit) {
        continue;
      }

      // Generate slots for this account
      const slots = await generateSlotsForDayAndAccount(dateIso, adminTz, tenantId, account.id, {
        dailyEmailLimit: dailyLimit,
        sendingHoursStart,
        sendingHoursDuration,
        minDelayMinutes,
        maxDelayMinutes,
      });
      
      totalSlotsGenerated += slots.length;
    }
  }

  // Emit event if we generated any slots
  if (totalSlotsGenerated > 0) {
    eventGateway.emit('matrix:slotsChanged', {
      totalSlotsGenerated,
      accountCount: scopedEmailAccounts.length,
    });

    // Fill newly generated slots immediately so rebuild/generate actions reflect in UI
    // without waiting for the periodic queue processor cycle.
    try {
      await assignRecipientsToSlots();
    } catch {
      // Keep slot generation successful even if immediate assignment fails.
    }
  }
}

/**
 * Resolve admin timezone from user preferences.
 */
async function getAdminTimezone(tenantId: string): Promise<string> {
  const adminUser = await storage.getAdminUser();
  if (!adminUser?.id) {
    throw new Error("E-Hub slot generation aborted: no admin user found");
  }

  const adminPreferences = await storage.getUserPreferences(adminUser.id, tenantId);
  if (!adminPreferences?.timezone) {
    throw new Error(
      `E-Hub slot generation aborted: timezone missing for admin user ${adminUser.id} in tenant ${tenantId}`
    );
  }

  return adminPreferences.timezone;
}
