// server/services/Matrix2/slotAssigner.ts
import { parseBusinessHours } from "../timezoneHours";
import { toZonedTime } from "date-fns-tz";
import { getEmptySlots, fillSlot } from "./slotDb";
import { getEligibleRecipientsForAssignment } from "./recipientDb";
import { storage } from "../../storage";
import { eventGateway } from "../events/gateway";

/**
 * Immediately assign a specific recipient to the next available slot
 * Called when a recipient is enrolled to avoid waiting for the 60s queue cycle
 */
export async function assignSingleRecipient(recipientId: string) {
  const settings = await storage.getEhubSettings();
  if (!settings) {
    console.log('[Matrix2 Assigner] No E-Hub settings found');
    return;
  }

  const today = new Date();
  const dateIso = today.toISOString().slice(0, 10);
  const slots = await getEmptySlots(dateIso);
  
  if (slots.length === 0) {
    console.log(`[Matrix2 Assigner] No empty slots available for ${recipientId}`);
    return;
  }

  // Get the specific recipient
  const recipients = await getEligibleRecipientsForAssignment();
  const recipient = recipients.find(r => r.id === recipientId);
  
  if (!recipient) {
    console.log(`[Matrix2 Assigner] Recipient ${recipientId} not eligible for assignment`);
    return;
  }

  // Try to assign to first available slot
  const now = new Date();
  for (const slot of slots) {
    const slotUtc = new Date(slot.slot_time_utc);

    // CRITICAL: Don't assign slots in the past (prevents flash-disappear on pause/resume)
    if (slotUtc < now) {
      console.log(`[Matrix2 Assigner] Skipping past slot for ${recipient.email}: ${slotUtc.toISOString()} < ${now.toISOString()}`);
      continue;
    }

    if (isRecipientEligible(recipient, slotUtc, settings)) {
      await fillSlot(slot.id, recipient.id);
      console.log(`[Matrix2 Assigner] ✅ Assigned recipient ${recipient.email} to future slot ${slot.id} at ${slotUtc.toISOString()}`);
      
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

  console.log(`[Matrix2 Assigner] ⚠️ No eligible future slots found for recipient ${recipient.email} (checked ${slots.length} slots)`);
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
    console.log('[Matrix2 Assigner] No E-Hub settings found, skipping assignment');
    return;
  }

  // SHORT-CIRCUIT: Check recipients FIRST before fetching slots
  const recipients = await getEligibleRecipientsForAssignment();
  if (recipients.length === 0) {
    console.log('[Matrix2 Assigner] No eligible recipients, skipping slot fetch');
    return;
  }

  console.log(`[Matrix2 Assigner] Found ${recipients.length} eligible recipients, fetching slots...`);

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
    console.log(`[Matrix2 Assigner] No empty slots available in 3-day window`);
    return;
  }

  console.log(`[Matrix2 Assigner] ${allSlots.length} slots available, assigning ${recipients.length} recipients...`);

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

  console.log('[Matrix2 Assigner] Priority distribution:', {
    tier1: sortedRecipients.filter(r => getPriorityTier(r) === 1).length,
    tier2: sortedRecipients.filter(r => getPriorityTier(r) === 2).length,
    tier3: sortedRecipients.filter(r => getPriorityTier(r) === 3).length,
  });

  console.log(`[Matrix2 Assigner] Assigning ${sortedRecipients.length} recipients to ${allSlots.length} slots across 3 days`);

  let assignedCount = 0;
  let skippedPastSlots = 0;
  const now = new Date();

  for (const slot of allSlots) {
    const slotUtc = new Date(slot.slot_time_utc);

    // CRITICAL: Don't assign past slots (prevents flash-disappear on pause/resume)
    if (slotUtc < now) {
      skippedPastSlots++;
      continue;
    }

    // Find first eligible recipient for this slot (now sorted by priority)
    for (let i = 0; i < sortedRecipients.length; i++) {
      const r = sortedRecipients[i];
      
      if (!isRecipientEligible(r, slotUtc, settings)) {
        continue;
      }

      // Assign this recipient to this slot
      await fillSlot(slot.id, r.id);
      
      const tier = getPriorityTier(r);
      console.log(`[Matrix2 Assigner] ✅ Assigned Tier ${tier} recipient ${r.email} to slot ${slot.id} at ${slotUtc.toISOString()}`);
      
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

  if (skippedPastSlots > 0) {
    console.log(`[Matrix2 Assigner] Skipped ${skippedPastSlots} past slots (current time: ${now.toISOString()})`);
  }
  console.log(`[Matrix2 Assigner] ✅ Assigned ${assignedCount} recipients to slots`);
}

function isRecipientEligible(recipient: any, slotUtc: Date, settings: any): boolean {
  const recipientState = recipient.state || '';
  const recipientTimezone = recipient.timezone;
  
  if (!recipientTimezone) {
    return false; // No timezone - skip silently (common case)
  }

  // Validate timezone is valid IANA
  try {
    Intl.DateTimeFormat(undefined, { timeZone: recipientTimezone });
  } catch (error) {
    console.log(`[Matrix2 Assigner] ❌ Invalid timezone "${recipientTimezone}" for ${recipient.email}`);
    return false;
  }

  // Convert slot UTC time to recipient's local time
  const localTime = toZonedTime(slotUtc, recipientTimezone);
  const dayOfWeek = localTime.getDay();

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
      console.log(`[Matrix2 Assigner] ⏳ Step delay not met for ${recipient.email}: next eligible ${earliestNext.toISOString()}`);
      return false;
    }
  }

  return true;
}
