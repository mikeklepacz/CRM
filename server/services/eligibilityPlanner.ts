// eligibilityPlanner.ts
// Purpose: pick a balanced set of candidates across timezones.
// NO time/window/UTC logic here. That all lives in computeNextSendSlot.

interface Candidate {
  id: string;
  recipientId: string;
  stepNumber: number;
  eligibleAt: Date | string;
  timezone: string | null;
  businessHours: string | null;
}

interface TimezonePlan {
  timezone: string;
  quota: number;
  candidates: Candidate[];
}

interface PlannerOptions {
  candidates: Candidate[];
  batchSize: number;
}

interface PlannerResult {
  balancedCandidates: Candidate[];
  timezonePlans: TimezonePlan[];
  totalEligible: number;
  totalSchedulable: number;
}

/**
 * Eligibility Planner:
 * - Groups candidates by timezone
 * - Assigns quotas in proportion to candidate counts
 * - Uses round-robin to interleave timezones
 * 
 * NO date, UTC, or window math. This only decides WHO, not WHEN.
 */
export function planEligibleSchedule(options: PlannerOptions): PlannerResult {
  const { candidates, batchSize } = options;
  if (candidates.length === 0 || batchSize <= 0) {
    return {
      balancedCandidates: [],
      timezonePlans: [],
      totalEligible: candidates.length,
      totalSchedulable: 0,
    };
  }

  // Group by timezone
  const byTimezone = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    const tz = candidate.timezone || 'America/New_York';
    if (!byTimezone.has(tz)) {
      byTimezone.set(tz, []);
    }
    byTimezone.get(tz)!.push(candidate);
  }

  const timezonePlans: TimezonePlan[] = Array.from(byTimezone.entries()).map(
    ([timezone, tzCandidates]) => ({
      timezone,
      quota: 0,
      candidates: [...tzCandidates], // copy so we can shift()
    }),
  );

  const totalEligible = candidates.length;
  let remaining = Math.min(batchSize, totalEligible);

  // Assign quotas proportional to candidate count
  for (let i = 0; i < timezonePlans.length; i++) {
    const plan = timezonePlans[i];

    if (i === timezonePlans.length - 1) {
      // Last timezone gets the remaining quota
      plan.quota = Math.min(remaining, plan.candidates.length);
    } else {
      const proportion = plan.candidates.length / totalEligible;
      const proposed = Math.round(proportion * batchSize);
      plan.quota = Math.min(proposed, plan.candidates.length, remaining);
      remaining -= plan.quota;
    }
  }

  // Round-robin pick from each timezone until quotas are used or batch filled
  const balancedCandidates: Candidate[] = [];
  let idx = 0;

  while (
    balancedCandidates.length < batchSize &&
    timezonePlans.some(p => p.quota > 0)
  ) {
    const plan = timezonePlans[idx];

    if (plan.quota > 0 && plan.candidates.length > 0) {
      balancedCandidates.push(plan.candidates.shift()!);
      plan.quota--;
    }

    idx = (idx + 1) % timezonePlans.length;
  }

  return {
    balancedCandidates,
    timezonePlans,
    totalEligible,
    totalSchedulable: balancedCandidates.length,
  };
}
