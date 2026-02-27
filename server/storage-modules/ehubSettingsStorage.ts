import {
  ehubSettings,
  type EhubSettings,
  type InsertEhubSettings,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

function normalizeEhubSettingsStorage(settings: EhubSettings): EhubSettings {
  return {
    ...settings,
    clientWindowStartOffset:
      typeof settings.clientWindowStartOffset === "string"
        ? parseFloat(settings.clientWindowStartOffset)
        : settings.clientWindowStartOffset,
  } as any;
}

export async function getEhubSettingsStorage(tenantId: string): Promise<EhubSettings | undefined> {
  const [settings] = await db.select().from(ehubSettings).where(eq(ehubSettings.tenantId, tenantId)).limit(1);

  return settings ? normalizeEhubSettingsStorage(settings) : undefined;
}

export async function updateEhubSettingsStorage(
  tenantId: string,
  updates: Partial<InsertEhubSettings>
): Promise<EhubSettings> {
  if (updates.sendingHoursStart !== undefined && updates.sendingHoursEnd !== undefined && !updates.sendingHoursDuration) {
    if (updates.sendingHoursEnd <= updates.sendingHoursStart) {
      throw new Error("sendingHoursEnd must be greater than sendingHoursStart");
    }
  }

  if (updates.minDelayMinutes !== undefined && updates.maxDelayMinutes !== undefined) {
    if (updates.maxDelayMinutes < updates.minDelayMinutes) {
      throw new Error("maxDelayMinutes must be greater than or equal to minDelayMinutes");
    }
  }

  if (updates.dailyEmailLimit !== undefined) {
    if (updates.dailyEmailLimit < 1 || updates.dailyEmailLimit > 2000) {
      throw new Error("dailyEmailLimit must be between 1 and 2000");
    }
  }

  const existing = await getEhubSettingsStorage(tenantId);

  if (existing) {
    const [updated] = await db
      .update(ehubSettings)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(and(eq(ehubSettings.id, existing.id), eq(ehubSettings.tenantId, tenantId)))
      .returning();
    return normalizeEhubSettingsStorage(updated);
  } else {
    const [created] = await db
      .insert(ehubSettings)
      .values({
        tenantId,
        minDelayMinutes: 1,
        maxDelayMinutes: 3,
        dailyEmailLimit: 200,
        sendingHoursStart: 9,
        sendingHoursEnd: 14,
        clientWindowStartOffset: "1.00",
        clientWindowEndHour: 14,
        excludedDays: [],
        ...updates,
      } as any)
      .returning();
    return normalizeEhubSettingsStorage(created);
  }
}
