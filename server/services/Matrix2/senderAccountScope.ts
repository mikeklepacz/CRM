import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Return sender email account IDs that are actually in use by ACTIVE sequences
 * for the tenant. Slots should only be generated for this set.
 */
export async function getInUseSenderAccountIds(tenantId: string): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT DISTINCT s.sender_email_account_id AS email_account_id
    FROM sequences s
    JOIN email_accounts ea ON ea.id = s.sender_email_account_id
    WHERE s.tenant_id = ${tenantId}
      AND s.status = 'active'
      AND s.sender_email_account_id IS NOT NULL
      AND ea.tenant_id = ${tenantId}
      AND ea.status = 'active'
  `);

  const rows = (result as any).rows || [];
  return new Set(
    rows
      .map((row: any) => row.email_account_id)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
  );
}
