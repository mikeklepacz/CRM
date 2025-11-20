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
 * Rebuild the queue with context-aware start date
 * - If we're still in today's sending window with remaining time, use today
 * - If before sending window or after it ends, start from next business day
 * Preserves recipient order but regenerates all slot times with new settings
 * 
 * @param adminUserId - User ID to fetch timezone preferences
 */
export async function rebuildQueueFromNextBusinessDay(adminUserId: string) {
  console.log('[QueueRebuilder] Starting queue rebuild...');
  
  // 1. Get admin timezone and E-Hub settings
  const userPrefs = await storage.getUserPreferences(adminUserId);
  const adminTz = userPrefs?.timezone || 'America/New_York';
  
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[QueueRebuilder] ❌ No E-Hub settings found');
    return;
  }
  
  console.log('[QueueRebuilder] Using admin timezone:', adminTz);
  console.log('[QueueRebuilder] Skip weekends:', settings.skipWeekends);
  
  // 2. Determine the rebuild start date based on current time and sending window
  const now = new Date();
  const adminLocalTime = toZonedTime(now, adminTz);
  const currentHour = adminLocalTime.getHours();
  const currentMinute = adminLocalTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  const sendingStartMinutes = settings.sendingHoursStart * 60;
  const sendingEndMinutes = settings.sendingHoursEnd * 60;
  
  // Check if we're currently in the sending window with meaningful time remaining
  const isInSendingWindow = currentTimeMinutes >= sendingStartMinutes && currentTimeMinutes < sendingEndMinutes;
  const remainingMinutes = sendingEndMinutes - currentTimeMinutes;
  const hasUsefulTimeRemaining = remainingMinutes >= settings.maxDelayMinutes; // At least one jitter window remaining
  
  let rebuildStartDate: Date;
  let rebuildStartDateIso: string;
  
  if (isInSendingWindow && hasUsefulTimeRemaining) {
    // We're in the window with time left - use today to capture remaining slots
    rebuildStartDate = now;
    rebuildStartDateIso = now.toISOString().slice(0, 10);
    console.log('[QueueRebuilder] 🚀 In sending window with time remaining - rebuilding from TODAY:', {
      currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
      windowEnd: `${settings.sendingHoursEnd}:00`,
      remainingMinutes,
      startDate: rebuildStartDateIso
    });
  } else {
    // Either before window, after window, or not enough time left - start from next business day
    rebuildStartDate = getNextBusinessDay(now, adminTz, settings.skipWeekends);
    rebuildStartDateIso = rebuildStartDate.toISOString().slice(0, 10);
    console.log('[QueueRebuilder] 📅 Starting from next business day:', {
      reason: !isInSendingWindow ? 'outside sending window' : 'insufficient time remaining',
      currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
      windowStart: `${settings.sendingHoursStart}:00`,
      windowEnd: `${settings.sendingHoursEnd}:00`,
      nextBusinessDay: rebuildStartDateIso
    });
  }
  
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
