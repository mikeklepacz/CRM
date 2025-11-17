// server/services/matrix2/recipientDb.ts

import { storage } from '../../storage';

/**
 * Get all recipients that are eligible for slot assignment
 * Returns recipients that need their next step sent
 */
export async function getEligibleRecipientsForAssignment() {
  // Get all recipients with status 'in_sequence' or 'pending' that need scheduling
  // For now, return empty array since Matrix2 assignment is being integrated
  // TODO: Implement proper recipient eligibility logic
  return [];
}

/**
 * Mark a recipient as scheduled with a specific send time
 */
export async function markRecipientScheduled(recipientId: string, scheduledTime: Date) {
  // Update recipient's nextSendAt to the scheduled slot time
  await storage.updateRecipientStatus(recipientId, {
    nextSendAt: scheduledTime,
  });
}
