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
      s.status as sequence_status,
      s.is_system
    FROM sequence_recipients sr
    INNER JOIN sequences s ON sr.sequence_id = s.id
    WHERE sr.status = 'in_sequence'
      AND sr.timezone IS NOT NULL
      AND sr.timezone != ''
      AND sr.business_hours IS NOT NULL
      AND sr.business_hours != ''
    ORDER BY sr.created_at ASC
  `);
  
  const rows = (result as any).rows || [];
  
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

/**
 * Get recipients that are currently scheduled in slots from a specific date onward
 * Returns them in chronological order (by their slot time)
 */
export async function getScheduledRecipientsFromDate(dateIso: string) {
  console.log('[RecipientDb.getScheduledRecipientsFromDate] Fetching recipients from:', dateIso);
  
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
      dss.slot_time_utc,
      s.step_delays,
      s.status as sequence_status
    FROM sequence_recipients sr
    INNER JOIN daily_send_slots dss ON dss.recipient_id::varchar = sr.id
    INNER JOIN sequences s ON sr.sequence_id = s.id
    WHERE dss.slot_date >= ${dateIso}
      AND dss.filled = TRUE
      AND dss.sent = FALSE
    ORDER BY dss.slot_time_utc ASC
  `);
  
  const rows = (result as any).rows || [];
  
  console.log('[RecipientDb.getScheduledRecipientsFromDate] Found:', {
    count: rows.length,
    fromDate: dateIso,
    sample: rows.slice(0, 3).map((r: any) => ({
      email: r.email,
      slot_time_utc: r.slot_time_utc
    }))
  });
  
  // Calculate step_delay for each recipient
  return rows.map((r: any) => {
    const stepDelays = r.step_delays || [];
    const currentStep = r.current_step || 0;
    const nextStepIndex = currentStep;
    const stepDelay = stepDelays[nextStepIndex] ? parseFloat(stepDelays[nextStepIndex]) : 0;
    
    return {
      ...r,
      step_delay: stepDelay,
    };
  });
}
