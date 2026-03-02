import {
  systemIntegrations,
  type InsertSystemIntegration,
  type SystemIntegration,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function getSystemIntegrationStorage(provider: string): Promise<SystemIntegration | undefined> {
  const [integration] = await db.select().from(systemIntegrations).where(eq(systemIntegrations.provider, provider));
  return integration;
}

export async function updateSystemIntegrationStorage(
  provider: string,
  updates: Partial<InsertSystemIntegration>
): Promise<SystemIntegration> {
  const existing = await getSystemIntegrationStorage(provider);

  if (existing) {
    const [updated] = await db
      .update(systemIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systemIntegrations.provider, provider))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(systemIntegrations)
      .values({ provider, ...updates })
      .returning();
    return created;
  }
}

export async function deleteSystemIntegrationStorage(provider: string): Promise<void> {
  await db.delete(systemIntegrations).where(eq(systemIntegrations.provider, provider));
}
