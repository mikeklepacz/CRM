import { computeNextSendSlot } from './smartTiming';
import { addDays } from 'date-fns';

export interface AdminWindow {
  timezone: string;
  startHour: number;
  endHour: number;
  skipWeekends: boolean;
}

/**
 * Resolve admin sending window for a sequence
 * Fetches the sequence creator's timezone + ehub settings
 * 
 * @param sequenceId - The sequence ID
 * @param storage - Storage instance for database access
 * @returns Admin window configuration with timezone and hours
 */
export async function resolveAdminWindow(sequenceId: string, storage: any): Promise<AdminWindow> {
  // Fetch sequence to get creator
  const sequence = await storage.getSequence(sequenceId);
  if (!sequence) {
    throw new Error(`Sequence ${sequenceId} not found`);
  }

  // Fetch creator's preferences
  const creatorPrefs = await storage.getUserPreferences(sequence.createdBy);
  
  // Fetch E-Hub settings for sending hours
  const ehubSettings = await storage.getEhubSettings();

  // Resolve timezone with fallback
  let timezone = creatorPrefs?.timezone || 'America/New_York';
  if (!creatorPrefs?.timezone) {
    console.warn(`[EmailScheduling] No timezone set for user ${sequence.createdBy}, falling back to ${timezone}`);
  }

  return {
    timezone,
    startHour: ehubSettings?.sendingHoursStart ?? 6,
    endHour: ehubSettings?.sendingHoursEnd ?? 23,
    skipWeekends: ehubSettings?.skipWeekends ?? false,
  };
}

/**
 * Compute next send time using dual-window scheduling
 * Finds overlap between admin sending window and recipient receiving window
 * 
 * @param sequenceId - The sequence ID
 * @param recipientBusinessHours - Recipient's business hours string
 * @param recipientTimezone - Recipient's timezone (e.g., 'America/Detroit')
 * @param delayDays - Number of days to delay from now (e.g., stepDelays[0])
 * @param storage - Storage instance for database access
 * @returns UTC timestamp for next send
 */
export async function computeNextSendTimeForRecipient(
  sequenceId: string,
  recipientBusinessHours: string,
  recipientTimezone: string,
  delayDays: number,
  storage: any
): Promise<Date> {
  // Resolve admin window
  const adminWindow = await resolveAdminWindow(sequenceId, storage);

  // Calculate baseline time (now + delay)
  const baselineTime = addDays(new Date(), delayDays);

  // Use dual-window scheduler
  const nextSendAt = computeNextSendSlot({
    baselineTime,
    adminTimezone: adminWindow.timezone,
    adminStartHour: adminWindow.startHour,
    adminEndHour: adminWindow.endHour,
    recipientBusinessHours,
    recipientTimezone: recipientTimezone || 'America/New_York', // Fallback if not set
    skipWeekends: adminWindow.skipWeekends,
  });

  // Ensure nextSendAt is never in the past
  if (nextSendAt < baselineTime) {
    console.warn(`[EmailScheduling] nextSendAt (${nextSendAt.toISOString()}) is before baseline (${baselineTime.toISOString()}), using baseline`);
    return baselineTime;
  }

  return nextSendAt;
}
