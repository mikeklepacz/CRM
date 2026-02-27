import { noSendDates, ignoredHolidays, type NoSendDate, type InsertNoSendDate, type IgnoredHoliday, type InsertIgnoredHoliday } from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function getNoSendDatesStorage(): Promise<NoSendDate[]> {
  return await db.select().from(noSendDates).orderBy(noSendDates.date);
}

export async function getNoSendDateStorage(id: string): Promise<NoSendDate | undefined> {
  const [noSendDate] = await db.select().from(noSendDates).where(eq(noSendDates.id, id));
  return noSendDate;
}

export async function createNoSendDateStorage(data: InsertNoSendDate): Promise<NoSendDate> {
  const [created] = await db.insert(noSendDates).values(data).returning();
  return created;
}

export async function deleteNoSendDateStorage(id: string): Promise<void> {
  await db.delete(noSendDates).where(eq(noSendDates.id, id));
}

export async function getIgnoredHolidaysStorage(tenantId: string): Promise<IgnoredHoliday[]> {
  return await db.select().from(ignoredHolidays).where(eq(ignoredHolidays.tenantId, tenantId));
}

export async function getIgnoredHolidayByHolidayIdStorage(tenantId: string, holidayId: string): Promise<IgnoredHoliday | undefined> {
  const [holiday] = await db.select().from(ignoredHolidays).where(
    and(eq(ignoredHolidays.tenantId, tenantId), eq(ignoredHolidays.holidayId, holidayId))
  );
  return holiday;
}

export async function createIgnoredHolidayStorage(data: InsertIgnoredHoliday): Promise<IgnoredHoliday> {
  const [created] = await db.insert(ignoredHolidays).values(data).returning();
  return created;
}

export async function deleteIgnoredHolidayStorage(tenantId: string, holidayId: string): Promise<void> {
  await db.delete(ignoredHolidays).where(
    and(eq(ignoredHolidays.tenantId, tenantId), eq(ignoredHolidays.holidayId, holidayId))
  );
}
