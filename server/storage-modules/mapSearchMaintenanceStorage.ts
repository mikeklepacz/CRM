import {
  savedExclusions,
  searchHistory,
} from "@shared/schema";
import { db } from "../db";
import { and, eq } from "drizzle-orm";

export async function deleteSearchHistoryStorage(id: string, tenantId: string): Promise<void> {
  await db
    .delete(searchHistory)
    .where(and(eq(searchHistory.id, id), eq(searchHistory.tenantId, tenantId)));
}

export async function deleteSavedExclusionStorage(id: string): Promise<void> {
  await db.delete(savedExclusions).where(eq(savedExclusions.id, id));
}
