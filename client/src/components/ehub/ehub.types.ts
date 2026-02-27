export interface Sequence {
  id: string;
  name: string;
  stepDelays: number[] | null;
  repeatLastStep: boolean;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  repliedCount: number;
  createdAt: string;
}

export interface EhubSettings {
  id?: string;
  minDelayMinutes: number;
  maxDelayMinutes: number;
  jitterPercentage: number;
  dailyEmailLimit: number;
  sendingHoursStart: number;
  sendingHoursDuration?: number;
  sendingHoursEnd?: number;
  clientWindowStartOffset: number;
  clientWindowEndHour: number;
  promptInjection: string;
  keywordBin: string;
  excludedDays: number[];
}

export interface Recipient {
  id: string;
  email: string;
  name: string;
  link: string;
  salesSummary: string;
  businessHours: string;
  timezone: string;
  status: string;
  contactedStatus: "contacted" | "not contacted" | "unknown";
  trackerStatus: string | null;
}

export interface TestEmailSend {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  gmailThreadId: string | null;
  sentAt: string | null;
  replyDetectedAt: string | null;
  followUpCount: number;
  createdAt: string;
}

export interface EmailAccount {
  id: string;
  email: string;
  status: string;
  dailySendCount: number;
  lastSendCountReset: string | null;
  connectedAt: string | null;
  lastUsedAt: string | null;
  errorMessage: string | null;
}

/**
 * Calculate optimal min/max delay suggestions for human-like email spacing
 * Based on pure company sending window duration (not client timezone overlap)
 * Spacing = (duration × 60) ÷ dailyLimit
 * Jitter = configurable percentage of spacing (default ±50%)
 */
export function calculateOptimalDelays(
  companyStartHour: number,
  companyDurationHours: number,
  dailyEmailLimit: number,
  jitterPercentage: number = 50
): { minDelayMinutes: number; maxDelayMinutes: number } {
  void companyStartHour;

  // Calculate pure company sending window directly from duration
  // No midnight crossover logic needed - duration is the window size
  const companyWindowMinutes = (companyDurationHours || 5) * 60;

  // Calculate average spacing needed for daily limit
  const averageSpacingMinutes = dailyEmailLimit > 0 ? companyWindowMinutes / dailyEmailLimit : 5;

  // Convert jitter percentage to multipliers (e.g., 50% = 0.5 to 1.5, 30% = 0.7 to 1.3)
  const jitterDecimal = jitterPercentage / 100;
  const minMultiplier = 1 - jitterDecimal;
  const maxMultiplier = 1 + jitterDecimal;

  // Apply jitter variance to create min/max range
  const minDelay = Math.max(1, Math.floor(averageSpacingMinutes * minMultiplier));
  const maxDelay = Math.ceil(averageSpacingMinutes * maxMultiplier);

  return {
    minDelayMinutes: minDelay,
    maxDelayMinutes: maxDelay,
  };
}
