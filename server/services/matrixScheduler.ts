// server/services/matrixScheduler.ts

import { storage } from '../storage';
import { addDays } from 'date-fns';

interface MatrixSchedulerParams {
  recipientId: string;
  sequenceId: string;
  stepNumber: number;
  stepDelay: number;
  lastStepSentAt: Date | null;
  recipientTimezone: string;
  recipientBusinessHours: string;
  userId: string;
}

export async function getNextMatrixSlot(
  params: MatrixSchedulerParams
): Promise<Date> {
  const { stepDelay, lastStepSentAt, userId } = params;

  const settings = await storage.getEhubSettings();
  if (!settings) {
    throw new Error('E-Hub settings not found');
  }

  const userPrefs = await storage.getUserPreferences(userId);
  const adminTimezone = userPrefs?.timezone || 'America/New_York';

  let baseline = lastStepSentAt
    ? addDays(lastStepSentAt, stepDelay)
    : addDays(new Date(), stepDelay);

  if (baseline < new Date()) {
    baseline = new Date();
  }

  return baseline;
}