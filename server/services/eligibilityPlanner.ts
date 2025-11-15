import { parseBusinessHours } from './timezoneHours';
import { formatInTimeZone, toZonedTime, fromZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { addHours, differenceInMinutes, addMinutes } from 'date-fns';

interface Candidate {
  id: string;
  recipientId: string;
  stepNumber: number;
  eligibleAt: Date | string;
  timezone: string | null;
  businessHours: string | null;
}

interface EligibilityWindow {
  startUtc: Date;
  endUtc: Date;
  timezone: string;
}

interface TimezonePlan {
  timezone: string;
  quota: number;
  candidates: Candidate[];
  windowOverlap: {
    startUtc: Date;
    endUtc: Date;
    overlapMinutes: number;
  };
}

interface PlannerOptions {
  candidates: Candidate[];
  adminTimezone: string;
  adminWindowStart: Date; // UTC
  adminWindowEnd: Date; // UTC
  clientWindowStartOffset: number; // hours after business opens
  clientWindowEndHour: number; // local cutoff hour (e.g., 16 for 4 PM)
  batchSize: number; // How many emails to schedule
}

interface PlannerResult {
  balancedCandidates: Candidate[];
  timezonePlans: TimezonePlan[];
  totalEligible: number;
  totalSchedulable: number;
}

/**
 * Calculate when a timezone becomes eligible within the admin window
 * Returns the overlap window between admin hours and client business hours
 */
function calculateTimezoneEligibility(
  timezone: string,
  businessHours: string,
  adminWindowStart: Date,
  adminWindowEnd: Date,
  clientWindowStartOffset: number,
  clientWindowEndHour: number
): EligibilityWindow | null {
  const parsed = parseBusinessHours(businessHours, 'CA'); // State doesn't matter for parsing
  
  // For 24/7 businesses or closed businesses, they can receive anytime during admin window
  if (parsed.is24_7 || parsed.isClosed) {
    return {
      startUtc: adminWindowStart,
      endUtc: adminWindowEnd,
      timezone,
    };
  }
  
  // Find typical opening hour (use Monday as reference)
  const mondaySchedule = parsed.schedule[1]; // Monday
  if (!mondaySchedule || mondaySchedule.length === 0) {
    // Fallback: assume 9 AM opening
    return calculateOverlap(timezone, 9, clientWindowStartOffset, clientWindowEndHour, adminWindowStart, adminWindowEnd);
  }
  
  const openMinutes = mondaySchedule[0].open;
  const openHour = Math.floor(openMinutes / 60);
  
  return calculateOverlap(timezone, openHour, clientWindowStartOffset, clientWindowEndHour, adminWindowStart, adminWindowEnd);
}

/**
 * Calculate overlap between admin window and client business window
 */
function calculateOverlap(
  timezone: string,
  businessOpenHour: number,
  clientWindowStartOffset: number,
  clientWindowEndHour: number,
  adminWindowStart: Date,
  adminWindowEnd: Date
): EligibilityWindow | null {
  // Client can receive emails from (open + offset) to cutoff hour
  const clientStartHour = businessOpenHour + clientWindowStartOffset;
  const clientEndHour = clientWindowEndHour;
  
  // If client window is invalid (start >= end), no overlap
  if (clientStartHour >= clientEndHour) {
    return null;
  }
  
  // Get local date for recipient timezone (use admin window start as reference)
  const localDateStr = formatInTimeZone(adminWindowStart, timezone, 'yyyy-MM-dd');
  const localMidnightIso = `${localDateStr}T00:00:00`;
  const localMidnightUtc = zonedTimeToUtc(localMidnightIso, timezone);
  
  // Convert admin window to minutes from local midnight in recipient timezone
  const adminStartLocal = formatInTimeZone(adminWindowStart, timezone, 'HH:mm');
  const adminEndLocal = formatInTimeZone(adminWindowEnd, timezone, 'HH:mm');
  const [adminStartHour, adminStartMin] = adminStartLocal.split(':').map(Number);
  const [adminEndHour, adminEndMin] = adminEndLocal.split(':').map(Number);
  
  let adminStartMinutes = adminStartHour * 60 + adminStartMin;
  let adminEndMinutes = adminEndHour * 60 + adminEndMin;
  
  // Handle day wrap (if admin end is before start, add 24 hours)
  if (adminEndMinutes < adminStartMinutes) {
    adminEndMinutes += 24 * 60;
  }
  
  // Client window in minutes from midnight
  const clientStartMinutes = clientStartHour * 60;
  const clientEndMinutes = clientEndHour * 60;
  
  // Find overlap in minutes
  const overlapStartMinutes = Math.max(adminStartMinutes, clientStartMinutes);
  const overlapEndMinutes = Math.min(adminEndMinutes, clientEndMinutes);
  
  if (overlapStartMinutes >= overlapEndMinutes) {
    return null; // No overlap
  }
  
  // Convert overlap minutes back to UTC by adding to local midnight
  const overlapStartUtc = addMinutes(localMidnightUtc, overlapStartMinutes);
  const overlapEndUtc = addMinutes(localMidnightUtc, overlapEndMinutes);
  
  return {
    startUtc: overlapStartUtc,
    endUtc: overlapEndUtc,
    timezone,
  };
}

/**
 * Eligibility Planner: Groups candidates by timezone, calculates eligibility windows,
 * and assigns quotas to ensure fair distribution and quota maximization.
 */
export function planEligibleSchedule(options: PlannerOptions): PlannerResult {
  const {
    candidates,
    adminTimezone,
    adminWindowStart,
    adminWindowEnd,
    clientWindowStartOffset,
    clientWindowEndHour,
    batchSize,
  } = options;
  
  // Group candidates by timezone
  const byTimezone = new Map<string, Candidate[]>();
  
  for (const candidate of candidates) {
    const tz = candidate.timezone || 'America/New_York';
    if (!byTimezone.has(tz)) {
      byTimezone.set(tz, []);
    }
    byTimezone.get(tz)!.push(candidate);
  }
  
  // Calculate eligibility windows for each timezone
  const timezonePlans: TimezonePlan[] = [];
  
  for (const [timezone, tzCandidates] of byTimezone.entries()) {
    // Use first candidate's business hours as representative
    const businessHours = tzCandidates[0].businessHours || 'Daily 9am–5pm';
    
    const window = calculateTimezoneEligibility(
      timezone,
      businessHours,
      adminWindowStart,
      adminWindowEnd,
      clientWindowStartOffset,
      clientWindowEndHour
    );
    
    if (!window) {
      continue; // No overlap, skip this timezone
    }
    
    const overlapMinutes = differenceInMinutes(window.endUtc, window.startUtc);
    
    timezonePlans.push({
      timezone,
      quota: 0, // Will assign below
      candidates: tzCandidates,
      windowOverlap: {
        startUtc: window.startUtc,
        endUtc: window.endUtc,
        overlapMinutes,
      },
    });
  }
  
  // Sort timezone plans by window start time (earliest eligible first)
  timezonePlans.sort((a, b) => 
    a.windowOverlap.startUtc.getTime() - b.windowOverlap.startUtc.getTime()
  );
  
  // Assign quotas using weighted distribution
  // Weight = (overlap minutes) * (candidate count)
  const totalWeight = timezonePlans.reduce((sum, plan) => {
    const weight = Math.min(plan.windowOverlap.overlapMinutes, 240) * Math.min(plan.candidates.length, 100);
    return sum + weight;
  }, 0);
  
  let remainingQuota = batchSize;
  
  for (let i = 0; i < timezonePlans.length; i++) {
    const plan = timezonePlans[i];
    const weight = Math.min(plan.windowOverlap.overlapMinutes, 240) * Math.min(plan.candidates.length, 100);
    
    // Last timezone gets all remaining quota
    if (i === timezonePlans.length - 1) {
      plan.quota = Math.min(remainingQuota, plan.candidates.length);
    } else {
      // Proportional allocation
      const proportionalQuota = Math.round((weight / totalWeight) * batchSize);
      plan.quota = Math.min(proportionalQuota, plan.candidates.length, remainingQuota);
    }
    
    remainingQuota -= plan.quota;
  }
  
  // Build balanced candidate list using round-robin from each timezone pool
  const balancedCandidates: Candidate[] = [];
  
  // Create pools for each timezone
  const pools = timezonePlans.map(plan => ({
    candidates: [...plan.candidates],
    quota: plan.quota,
    taken: 0,
  }));
  
  // Round-robin selection
  let poolIndex = 0;
  while (balancedCandidates.length < batchSize && pools.some(p => p.taken < p.quota)) {
    const pool = pools[poolIndex];
    
    if (pool.taken < pool.quota && pool.candidates.length > 0) {
      balancedCandidates.push(pool.candidates.shift()!);
      pool.taken++;
    }
    
    poolIndex = (poolIndex + 1) % pools.length;
  }
  
  return {
    balancedCandidates,
    timezonePlans,
    totalEligible: candidates.length,
    totalSchedulable: balancedCandidates.length,
  };
}
