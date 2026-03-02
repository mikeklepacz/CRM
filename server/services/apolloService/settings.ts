import { db } from "../../db";
import { apolloSettings } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { ApolloSettings } from "../../../shared/schema";

export async function getOrCreateSettings(tenantId: string): Promise<ApolloSettings> {
  const existing = await db.select().from(apolloSettings).where(eq(apolloSettings.tenantId, tenantId)).limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db.insert(apolloSettings).values({ tenantId }).returning();
  return created;
}

export async function updateSettings(
  tenantId: string,
  updates: Partial<{
    targetTitles: string[];
    targetSeniorities: string[];
    maxContactsPerCompany: number;
    autoEnrichOnAdd: boolean;
  }>,
): Promise<ApolloSettings> {
  const [updated] = await db
    .update(apolloSettings)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(apolloSettings.tenantId, tenantId))
    .returning();

  return updated;
}
