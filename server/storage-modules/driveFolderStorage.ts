import { driveFolders, type DriveFolder, type InsertDriveFolder } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function getAllDriveFoldersStorage(): Promise<DriveFolder[]> {
  return await db.select().from(driveFolders);
}

export async function getDriveFolderStorage(id: string): Promise<DriveFolder | undefined> {
  const [folder] = await db.select().from(driveFolders).where(eq(driveFolders.id, id));
  return folder;
}

export async function getDriveFolderByNameStorage(name: string): Promise<DriveFolder | undefined> {
  const [folder] = await db.select().from(driveFolders).where(eq(driveFolders.name, name));
  return folder;
}

export async function createDriveFolderStorage(folder: InsertDriveFolder): Promise<DriveFolder> {
  const [newFolder] = await db.insert(driveFolders).values(folder).returning();
  return newFolder;
}

export async function updateDriveFolderStorage(id: string, updates: Partial<InsertDriveFolder>): Promise<DriveFolder> {
  const [updated] = await db
    .update(driveFolders)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(driveFolders.id, id))
    .returning();
  return updated;
}

export async function deleteDriveFolderStorage(id: string): Promise<void> {
  await db.delete(driveFolders).where(eq(driveFolders.id, id));
}
