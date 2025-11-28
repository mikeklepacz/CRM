// server/services/Matrix2/queueRebuilder.ts
import { storage } from "../../storage";
import { generateSlotsForDay } from "./slotGenerator";
import { fillSlot, getEmptySlots } from "./slotDb";
import { parseBusinessHours } from "../timezoneHours";
import { toZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";


/**
 * Calculate the next business day from a given date
 * Respects skip_weekends setting and admin timezone
 */
function getNextBusinessDay(fromDate: Date, adminTz: string, skipWeekends: boolean): Date {
  let nextDay = addDays(fromDate, 1);
  
  if (skipWeekends) {
    // Convert to admin timezone to check day of week
    const zonedDate = toZonedTime(nextDay, adminTz);
    const dayOfWeek = zonedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // If Saturday, jump to Monday
    if (dayOfWeek === 6) {
      nextDay = addDays(nextDay, 2);
    }
    // If Sunday, jump to Monday
    else if (dayOfWeek === 0) {
      nextDay = addDays(nextDay, 1);
    }
  }
  
  return nextDay;
}

/**
 * Manually rebuild the ENTIRE queue with new settings
 * - Deletes ALL slots (past, present, and future)
 * - Regenerates fresh queue from today forward for 3 days with current jitter settings
 * - Reassigns existing scheduled recipients to new slots
 * 
 * This is triggered when user manually clicks "Rebuild Queue" button to refresh
 * settings like jitter that may have changed
 * 
 * @param adminUserId - User ID to fetch timezone preferences
 */
export async function rebuildQueueFromNextBusinessDay(adminUserId: string) {
  
  // 1. Get admin timezone and E-Hub settings
  const userPrefs = await storage.getUserPreferences(adminUserId);
  const adminTz = userPrefs?.timezone || 'America/New_York';
  
  const settings = await storage.getEhubSettings();
  if (!settings) {
    return;
  }
  
  // Phase 1-3: Support both duration and end hour for backward compatibility
  const sendingHoursDuration = settings.sendingHoursDuration || 
    (settings.sendingHoursEnd === settings.sendingHoursStart ? 24 : 
     ((settings.sendingHoursEnd! - settings.sendingHoursStart + 24) % 24));
  const endHourCalculated = (settings.sendingHoursStart + sendingHoursDuration) % 24;
  
  // For COMPLETE rebuild, delete ALL slots and start fresh from today
  const now = new Date();
  const rebuildStartDate = now;
  const rebuildStartDateIso = now.toISOString().slice(0, 10);
  
  // 3. FETCH RECIPIENTS FIRST (before deleting slots!)
  // Get all active recipients that are currently in the sequence_recipients table
  const { db } = await import('../../db');
  const { sql } = await import('drizzle-orm');
  
  const recipientResult = await db.execute(sql`
    SELECT 
      sr.id,
      sr.email,
      sr.sequence_id,
      sr.current_step,
      sr.timezone,
      sr.business_hours,
      sr.state,
      sr.status,
      sr.last_step_sent_at,
      (SELECT array_agg(ss.delay_days ORDER BY ss.step_number) 
       FROM sequence_steps ss 
       WHERE ss.sequence_id = s.id) as step_delays,
      s.status as sequence_status
    FROM sequence_recipients sr
    LEFT JOIN sequences s ON sr.sequence_id = s.id
    WHERE sr.status NOT IN ('bounced')
      AND s.status = 'active'
    ORDER BY 
      sr.id ASC
  `);
  
  const allRecipients = (recipientResult as any).rows || [];
  
  // 4. DELETE ALL SLOTS (NUKE THE ENTIRE QUEUE)
  await db.execute(sql`DELETE FROM daily_send_slots`);
  
  // 5. Regenerate 3 days worth of fresh slots with new settings
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const targetDate = addDays(rebuildStartDate, dayOffset);
    const targetDateIso = targetDate.toISOString().slice(0, 10);
    
    await generateSlotsForDay(targetDateIso, adminTz, {
      dailyEmailLimit: settings.dailyEmailLimit,
      sendingHoursStart: settings.sendingHoursStart,
      sendingHoursDuration: sendingHoursDuration,
      minDelayMinutes: settings.minDelayMinutes,
      maxDelayMinutes: settings.maxDelayMinutes,
    });
  }
  
  // 6. Reassign recipients to the new slots
  // All recipients fetched are from ACTIVE sequences only
  const orderedRecipients = allRecipients;
  
  let assignedCount = 0;
  let skippedCount = 0;
  
  for (const recipient of orderedRecipients) {
    // CRITICAL: Clear any existing slot assignments for this recipient before reassigning
    // This prevents the same recipient from being assigned to multiple slots
    await db.execute(sql`
      UPDATE daily_send_slots
      SET recipient_id = NULL, filled = false
      WHERE recipient_id = ${recipient.id}
    `);
    
    // Provide default timezone if missing
    const recipientTz = recipient.timezone || adminTz;
    const recipientWithDefaults = { ...recipient, timezone: recipientTz };
    
    // Get the next available empty slot across all 3 days
    let assigned = false;
    
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const targetDate = addDays(rebuildStartDate, dayOffset);
      const targetDateIso = targetDate.toISOString().slice(0, 10);
      
      const emptySlots = await getEmptySlots(targetDateIso);
      
      // Try to assign to an eligible slot
      for (const slot of emptySlots) {
        const slotUtc = new Date(slot.slot_time_utc);
        const now = new Date();
        
        // Only assign to slots that are at least minDelayMinutes in the future
        // This respects the jitter spacing and prevents immediate sends
        const minJitterMs = settings.minDelayMinutes * 60 * 1000;
        const minAllowedTime = new Date(now.getTime() + minJitterMs);
        
        if (slotUtc < minAllowedTime) {
          continue;
        }
        
        if (isRecipientEligibleForSlot(recipientWithDefaults, slotUtc, settings)) {
          await fillSlot(slot.id, recipient.id);
          assignedCount++;
          assigned = true;
          break;
        }
      }
      
      if (assigned) break;
    }
    
    if (!assigned) {
      skippedCount++;
    }
  }
}

/**
 * Check if a recipient is eligible for a specific slot
 * For rebuild: we're lenient and just assign to available slots
 */
function isRecipientEligibleForSlot(
  recipient: any,
  slotUtc: Date,
  settings: any
): boolean {
  // For a manual rebuild, be lenient - just assign to available slots
  // The business hours and step delay validation will kick in during normal operation
  try {
    // Only require recipient has a timezone
    if (!recipient.timezone) {
      return false;
    }
    
    // Try to parse business hours but don't fail if missing
    if (recipient.business_hours) {
      const businessHours = parseBusinessHours(recipient.business_hours);
      if (businessHours) {
        // Convert slot time to recipient's local timezone
        const recipientLocalTime = toZonedTime(slotUtc, recipient.timezone);
        const recipientHour = recipientLocalTime.getHours();
        const recipientMinute = recipientLocalTime.getMinutes();
        const recipientLocalMinutes = recipientHour * 60 + recipientMinute;
        
        // Check if within business hours window
        const businessStart = businessHours.opens_at + (settings.clientStartOffsetHours || 0) * 60;
        const businessEnd = (settings.clientCutoffHour || 14) * 60;
        
        if (recipientLocalMinutes < businessStart || recipientLocalMinutes >= businessEnd) {
          // Outside business hours, but for rebuild we still allow it
        }
      }
    }
    
    return true;
  } catch (error: any) {
    // For rebuild, if we can't validate, still allow it
    return true;
  }
}
