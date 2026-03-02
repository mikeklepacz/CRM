import { statuses, type InsertStatus, type Status } from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function getAllStatusesStorage(tenantId: string): Promise<Status[]> {
  const allStatuses = await db
    .select()
    .from(statuses)
    .where(eq(statuses.tenantId, tenantId))
    .orderBy(statuses.displayOrder);
  return allStatuses;
}

export async function getActiveStatusesStorage(tenantId: string): Promise<Status[]> {
  const activeStatuses = await db
    .select()
    .from(statuses)
    .where(and(eq(statuses.isActive, true), eq(statuses.tenantId, tenantId)))
    .orderBy(statuses.displayOrder);
  return activeStatuses;
}

export async function getStatusStorage(id: string): Promise<Status | undefined> {
  const [status] = await db
    .select()
    .from(statuses)
    .where(eq(statuses.id, id));
  return status;
}

export async function createStatusStorage(status: InsertStatus): Promise<Status> {
  const [newStatus] = await db
    .insert(statuses)
    .values(status)
    .returning();
  return newStatus;
}

export async function updateStatusStorage(id: string, updates: Partial<InsertStatus>): Promise<Status> {
  const [updated] = await db
    .update(statuses)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(statuses.id, id))
    .returning();
  return updated;
}

export async function deleteStatusStorage(id: string): Promise<void> {
  await db.delete(statuses).where(eq(statuses.id, id));
}

export async function reorderStatusesStorage(updates: { id: string; displayOrder: number }[]): Promise<void> {
  for (const update of updates) {
    await db
      .update(statuses)
      .set({
        displayOrder: update.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(statuses.id, update.id));
  }
}
