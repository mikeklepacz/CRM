import {
  userPreferences,
  type UserPreferences,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function getUserPreferencesStorage(
  userId: string,
  tenantId: string
): Promise<UserPreferences | undefined> {
  const [tenantScopedPreferences] = await db
    .select()
    .from(userPreferences)
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.tenantId, tenantId)));
  if (tenantScopedPreferences) {
    return tenantScopedPreferences;
  }

  const [userScopedPreferences] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  return userScopedPreferences;
}

export async function saveUserPreferencesStorage(
  userId: string,
  tenantId: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  const existing = await getUserPreferencesStorage(userId, tenantId);

  const formattedPreferences = {
    ...preferences,
    selectedStates: preferences.selectedStates || existing?.selectedStates || [],
  };

  if (preferences.lightModeColors) {
    (formattedPreferences as any).hasLightOverrides = true;
  }
  if (preferences.darkModeColors) {
    (formattedPreferences as any).hasDarkOverrides = true;
  }

  if (existing) {
    const updated = await db
      .update(userPreferences)
      .set({
        tenantId,
        ...formattedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated[0];
  } else {
    const created = await db
      .insert(userPreferences)
      .values({
        id: uuidv4(),
        userId,
        tenantId,
        ...formattedPreferences,
      })
      .returning();
    return created[0];
  }
}

export async function getLastCategoryStorage(userId: string, tenantId: string): Promise<string | null> {
  const preferences = await getUserPreferencesStorage(userId, tenantId);
  return preferences?.lastCategory || null;
}

export async function setLastCategoryStorage(
  userId: string,
  tenantId: string,
  category: string
): Promise<UserPreferences> {
  return await saveUserPreferencesStorage(userId, tenantId, { lastCategory: category });
}

export async function getSelectedCategoryStorage(userId: string, tenantId: string): Promise<string | null> {
  const preferences = await getUserPreferencesStorage(userId, tenantId);
  return preferences?.selectedCategory || null;
}

export async function setSelectedCategoryStorage(
  userId: string,
  tenantId: string,
  category: string
): Promise<UserPreferences> {
  return await saveUserPreferencesStorage(userId, tenantId, { selectedCategory: category });
}
