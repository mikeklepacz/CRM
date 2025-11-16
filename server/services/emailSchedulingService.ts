
import { computeNextSendSlot } from './smartTiming';
import { addDays } from 'date-fns';
import { storage } from '../storage';

/**
 * NEW REAL-TIME SCHEDULING SERVICE
 * 
 * Replaces batch coordinator with immediate per-recipient scheduling.
 * Called at enrollment time to calculate scheduledAt instantly.
 */

export interface ScheduleRecipientParams {
  recipientId: string;
  sequenceId: string;
  stepNumber: number;
  stepDelay: number; // in days (e.g., 0.0035 for 5 minutes)
  lastStepSentAt: Date | null; // null for step 1
  recipientTimezone: string;
  recipientBusinessHours: string;
  userId: string; // Admin/agent who created sequence
}

/**
 * @deprecated REPLACED BY MATRIX SCHEDULER
 * 
 * This function is NO LONGER USED and has been replaced by matrixScheduler.getNextMatrixSlot().
 * All scheduling operations now go through the Matrix Scheduler for unified constraint enforcement.
 * 
 * DO NOT USE THIS FUNCTION - it will throw an error to prevent accidental usage.
 * 
 * @throws Error always - function is disabled
 */
export async function scheduleRecipient(params: ScheduleRecipientParams): Promise<Date> {
  throw new Error(
    'scheduleRecipient() is deprecated and disabled. ' +
    'Use matrixScheduler.getNextMatrixSlot() instead. ' +
    'All scheduling logic has been unified in the Matrix Scheduler.'
  );
}
