/**
 * CRITICAL: Matrix2 Email Slot Assignment System
 * 
 * Assigns eligible recipients to pre-generated slots. Uses priority-based tier system
 * to ensure manual follow-ups get sent before cold outreach, optimizing human engagement.
 * 
 * ARCHITECTURE DECISIONS (DO NOT CHANGE WITHOUT UNDERSTANDING):
 * 
 * 1. PRIORITY TIERS (critical for fairness):
 *    - Tier 1 (Highest): Manual Follow-Ups at step 1+ (human handoffs getting AI follow-ups)
 *    - Tier 2 (Medium): Active follow-ups at step 2+ (nurturing existing sequences)
 *    - Tier 3 (Lowest): Cold outreach at step 0 (first contact)
 *    - Recipients in higher tiers get first access to available slots
 *    - DO NOT change tier ordering without considering impact on sequence completion rates
 * 
 * 2. SHORT-CIRCUIT OPTIMIZATION:
 *    - Check eligible recipients FIRST (before fetching slots)
 *    - If zero eligible recipients: Skip expensive slot query entirely
 *    - Saves 200-500ms of unnecessary database queries per cycle
 *    - DO NOT remove this check - significantly impacts CPU usage during queue cycles
 * 
 * 3. MULTI-STEP PROGRESSION:
 *    - After recipient is assigned and email sent, automatic advancement happens in email sending logic
 *    - Example: Recipient at step 1 receives email → automatically promoted to step 2
 *    - Next queue cycle: Recipient fetched again at step 2, assigned to new slot
 *    - DO NOT modify step advancement here - logic is in emailSender, keeping concerns separated
 * 
 * 4. PAST SLOT PREVENTION:
 *    - Never assign slots with times in the past
 *    - Prevents flash-disappear behavior when queue is paused/resumed
 *    - DO NOT remove this check - causes UX issue where emails appear then vanish
 * 
 * 5. EVENT EMISSION:
 *    - Emits matrix:assigned event after successful slot assignment
 *    - Frontend invalidates /api/recipients cache to show updated status
 *    - Keeps 2-minute fallback polling as safety net
 * 
 * SAFEGUARDS:
 * - DO NOT change priority tier ordering - directly affects fairness and completion rates
 * - DO NOT remove short-circuit recipient check - causes 10x+ increase in DB queries during idle periods
 * - DO NOT remove past slot prevention - breaks queue pause/resume behavior
 * - DO NOT modify step advancement logic here - keep in email sender for separation of concerns
 */

// server/services/Matrix2/slotAssigner.ts
import { parseBusinessHours } from "../timezoneHours";
import { toZonedTime } from "date-fns-tz";
import { getEmptySlots, fillSlot } from "./slotDb";
import { getEligibleRecipientsForAssignment } from "./recipientDb";
import { storage } from "../../storage";
import { eventGateway } from "../events/gateway";
import { isNoSendDay } from '../holidayCalendar';

/**
 * Immediately assign a specific recipient to the next available slot
 * Called when a recipient is enrolled to avoid waiting for the 60s queue cycle
 */
export async function assignSingleRecipient(recipientId: string) {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    return;
  }

  const today = new Date();
  const dateIso = today.toISOString().slice(0, 10);
  const slots = await getEmptySlots(dateIso);
  
  if (slots.length === 0) {
    return;
  }

  // Get the specific recipient
  const recipients = await getEligibleRecipientsForAssignment();
  const recipient = recipients.find(r => r.id === recipientId);
  
  if (!recipient) {
    return;
  }

  // Try to assign to first available slot
  const now = new Date();
  for (const slot of slots) {
    const slotUtc = new Date(slot.slot_time_utc);

    // CRITICAL: Don't assign slots in the past (prevents flash-disappear on pause/resume)
    if (slotUtc < now) {
      continue;
    }

    if (await isRecipientEligible(recipient, slotUtc, settings)) {
      await fillSlot(slot.id, recipient.id);
      
      // Emit WebSocket event for real-time UI updates
      eventGateway.emit('matrix:assigned', {
        recipientId: recipient.id,
        slotId: slot.id,
        email: recipient.email,
        slotTime: slotUtc.toISOString(),
      });
      return;
    }
  }
}

/**
 * Calculate priority tier for a recipient
 * 
 * Tier 1 (Highest): Manual Follow-Ups at step 1+ (human handoffs getting AI follow-ups)
 * Tier 2 (Medium): Active follow-ups at step 2+ (all other sequences) 
 * Tier 3 (Lowest): Cold outreach at step 0 (first email in any sequence)
 */
function getPriorityTier(recipient: any): number {
  const currentStep = recipient.current_step || 0;
  const isManualFollowUps = recipient.is_system === true;

  // Tier 1: Manual Follow-Ups sequence at step 1+
  if (isManualFollowUps && currentStep >= 1) {
    return 1;
  }

  // Tier 2: Any sequence at step 2+
  if (currentStep >= 2) {
    return 2;
  }

  // Tier 3: Cold outreach (step 0) or Manual Follow-Ups step 0 (waiting for promotion)
  return 3;
}

export async function assignRecipientsToSlots() {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    return;
  }

  // SHORT-CIRCUIT: Check recipients FIRST before fetching slots
  const recipients = await getEligibleRecipientsForAssignment();
  if (recipients.length === 0) {
    return;
  }

  // Get all empty slots across the next 3 days (matching slot generator window)
  const today = new Date();
  const allSlots = [];
  
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateIso = targetDate.toISOString().slice(0, 10);
    
    const daySlots = await getEmptySlots(dateIso);
    allSlots.push(...daySlots);
  }
  
  if (allSlots.length === 0) {
    return;
  }

  // Apply three-tier priority sorting
  // Tier 1: Manual Follow-Ups at step 1+ (human handoffs getting AI follow-ups)
  // Tier 2: Active follow-ups at step 2+ (all other sequences)
  // Tier 3: Cold outreach at step 0 (first email in any sequence)
  const sortedRecipients = recipients.sort((a, b) => {
    const tierA = getPriorityTier(a);
    const tierB = getPriorityTier(b);
    
    // Lower tier number = higher priority
    if (tierA !== tierB) {
      return tierA - tierB;
    }
    
    // Same tier: maintain FIFO (already sorted by created_at ASC from query)
    return 0;
  });

  let assignedCount = 0;
  const now = new Date();

  for (const slot of allSlots) {
    const slotUtc = new Date(slot.slot_time_utc);

    // CRITICAL: Don't assign past slots (prevents flash-disappear on pause/resume)
    if (slotUtc < now) {
      continue;
    }

    // Find first eligible recipient for this slot (now sorted by priority)
    for (let i = 0; i < sortedRecipients.length; i++) {
      const r = sortedRecipients[i];
      
      if (!(await isRecipientEligible(r, slotUtc, settings))) {
        continue;
      }

      // Assign this recipient to this slot
      await fillSlot(slot.id, r.id);
      
      const tier = getPriorityTier(r);
      
      // Emit WebSocket event for real-time UI updates
      eventGateway.emit('matrix:assigned', {
        recipientId: r.id,
        slotId: slot.id,
        email: r.email,
        tier,
        slotTime: slotUtc.toISOString(),
      });
      
      // Remove from available recipients
      sortedRecipients.splice(i, 1);
      assignedCount++;
      break;
    }
  }
}

async function isRecipientEligible(recipient: any, slotUtc: Date, settings: any): Promise<boolean> {
  const recipientState = recipient.state || '';
  const recipientTimezone = recipient.timezone;
  
  if (!recipientTimezone) {
    return false; // No timezone - skip silently (common case)
  }

  // Validate timezone is valid IANA
  try {
    Intl.DateTimeFormat(undefined, { timeZone: recipientTimezone });
  } catch (error) {
    return false;
  }

  // Convert slot UTC time to recipient's local time
  const localTime = toZonedTime(slotUtc, recipientTimezone);
  const dayOfWeek = localTime.getDay();

  // Check if this is a no-send day (federal holiday or custom blackout)
  // Pass UTC slot time + recipient timezone for proper date conversion
  const noSendCheck = await isNoSendDay(slotUtc, recipientTimezone);
  if (noSendCheck.blocked) {
    return false; // Blocked day - skip silently
  }

  // Check excluded days setting FIRST (before business hours parsing)
  const excludedDays = settings.excludedDays || [];
  if (excludedDays.includes(dayOfWeek)) {
    return false; // Excluded day - skip silently (expected behavior)
  }

  // Parse business hours with state parameter
  const parsed = parseBusinessHours(recipient.business_hours || '', recipientState);
  
  if (parsed.isClosed) {
    return false; // Business closed - skip silently (expected)
  }

  const daySchedule = parsed.schedule[dayOfWeek];
  if (!daySchedule || daySchedule.length === 0) {
    return false; // No schedule for day - skip silently
  }

  // Use first time range
  const firstRange = daySchedule[0];
  const openMinutes = firstRange.open;
  const closeMinutes = firstRange.close;
  const localMinutes = localTime.getHours() * 60 + localTime.getMinutes();

  // Apply client_window_start_offset (hours after open)
  const clientWindowStartOffset = parseFloat(String(settings.clientWindowStartOffset || 1));
  const windowStartMinutes = openMinutes + (clientWindowStartOffset * 60);

  // Apply client_window_end_hour (local cutoff)
  const clientWindowEndHour = settings.clientWindowEndHour || 14;
  const windowEndMinutes = Math.min(closeMinutes, clientWindowEndHour * 60);

  if (localMinutes < windowStartMinutes || localMinutes > windowEndMinutes) {
    return false; // Outside business window - skip silently (expected)
  }

  // Enforce step_delay if present
  if (recipient.step_delay && recipient.step_delay > 0 && recipient.last_step_sent_at) {
    const lastSent = new Date(recipient.last_step_sent_at);
    const delayMs = recipient.step_delay * 24 * 60 * 60 * 1000;
    const earliestNext = new Date(lastSent.getTime() + delayMs);
    
    if (slotUtc < earliestNext) {
      return false;
    }
  }

  return true;
}
