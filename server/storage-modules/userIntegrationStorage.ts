import {
  userIntegrations,
  users,
  type InsertUserIntegration,
  type UserIntegration,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, isNotNull } from "drizzle-orm";

export async function getUserIntegrationStorage(userId: string): Promise<UserIntegration | undefined> {
  const [integration] = await db.select().from(userIntegrations).where(eq(userIntegrations.userId, userId));
  return integration;
}

export async function getAllUserIntegrationsStorage(): Promise<UserIntegration[]> {
  const results = await db
    .select({
      integration: userIntegrations,
      user: users,
    })
    .from(userIntegrations)
    .innerJoin(users, eq(userIntegrations.userId, users.id))
    .where(eq(users.isActive, true));

  return results.map((r) => r.integration);
}

export async function getUserIntegrationsWithGmailByTenantStorage(tenantId: string): Promise<UserIntegration[]> {
  const results = await db
    .select({
      integration: userIntegrations,
      user: users,
    })
    .from(userIntegrations)
    .innerJoin(users, eq(userIntegrations.userId, users.id))
    .where(
      and(
        eq(userIntegrations.tenantId, tenantId),
        eq(users.isActive, true),
        isNotNull(userIntegrations.googleCalendarEmail),
        isNotNull(userIntegrations.googleCalendarAccessToken)
      )
    );

  return results.map((r) => r.integration);
}

export async function updateUserIntegrationStorage(
  userId: string,
  updates: Partial<InsertUserIntegration>,
  tenantId?: string
): Promise<UserIntegration> {
  const existing = await getUserIntegrationStorage(userId);

  if (existing) {
    const [updated] = await db
      .update(userIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userIntegrations.userId, userId))
      .returning();
    return updated;
  } else {
    if (!tenantId) {
      throw new Error("tenantId is required when creating a new user integration record");
    }
    const [created] = await db
      .insert(userIntegrations)
      .values({ userId, tenantId, ...updates })
      .returning();
    return created;
  }
}
