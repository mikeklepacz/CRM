import { db } from "../db";

export async function getRecipientByIdStorage(recipientId: string): Promise<any | null> {
  try {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT
        sr.id,
        sr.email,
        sr.name,
        sr.link,
        sr.sales_summary as "salesSummary",
        sr.sequence_id as "sequenceId",
        sr.current_step as "currentStep",
        sr.timezone,
        sr.business_hours,
        sr.state,
        sr.status,
        sr.last_step_sent_at as "lastStepSentAt",
        s.id as "seqId",
        s.step_delays as "stepDelays"
      FROM sequence_recipients sr
      LEFT JOIN sequences s ON sr.sequence_id = s.id
      WHERE sr.id = ${recipientId}
      LIMIT 1
    `);
    return (result as any).rows?.[0] || null;
  } catch (error) {
    console.error(`[Storage] Error fetching recipient ${recipientId}:`, error);
    return null;
  }
}

export async function getSequenceByIdStorage(sequenceId: string): Promise<any | null> {
  try {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT
        id,
        name,
        tenant_id as "tenantId",
        created_by as "createdBy",
        sender_email_account_id as "senderEmailAccountId",
        strategy_transcript as "strategyTranscript",
        finalized_strategy as "finalizedStrategy",
        step_delays as "stepDelays",
        repeat_last_step as "repeatLastStep",
        status
      FROM sequences
      WHERE id = ${sequenceId}
      LIMIT 1
    `);
    return (result as any).rows?.[0] || null;
  } catch (error) {
    console.error(`[Storage] Error fetching sequence ${sequenceId}:`, error);
    return null;
  }
}

export async function getAdminUserStorage(): Promise<any | null> {
  try {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName"
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    `);
    const adminUser = (result as any).rows?.[0] || null;
    return adminUser;
  } catch (error) {
    console.error(`[Storage] Error fetching admin user:`, error);
    return null;
  }
}

export async function getAdminTenantIdStorage(): Promise<string | null> {
  try {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT ut.tenant_id as "tenantId"
      FROM users u
      JOIN user_tenants ut ON u.id = ut.user_id
      WHERE u.role = 'admin'
        AND ut.is_default = TRUE
      ORDER BY u.created_at ASC
      LIMIT 1
    `);
    return (result as any).rows?.[0]?.tenantId || null;
  } catch (error) {
    console.error(`[Storage] Error fetching admin tenant:`, error);
    return null;
  }
}

export async function updateRecipientStorage(recipientId: string, updates: any): Promise<any> {
  try {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      UPDATE sequence_recipients
      SET
        current_step = ${updates.currentStep || sql`current_step`},
        last_step_sent_at = ${updates.lastStepSentAt || sql`last_step_sent_at`},
        status = ${updates.status || sql`status`},
        thread_id = ${updates.threadId || sql`thread_id`},
        updated_at = NOW()
      WHERE id = ${recipientId}
      RETURNING *
    `);
    return (result as any).rows?.[0] || null;
  } catch (error) {
    console.error(`[Storage] Error updating recipient ${recipientId}:`, error);
    return null;
  }
}

export async function insertRecipientMessageStorage(message: any): Promise<any> {
  try {
    const { sql } = await import('drizzle-orm');
    const messageIdToStore = message.rfc822MessageId || message.gmailMessageId || null;
    const result = await db.execute(sql`
      INSERT INTO sequence_recipient_messages (
        id,
        tenant_id,
        recipient_id,
        step_number,
        subject,
        body,
        sent_at,
        message_id,
        thread_id
      )
      VALUES (
        ${message.id},
        ${message.tenantId},
        ${message.recipientId},
        ${message.stepNumber},
        ${message.subject || ''},
        ${message.body || ''},
        ${message.sentAt || sql`NOW()`},
        ${messageIdToStore},
        ${message.gmailThreadId || null}
      )
      RETURNING *
    `);
    return (result as any).rows?.[0] || null;
  } catch (error) {
    console.error(`[Storage] Error inserting recipient message:`, error);
    return null;
  }
}
