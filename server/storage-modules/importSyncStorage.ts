import {
  csvUploads,
  googleSheets,
  type CsvUpload,
  type GoogleSheet,
  type InsertCsvUpload,
  type InsertGoogleSheet,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function createCsvUploadStorage(upload: InsertCsvUpload): Promise<CsvUpload> {
  const [newUpload] = await db.insert(csvUploads).values(upload as any).returning();
  return newUpload;
}

export async function getRecentCsvUploadsStorage(limit: number = 10): Promise<CsvUpload[]> {
  return await db.select().from(csvUploads).orderBy(csvUploads.uploadedAt).limit(limit);
}

export async function getAllActiveGoogleSheetsStorage(tenantId: string): Promise<GoogleSheet[]> {
  return await db
    .select()
    .from(googleSheets)
    .where(and(eq(googleSheets.syncStatus, "active"), eq(googleSheets.tenantId, tenantId)))
    .orderBy(desc(googleSheets.createdAt));
}

export async function getGoogleSheetByIdStorage(id: string, tenantId: string): Promise<GoogleSheet | null> {
  const [sheet] = await db
    .select()
    .from(googleSheets)
    .where(and(eq(googleSheets.id, id), eq(googleSheets.tenantId, tenantId)))
    .limit(1);
  return sheet || null;
}

export async function getGoogleSheetByPurposeStorage(
  purpose: string,
  tenantId: string
): Promise<GoogleSheet | null> {
  const [sheet] = await db
    .select()
    .from(googleSheets)
    .where(
      and(eq(googleSheets.sheetPurpose, purpose), eq(googleSheets.syncStatus, "active"), eq(googleSheets.tenantId, tenantId))
    )
    .limit(1);
  return sheet || null;
}

export async function createGoogleSheetConnectionStorage(connection: InsertGoogleSheet): Promise<GoogleSheet> {
  const [newConnection] = await db.insert(googleSheets).values(connection).returning();
  return newConnection;
}

export async function disconnectGoogleSheetStorage(id: string): Promise<void> {
  await db.update(googleSheets).set({ syncStatus: "paused" }).where(eq(googleSheets.id, id));
}

export async function updateGoogleSheetLastSyncStorage(id: string): Promise<void> {
  await db.update(googleSheets).set({ lastSyncedAt: new Date() }).where(eq(googleSheets.id, id));
}
