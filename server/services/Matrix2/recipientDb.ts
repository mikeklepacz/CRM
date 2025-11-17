// server/services/Matrix2/recipientDb.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Get all recipients that are eligible for slot assignment
 * 
 * Eligibility criteria:
 * - status = 'in_sequence' (actively receiving emails)
 * - has timezone (required for scheduling)
 * - has business_hours (required for eligibility checking)
 */
export async function getEligibleRecipientsForAssignment() {
  console.log('[RecipientDb.getEligibleRecipientsForAssignment] Fetching eligible recipients...');
  
  const result = await db.execute(sql`
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
      s.step_delays,
      s.status as sequence_status
    FROM sequence_recipients sr
    INNER JOIN sequences s ON sr.sequence_id = s.id
    WHERE sr.status = 'in_sequence'
      AND sr.timezone IS NOT NULL
      AND sr.timezone != ''
      AND sr.business_hours IS NOT NULL
      AND sr.business_hours != ''
      AND s.status = 'active'
    ORDER BY sr.created_at ASC
  `);
  
  const rows = Array.isArray(result) ? result : [];
  
  console.log('[RecipientDb.getEligibleRecipientsForAssignment] Raw results:', {
    count: rows.length,
    sample: rows.slice(0, 3).map((r: any) => ({
      email: r.email,
      status: r.status,
      sequence_status: r.sequence_status,
      timezone: r.timezone,
      current_step: r.current_step
    }))
  });
  
  // Calculate step_delay for each recipient
  return rows.map((r: any) => {
    const stepDelays = r.step_delays || [];
    const currentStep = r.current_step || 0;
    const nextStepIndex = currentStep; // Next step is currentStep + 1, array is 0-indexed
    const stepDelay = stepDelays[nextStepIndex] ? parseFloat(stepDelays[nextStepIndex]) : 0;
    
    return {
      ...r,
      step_delay: stepDelay,
    };
  });
}

/**
 * Mark a recipient as scheduled (this is handled by slot assignment now)
 * This function is no longer needed with Matrix2, but kept for compatibility
 */
export async function markRecipientScheduled(recipientId: string, scheduledTime: Date) {
  // Matrix2 handles scheduling via slots, so this is a no-op
  // The slot assignment in slotDb.fillSlot() is sufficient
  return;
}
