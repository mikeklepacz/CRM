import {
  notifications,
  reminders,
  type InsertReminder,
  type Notification,
  type Reminder,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getRemindersByUserStorage(userId: string, tenantId: string): Promise<Reminder[]> {
  return await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.tenantId, tenantId)))
    .orderBy(desc(reminders.nextTrigger));
}

export async function getRemindersByClientStorage(clientId: string, tenantId: string): Promise<Reminder[]> {
  return await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.clientId, clientId), eq(reminders.tenantId, tenantId)))
    .orderBy(desc(reminders.nextTrigger));
}

export async function getReminderByIdStorage(id: string, tenantId: string): Promise<Reminder | undefined> {
  const [reminder] = await db.select().from(reminders).where(and(eq(reminders.id, id), eq(reminders.tenantId, tenantId)));
  return reminder;
}

export async function createReminderStorage(reminder: InsertReminder): Promise<Reminder> {
  const [newReminder] = await db.insert(reminders).values(reminder as any).returning();
  return newReminder;
}

export async function updateReminderStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertReminder>
): Promise<Reminder> {
  const [updated] = await db
    .update(reminders)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(reminders.id, id), eq(reminders.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteReminderStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.tenantId, tenantId)));
}

export async function getNotificationsByUserStorage(userId: string, tenantId: string): Promise<Notification[]> {
  return await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)))
    .orderBy(desc(notifications.createdAt));
}

export async function getNotificationByIdStorage(
  id: string,
  tenantId: string
): Promise<Notification | undefined> {
  const [notification] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)));
  return notification;
}

export async function markNotificationAsReadStorage(id: string, tenantId: string): Promise<Notification> {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function markNotificationAsResolvedStorage(id: string, tenantId: string): Promise<Notification> {
  const [updated] = await db
    .update(notifications)
    .set({ isResolved: true, resolvedAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteNotificationStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)));
}
