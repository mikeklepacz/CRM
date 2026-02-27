import {
  importedPlaces,
  savedExclusions,
  searchHistory,
  userPreferences,
  type InsertSavedExclusion,
  type SavedExclusion,
  type SearchHistory,
  type UserPreferences,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

export async function checkImportedPlacesStorage(placeIds: string[]): Promise<Set<string>> {
  if (placeIds.length === 0) return new Set();

  const results = await db.select({ placeId: importedPlaces.placeId }).from(importedPlaces).where(inArray(importedPlaces.placeId, placeIds));

  return new Set(results.map((r) => r.placeId));
}

export async function recordImportedPlaceStorage(placeId: string, tenantId: string): Promise<void> {
  await db.insert(importedPlaces).values({ placeId, tenantId }).onConflictDoNothing();
}

export async function getAllSearchHistoryStorage(): Promise<SearchHistory[]> {
  const history = await db.select().from(searchHistory).orderBy(desc(searchHistory.searchedAt));
  return history;
}

export async function recordSearchStorage(
  tenantId: string,
  businessType: string,
  city: string,
  state: string,
  country: string,
  excludedKeywords: string[] = [],
  excludedTypes: string[] = [],
  category?: string
): Promise<SearchHistory> {
  const [existing] = await db
    .select()
    .from(searchHistory)
    .where(
      and(
        eq(searchHistory.tenantId, tenantId),
        eq(searchHistory.businessType, businessType),
        eq(searchHistory.city, city),
        eq(searchHistory.state, state),
        eq(searchHistory.country, country)
      )
    );

  if (existing) {
    const [updated] = await db
      .update(searchHistory)
      .set({
        searchedAt: new Date(),
        searchCount: existing.searchCount + 1,
        excludedKeywords: excludedKeywords.length > 0 ? excludedKeywords : existing.excludedKeywords,
        excludedTypes: excludedTypes.length > 0 ? excludedTypes : existing.excludedTypes,
        category: category || existing.category,
      })
      .where(eq(searchHistory.id, existing.id))
      .returning();
    return updated;
  } else {
    const [newEntry] = await db
      .insert(searchHistory)
      .values({
        tenantId,
        businessType,
        city,
        state,
        country,
        excludedKeywords,
        excludedTypes,
        category,
        searchCount: 1,
      })
      .returning();
    return newEntry;
  }
}

export async function getAllSavedExclusionsStorage(
  tenantId: string,
  projectId?: string
): Promise<SavedExclusion[]> {
  let whereClause;
  if (projectId) {
    whereClause = and(eq(savedExclusions.tenantId, tenantId), or(eq(savedExclusions.projectId, projectId), isNull(savedExclusions.projectId)));
  } else {
    whereClause = eq(savedExclusions.tenantId, tenantId);
  }
  const exclusions = await db.select().from(savedExclusions).where(whereClause).orderBy(savedExclusions.type, savedExclusions.value);
  return exclusions;
}

export async function getSavedExclusionsByTypeStorage(
  tenantId: string,
  projectId: string | undefined,
  type: "keyword" | "place_type"
): Promise<SavedExclusion[]> {
  let whereClause;
  if (projectId) {
    whereClause = and(
      eq(savedExclusions.tenantId, tenantId),
      eq(savedExclusions.type, type),
      or(eq(savedExclusions.projectId, projectId), isNull(savedExclusions.projectId))
    );
  } else {
    whereClause = and(eq(savedExclusions.tenantId, tenantId), eq(savedExclusions.type, type));
  }
  const exclusions = await db.select().from(savedExclusions).where(whereClause).orderBy(savedExclusions.value);
  return exclusions;
}

export async function createSavedExclusionStorage(exclusion: InsertSavedExclusion): Promise<SavedExclusion> {
  const conditions = [eq(savedExclusions.type, exclusion.type), eq(savedExclusions.value, exclusion.value), eq(savedExclusions.tenantId, exclusion.tenantId)];
  if (exclusion.projectId) {
    conditions.push(eq(savedExclusions.projectId, exclusion.projectId));
  }

  const [existing] = await db.select().from(savedExclusions).where(and(...conditions));

  if (existing) {
    return existing;
  }

  const [newExclusion] = await db.insert(savedExclusions).values(exclusion).returning();
  return newExclusion;
}

export async function updateUserActiveExclusionsStorage(
  userId: string,
  tenantId: string,
  activeKeywords: string[],
  activeTypes: string[]
): Promise<UserPreferences> {
  const [prefs] = await db
    .update(userPreferences)
    .set({
      activeExcludedKeywords: activeKeywords,
      activeExcludedTypes: activeTypes,
    })
    .where(eq(userPreferences.userId, userId))
    .returning();

  if (!prefs) {
    const [newPrefs] = await db
      .insert(userPreferences)
      .values({
        userId,
        tenantId,
        activeExcludedKeywords: activeKeywords,
        activeExcludedTypes: activeTypes,
      })
      .returning();
    return newPrefs;
  }

  return prefs;
}
