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
import { getEmptySlots, fillSlot } from "./slotDb";
import { getEligibleRecipientsForAssignment } from "./recipientDb";
import { storage } from "../../storage";
import { eventGateway } from "../events/gateway";
import { getPriorityTier, isRecipientEligible } from "./slotEligibility";

/**
 * Immediately assign a specific recipient to the next available slot
 * Called when a recipient is enrolled to avoid waiting for the 60s queue cycle
 */
export async function assignSingleRecipient(recipientId: string) {
  const tenantId = await storage.getAdminTenantId();
  if (!tenantId) {
    return;
  }
  
  const settings = await storage.getEhubSettings(tenantId);
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
  const recipient = recipients.find((r: any) => r.id === recipientId);
  
  if (!recipient) {
    return;
  }

  // Try to assign to first available slot that matches this recipient's email account
  const now = new Date();
  for (const slot of slots) {
    const slotUtc = new Date(slot.slot_time_utc);

    // CRITICAL: Don't assign slots in the past (prevents flash-disappear on pause/resume)
    if (slotUtc < now) {
      continue;
    }

    // Check email account match - slot must belong to the same email account as the sequence
    if (slot.email_account_id && recipient.sender_email_account_id !== slot.email_account_id) {
      continue; // Skip - this slot belongs to a different email account
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


export async function assignRecipientsToSlots() {
  const tenantId = await storage.getAdminTenantId();
  if (!tenantId) {
    return;
  }
  
  const settings = await storage.getEhubSettings(tenantId);
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
  const sortedRecipients = recipients.sort((a: any, b: any) => {
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
    // CRITICAL: Only assign if recipient's sequence email account matches slot's email account
    for (let i = 0; i < sortedRecipients.length; i++) {
      const r = sortedRecipients[i];
      
      // Check email account match - slot must belong to the same email account as the sequence
      if (slot.email_account_id && r.sender_email_account_id !== slot.email_account_id) {
        continue; // Skip - this slot belongs to a different email account
      }
      
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
