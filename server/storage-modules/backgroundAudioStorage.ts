import {
  backgroundAudioSettings,
  type BackgroundAudioSettings,
  type InsertBackgroundAudioSettings,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function getBackgroundAudioSettingsStorage(): Promise<BackgroundAudioSettings | undefined> {
  const [settings] = await db.select().from(backgroundAudioSettings).limit(1);
  return settings;
}

export async function updateBackgroundAudioSettingsStorage(
  settings: InsertBackgroundAudioSettings
): Promise<BackgroundAudioSettings> {
  const existing = await getBackgroundAudioSettingsStorage();

  if (existing) {
    const [updated] = await db
      .update(backgroundAudioSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(backgroundAudioSettings.id, existing.id))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(backgroundAudioSettings).values(settings).returning();
    return created;
  }
}
