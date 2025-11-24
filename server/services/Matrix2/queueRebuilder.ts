// server/services/Matrix2/queueRebuilder.ts
import { storage } from "../../storage";
import { deleteSlotsFromDate } from "./slotDb";
import { getScheduledRecipientsFromDate } from "./recipientDb";
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
 * Manually rebuild the entire queue with new settings
 * - ALWAYS starts from today to ensure all future slots are regenerated with new jitter
 * - Deletes all slots from today forward
 * - Regenerates 3 days of fresh slots with current jitter settings
 * - Reassigns existing scheduled recipients to new slots
 * 
 * This is triggered when user manually clicks "Rebuild Queue" button to refresh
 * settings like jitter that may have changed
 * 
 * @param adminUserId - User ID to fetch timezone preferences
 */
export async function rebuildQueueFromNextBusinessDay(adminUserId: string) {
  console.log('[QueueRebuilder] 🔄 Starting MANUAL queue rebuild - will refresh all future slots with new settings');
  
  // 1. Get admin timezone and E-Hub settings
  const userPrefs = await storage.getUserPreferences(adminUserId);
  const adminTz = userPrefs?.timezone || 'America/New_York';
  
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[QueueRebuilder] ❌ No E-Hub settings found');
    return;
  }
  
  console.log('[QueueRebuilder] Current E-Hub Settings:', {
    timezone: adminTz,
    sendingWindow: `${settings.sendingHoursStart}:00 - ${settings.sendingHoursEnd}:00`,
    jitterRange: `${settings.minDelayMinutes} - ${settings.maxDelayMinutes} minutes`,
    dailyLimit: settings.dailyEmailLimit,
    skipWeekends: settings.skipWeekends
  });
  
  // For MANUAL rebuild, ALWAYS start from today - this ensures new jitter is applied everywhere
  const now = new Date();
  const rebuildStartDate = now;
  const rebuildStartDateIso = now.toISOString().slice(0, 10);
  
  console.log('[QueueRebuilder] 🚀 Manual rebuild - starting from TODAY to apply new settings:', {
    todayDate: rebuildStartDateIso
  });
  
  // 3. Fetch all recipients currently scheduled from that day forward (in order)
  const scheduledRecipients = await getScheduledRecipientsFromDate(rebuildStartDateIso);
  
  console.log('[QueueRebuilder] Found scheduled recipients:', {
    count: scheduledRecipients.length,
    sample: scheduledRecipients.slice(0, 3).map((r: any) => ({
      email: r.email,
      slot_time_utc: r.slot_time_utc
    }))
  });
  
  if (scheduledRecipients.length === 0) {
    console.log('[QueueRebuilder] ✅ No recipients to reschedule');
    return;
  }
  
  // 4. Delete all slots from rebuild start date onward
  await deleteSlotsFromDate(rebuildStartDateIso);
  
  // 5. Regenerate 3 days worth of fresh slots with new settings
  console.log('[QueueRebuilder] Regenerating slots for 3 days...');
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const targetDate = addDays(rebuildStartDate, dayOffset);
    const targetDateIso = targetDate.toISOString().slice(0, 10);
    
    await generateSlotsForDay(targetDateIso, adminTz, {
      dailyEmailLimit: settings.dailyEmailLimit,
      sendingHoursStart: settings.sendingHoursStart,
      sendingHoursEnd: settings.sendingHoursEnd,
      minDelayMinutes: settings.minDelayMinutes,
      maxDelayMinutes: settings.maxDelayMinutes,
    });
  }
  
  // 6. Reassign recipients in the same order to the new slots
  console.log('[QueueRebuilder] Reassigning recipients to new slots...');
  
  let assignedCount = 0;
  let skippedCount = 0;
  
  for (const recipient of scheduledRecipients) {
    // Get the next available empty slot across all 3 days
    let assigned = false;
    
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const targetDate = addDays(rebuildStartDate, dayOffset);
      const targetDateIso = targetDate.toISOString().slice(0, 10);
      
      const emptySlots = await getEmptySlots(targetDateIso);
      
      // Try to assign to an eligible slot
      for (const slot of emptySlots) {
        const slotUtc = new Date(slot.slot_time_utc);
        
        if (isRecipientEligibleForSlot(recipient, slotUtc, settings)) {
          await fillSlot(slot.id, recipient.id);
          assignedCount++;
          assigned = true;
          console.log(`[QueueRebuilder] ✓ Assigned ${recipient.email} to ${slotUtc.toISOString()}`);
          break;
        }
      }
      
      if (assigned) break;
    }
    
    if (!assigned) {
      skippedCount++;
      console.log(`[QueueRebuilder] ⚠️  Could not find eligible slot for ${recipient.email}`);
    }
  }
  
  console.log('[QueueRebuilder] ✅ Rebuild complete:', {
    totalRecipients: scheduledRecipients.length,
    assigned: assignedCount,
    skipped: skippedCount
  });
}

/**
 * Check if a recipient is eligible for a specific slot
 * Based on their timezone, business hours, and step delay
 */
function isRecipientEligibleForSlot(
  recipient: any,
  slotUtc: Date,
  settings: any
): boolean {
  // Parse recipient's business hours
  const businessHours = parseBusinessHours(recipient.business_hours);
  if (!businessHours) {
    return false;
  }
  
  // Convert slot time to recipient's local timezone
  const recipientLocalTime = toZonedTime(slotUtc, recipient.timezone);
  const recipientHour = recipientLocalTime.getHours();
  const recipientMinute = recipientLocalTime.getMinutes();
  const recipientLocalMinutes = recipientHour * 60 + recipientMinute;
  
  // Check if within business hours window
  const businessStart = businessHours.opens_at + (settings.clientStartOffsetHours * 60);
  const businessEnd = settings.clientCutoffHour * 60;
  
  if (recipientLocalMinutes < businessStart || recipientLocalMinutes >= businessEnd) {
    return false;
  }
  
  // Check step delay (if recipient has a last_step_sent_at)
  if (recipient.last_step_sent_at && recipient.step_delay) {
    const lastSentAt = new Date(recipient.last_step_sent_at);
    const stepDelayMs = recipient.step_delay * 24 * 60 * 60 * 1000; // days to ms
    const earliestNextSend = new Date(lastSentAt.getTime() + stepDelayMs);
    
    if (slotUtc < earliestNextSend) {
      return false;
    }
  }
  
  return true;
}
