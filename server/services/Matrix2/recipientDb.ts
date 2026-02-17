// server/services/Matrix2/recipientDb.ts
import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Step delay semantics:
 * - current_step = 0 means no email has been sent yet (Step 1 is next)
 * - delay[0] applies AFTER Step 1 is sent (before Step 2)
 * - delay[1] applies AFTER Step 2 is sent (before Step 3), etc.
 */
function getDelayForCurrentProgress(stepDelays: any[], currentStep: number): number {
  if (!Array.isArray(stepDelays) || stepDelays.length === 0) return 0;
  if (currentStep <= 0) return 0;

  const delayIndex = currentStep - 1;
  const raw = stepDelays[delayIndex];
  return raw !== undefined && raw !== null ? parseFloat(raw) || 0 : 0;
}

/**
 * Get all recipients that are eligible for slot assignment
 * 
 * Eligibility criteria:
 * - status = 'in_sequence' (actively receiving emails)
 * - has timezone (required for scheduling)
 * - has business_hours (required for eligibility checking)
 */
export async function getEligibleRecipientsForAssignment() {
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
      (SELECT array_agg(ss.delay_days ORDER BY ss.step_number) 
       FROM sequence_steps ss 
       WHERE ss.sequence_id = s.id) as step_delays,
      s.status as sequence_status,
      s.is_system,
      s.sender_email_account_id
    FROM sequence_recipients sr
    INNER JOIN sequences s ON sr.sequence_id = s.id
    LEFT JOIN daily_send_slots dss ON sr.id = dss.recipient_id::varchar 
      AND dss.filled = TRUE 
      AND dss.sent = FALSE
    WHERE sr.status = 'in_sequence'
      AND sr.timezone IS NOT NULL
      AND sr.timezone != ''
      AND sr.business_hours IS NOT NULL
      AND sr.business_hours != ''
      AND s.sender_email_account_id IS NOT NULL
      AND dss.id IS NULL
    ORDER BY sr.created_at ASC
  `);
  
  const rows = (result as any).rows || [];
  
  // Calculate step_delay for each recipient
  return rows.map((r: any) => {
    const stepDelays = r.step_delays || [];
    const currentStep = r.current_step || 0;
    const stepDelay = getDelayForCurrentProgress(stepDelays, currentStep);
    
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
      (SELECT array_agg(ss.delay_days ORDER BY ss.step_number) 
       FROM sequence_steps ss 
       WHERE ss.sequence_id = s.id) as step_delays,
      s.status as sequence_status
    FROM sequence_recipients sr
    INNER JOIN daily_send_slots dss ON sr.id = dss.recipient_id::varchar
    INNER JOIN sequences s ON sr.sequence_id = s.id
    WHERE dss.slot_date >= ${dateIso}
      AND dss.filled = TRUE
      AND dss.sent = FALSE
    ORDER BY dss.slot_time_utc ASC
  `);
  
  const rows = (result as any).rows || [];
  
  // Calculate step_delay for each recipient
  return rows.map((r: any) => {
    const stepDelays = r.step_delays || [];
    const currentStep = r.current_step || 0;
    const stepDelay = getDelayForCurrentProgress(stepDelays, currentStep);
    
    return {
      ...r,
      step_delay: stepDelay,
    };
  });
}
