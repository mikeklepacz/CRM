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
 * Calculate optimal min/max delay suggestions for human-like email spacing
 * 
 * Finds the overlap between company sending hours and typical client receiving hours,
 * then calculates natural-looking delay ranges based on daily email limit.
 * 
 * @param companyStartHour - Company sending window start (24h format)
 * @param companyEndHour - Company sending window end (24h format)
 * @param clientWindowStartOffset - Hours after business opens (e.g., 1.0)
 * @param clientWindowEndHour - Client cutoff hour local time (24h format)
 * @param dailyEmailLimit - Max emails per day
 * @returns Suggested min/max delays in minutes with ±50% variance around average
 */
export function calculateOptimalDelays(
  companyStartHour: number,
  companyEndHour: number,
  clientWindowStartOffset: number,
  clientWindowEndHour: number,
  dailyEmailLimit: number
): { minDelayMinutes: number; maxDelayMinutes: number } {
  // Calculate effective sending window (overlap between company and typical client hours)
  // Typical client business: 9 AM - client cutoff
  const typicalClientStart = 9 + clientWindowStartOffset; // e.g., 9 + 1 = 10 AM
  const typicalClientEnd = clientWindowEndHour; // e.g., 20 (8 PM)
  
  // Find overlap
  const effectiveStart = Math.max(companyStartHour, typicalClientStart);
  const effectiveEnd = Math.min(companyEndHour, typicalClientEnd);
  const effectiveWindowHours = Math.max(1, effectiveEnd - effectiveStart);
  
  // Calculate average spacing needed for daily limit
  const effectiveWindowMinutes = effectiveWindowHours * 60;
  const averageSpacingMinutes = dailyEmailLimit > 0 
    ? effectiveWindowMinutes / dailyEmailLimit 
    : 5;
  
  // Suggest range with ±50% variance for natural randomness
  const minDelay = Math.max(1, Math.floor(averageSpacingMinutes * 0.5));
  const maxDelay = Math.ceil(averageSpacingMinutes * 1.5);
  
  return {
    minDelayMinutes: minDelay,
    maxDelayMinutes: maxDelay
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
