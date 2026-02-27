import {
  savedExclusions,
  searchHistory,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function deleteSearchHistoryStorage(id: string): Promise<void> {
  await db.delete(searchHistory).where(eq(searchHistory.id, id));
}

export async function deleteSavedExclusionStorage(id: string): Promise<void> {
  await db.delete(savedExclusions).where(eq(savedExclusions.id, id));
}
