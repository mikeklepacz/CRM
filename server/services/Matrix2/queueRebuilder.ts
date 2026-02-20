// server/services/Matrix2/queueRebuilder.ts
import { storage } from "../../storage";
import { generateSlotsForDayAndAccount } from "./slotGenerator";
import { fillSlot, getEmptySlotsForAccount } from "./slotDb";
import { getInUseSenderAccountIds } from "./senderAccountScope";
import { assignRecipientsToSlots } from "./slotAssigner";
import { resolveTenantTimezone } from "../tenantTimezone";
import { isRecipientEligibleForRebuildSlot } from "./rebuildEligibility";
import { getNextEligibleDateIsos } from "./eligibleDays";

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
  const tenantId = await storage.getAdminTenantId();
  if (!tenantId) {
    return;
  }

  // 1. Get tenant scheduling timezone
  const adminTz = await resolveTenantTimezone(tenantId, { adminUserId });
  
  const settings = await storage.getEhubSettings(tenantId);
  if (!settings) {
    return;
  }
  
  // Phase 1-3: Support both duration and end hour for backward compatibility
  const sendingHoursDuration = settings.sendingHoursDuration || 
    (settings.sendingHoursEnd === settings.sendingHoursStart ? 24 : 
     ((settings.sendingHoursEnd! - settings.sendingHoursStart + 24) % 24));
  // For COMPLETE rebuild, delete ALL slots and start fresh from today
  const now = new Date();
  
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
      s.status as sequence_status,
      s.sender_email_account_id
    FROM sequence_recipients sr
    LEFT JOIN sequences s ON sr.sequence_id = s.id
    WHERE sr.status = 'in_sequence'
      AND s.status = 'active'
      AND s.sender_email_account_id IS NOT NULL
    ORDER BY 
      sr.id ASC
  `);
  
  const allRecipients = (recipientResult as any).rows || [];
  
  // 4. DELETE ALL SLOTS (NUKE THE ENTIRE QUEUE)
  await db.execute(sql`DELETE FROM daily_send_slots`);
  
  // 5. Get all active email accounts
  const emailAccounts = await storage.getActiveEmailAccounts(tenantId);
  if (!emailAccounts || emailAccounts.length === 0) {
    return; // No email accounts to generate slots for
  }
  const inUseSenderAccountIds = await getInUseSenderAccountIds(tenantId);
  if (inUseSenderAccountIds.size === 0) {
    return;
  }
  const scopedEmailAccounts = emailAccounts.filter((account) => inUseSenderAccountIds.has(account.id));
  if (scopedEmailAccounts.length === 0) {
    return;
  }
  
  // 6. Regenerate fresh slots for next 3 eligible send days PER ACCOUNT
  const eligibleDateIsos = await getNextEligibleDateIsos(now, 3, adminTz, {
    excludedDays: settings.excludedDays || [],
    tenantId,
    maxLookaheadDays: 45,
  });
  for (const targetDateIso of eligibleDateIsos) {
    // Generate slots for each email account
    for (const account of scopedEmailAccounts) {
      await generateSlotsForDayAndAccount(targetDateIso, adminTz, tenantId, account.id, {
        dailyEmailLimit: settings.dailyEmailLimit,
        sendingHoursStart: settings.sendingHoursStart,
        sendingHoursDuration: sendingHoursDuration,
        minDelayMinutes: settings.minDelayMinutes,
        maxDelayMinutes: settings.maxDelayMinutes,
      });
    }
  }
  
  // 7. Reassign recipients to the new slots
  // All recipients fetched are from ACTIVE sequences with assigned email accounts
  const orderedRecipients = allRecipients;
  
  let assignedCount = 0;
  let skippedCount = 0;
  
  for (const recipient of orderedRecipients) {
    // Skip if no email account assigned (shouldn't happen but safety check)
    if (!recipient.sender_email_account_id) {
      skippedCount++;
      continue;
    }
    
    // CRITICAL: DELETE any existing unsent slot assignments for this recipient before reassigning
    // This prevents the same recipient from being assigned to multiple slots
    await db.execute(sql`
      DELETE FROM daily_send_slots
      WHERE sent = FALSE
        AND recipient_id = ${recipient.id}
    `);
    
    // Provide default timezone if missing
    const recipientTz = recipient.timezone || adminTz;
    const recipientWithDefaults = { ...recipient, timezone: recipientTz };
    
    // Get the next available empty slot FOR THIS ACCOUNT across eligible send days
    let assigned = false;
    
    for (const targetDateIso of eligibleDateIsos) {
      // Only get slots for THIS recipient's email account
      const emptySlots = await getEmptySlotsForAccount(targetDateIso, recipient.sender_email_account_id);
      
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
        
        if (await isRecipientEligibleForRebuildSlot(recipientWithDefaults, slotUtc, settings)) {
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

  // Final immediate assignment pass to pick up any remaining eligible recipients
  // without waiting for the periodic queue cycle.
  try {
    await assignRecipientsToSlots();
  } catch {
    // Keep rebuild successful even if the final assignment pass fails.
  }
}
