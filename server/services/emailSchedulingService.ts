import { computeNextSendSlot } from './smartTiming';
import { addDays } from 'date-fns';

export interface AdminWindow {
  timezone: string;
  startHour: number;
  endHour: number;
  clientWindowStartOffset: number;
  clientWindowEndHour: number;
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
    clientWindowStartOffset: parseFloat(ehubSettings?.clientWindowStartOffset?.toString() ?? '1.0'),
    clientWindowEndHour: ehubSettings?.clientWindowEndHour ?? 14,
    skipWeekends: ehubSettings?.skipWeekends ?? false,
  };
}

/**
 * DEPRECATED: computeNextSendTimeForRecipient
 * 
 * This function has been replaced by the Queue Coordinator system.
 * New recipient enrollment now uses requestNextSlot() from queueCoordinator.ts
 * which ensures FIFO ordering and rate limit compliance.
 * 
 * Kept for reference only - remove after verifying no external dependencies.
 */
