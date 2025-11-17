// server/services/Matrix2/slotAssigner.ts
import { parseBusinessHours } from "../timezoneHours";
import { utcToZonedTime } from "date-fns-tz";
import { getEmptySlots, fillSlot } from "./slotDb";
import { getEligibleRecipientsForAssignment } from "./recipientDb";
import { storage } from "../../storage";

export async function assignRecipientsToSlots() {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[Matrix2 Assigner] No E-Hub settings found, skipping assignment');
    return;
  }

  const today = new Date();
  const dateIso = today.toISOString().slice(0, 10);
  const slots = await getEmptySlots(dateIso);
  
  if (slots.length === 0) {
    console.log(`[Matrix2 Assigner] No empty slots for ${dateIso}`);
    return;
  }

  const recipients = await getEligibleRecipientsForAssignment();
  
  if (recipients.length === 0) {
    console.log(`[Matrix2 Assigner] No eligible recipients for assignment`);
    return;
  }

  console.log(`[Matrix2 Assigner] Assigning ${recipients.length} recipients to ${slots.length} slots for ${dateIso}`);

  let assignedCount = 0;

  for (const slot of slots) {
    const slotUtc = new Date(slot.slot_time_utc);

    // Find first eligible recipient for this slot
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      
      if (!isRecipientEligible(r, slotUtc, settings)) {
        continue;
      }

      // Assign this recipient to this slot
      await fillSlot(slot.id, r.id, r.sequence_id, r.current_step);
      
      console.log(`[Matrix2 Assigner] Assigned recipient ${r.recipient_id} to slot ${slot.id} at ${slotUtc.toISOString()}`);
      
      // Remove from available recipients
      recipients.splice(i, 1);
      assignedCount++;
      break;
    }
  }

  console.log(`[Matrix2 Assigner] Assigned ${assignedCount} recipients to slots`);
}

function isRecipientEligible(recipient: any, slotUtc: Date, settings: any): boolean {
  const recipientState = recipient.state || '';
  const recipientTimezone = recipient.timezone;
  
  if (!recipientTimezone) {
    return false; // Can't schedule without timezone
  }

  // Convert slot UTC time to recipient's local time
  const localTime = utcToZonedTime(slotUtc, recipientTimezone);

  // Parse business hours with state parameter
  const parsed = parseBusinessHours(recipient.business_hours || '', recipientState);
  
  // If business is closed, not eligible
  if (parsed.isClosed) {
    return false;
  }

  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = localTime.getDay();

  // Check skip_weekends setting
  if (settings.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }

  // Get schedule for this day
  const daySchedule = parsed.schedule[dayOfWeek];
  
  if (!daySchedule || daySchedule.length === 0) {
    return false; // No schedule for this day
  }

  // Use first time range
  const firstRange = daySchedule[0];
  const openMinutes = firstRange.open;
  const closeMinutes = firstRange.close;

  // Get local time in minutes since midnight
  const localMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  // Apply client_window_start_offset (hours after open)
  const clientWindowStartOffset = parseFloat(String(settings.clientWindowStartOffset || 1));
  const windowStartMinutes = openMinutes + (clientWindowStartOffset * 60);

  // Apply client_window_end_hour (local cutoff)
  const clientWindowEndHour = settings.clientWindowEndHour || 14;
  const windowEndMinutes = Math.min(closeMinutes, clientWindowEndHour * 60);

  // Check if slot falls within eligible window
  if (localMinutes < windowStartMinutes || localMinutes > windowEndMinutes) {
    return false;
  }

  // Enforce step_delay if present
  if (recipient.step_delay && recipient.step_delay > 0) {
    if (recipient.last_step_sent_at) {
      const lastSent = new Date(recipient.last_step_sent_at);
      const delayMs = recipient.step_delay * 24 * 60 * 60 * 1000;
      const earliestNext = new Date(lastSent.getTime() + delayMs);
      
      if (slotUtc < earliestNext) {
        return false; // Too soon based on step delay
      }
    }
  }

  return true;
}
