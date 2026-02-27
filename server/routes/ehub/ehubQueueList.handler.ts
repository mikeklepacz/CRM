import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { getNextEligibleDateIsos } from "../../services/Matrix2/eligibleDays";
import { resolveTenantTimezone } from "../../services/tenantTimezone";

export async function handleEhubQueueList(req: any, res: any): Promise<any> {
  try {
    const timeWindowDays = parseInt(req.query.timeWindowDays as string) || 3;
    const now = new Date();
    const settings = await storage.getEhubSettings(req.user.tenantId);
    const adminTz = await resolveTenantTimezone(req.user.tenantId, { adminUserId: req.user?.id });
    const eligibleDateIsos = await getNextEligibleDateIsos(now, timeWindowDays, adminTz, {
      excludedDays: settings?.excludedDays || [],
      tenantId: req.user.tenantId,
      maxLookaheadDays: 60,
    });

    if (eligibleDateIsos.length === 0) {
      return res.json([]);
    }

    const result = await db.execute(sql`
      SELECT 
        dss.id,
        dss.slot_time_utc,
        dss.slot_date,
        dss.filled,
        dss.sent,
        dss.recipient_id,
        dss.email_account_id,
        sr.email as recipient_email,
        sr.current_step,
        sr.sequence_id,
        s.name as sequence_name,
        ea.email as sender_email
      FROM daily_send_slots dss
      LEFT JOIN sequence_recipients sr ON sr.id = dss.recipient_id::varchar
      LEFT JOIN sequences s ON sr.sequence_id = s.id
      LEFT JOIN email_accounts ea ON dss.email_account_id = ea.id
      WHERE dss.tenant_id = ${req.user.tenantId}
        AND dss.slot_time_utc >= ${now.toISOString()}
      ORDER BY dss.slot_time_utc ASC
      LIMIT 500
    `);

    const rows = (result as any).rows || [];
    const eligibleDateSet = new Set(eligibleDateIsos);
    const filteredRows = rows.filter((row: any) => eligibleDateSet.has(String(row.slot_date)));

    res.json(filteredRows.map((row: any) => ({
      recipientId: row.recipient_id || "",
      recipientEmail: row.filled ? (row.recipient_email || "Unknown") : "(Open slot)",
      recipientName: row.filled ? (row.recipient_email || "Unknown") : "(Open slot)",
      sequenceId: row.sequence_id || "",
      sequenceName: row.sequence_name || "",
      stepNumber: row.current_step || 0,
      scheduledAt: row.slot_time_utc,
      sentAt: row.sent ? row.slot_time_utc : null,
      status: row.sent ? "sent" : (row.filled ? "scheduled" : "open"),
      subject: null,
      senderEmail: row.sender_email || "",
      emailAccountId: row.email_account_id || "",
    })));
  } catch (error: any) {
    console.error("Error fetching queue:", error);
    res.status(500).json({ message: error.message || "Failed to fetch queue" });
  }
}
