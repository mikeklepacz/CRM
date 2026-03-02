import {
  kbChangeProposals,
  kbFileVersions,
  kbFiles,
  type InsertKbChangeProposal,
  type InsertKbFile,
  type InsertKbFileVersion,
  type KbChangeProposal,
  type KbFile,
  type KbFileVersion,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getAllKbFilesStorage(tenantId: string, projectId?: string): Promise<KbFile[]> {
  const conditions = [eq(kbFiles.tenantId, tenantId)];
  if (projectId) {
    conditions.push(eq(kbFiles.projectId, projectId));
  }
  return await db.select().from(kbFiles).where(and(...conditions)).orderBy(kbFiles.filename);
}

export async function getKbFileByIdStorage(id: string, tenantId: string): Promise<KbFile | undefined> {
  const [file] = await db.select().from(kbFiles).where(and(eq(kbFiles.id, id), eq(kbFiles.tenantId, tenantId)));
  return file;
}

export async function getKbFileByFilenameStorage(filename: string, tenantId: string): Promise<KbFile | undefined> {
  const [file] = await db
    .select()
    .from(kbFiles)
    .where(and(eq(kbFiles.filename, filename), eq(kbFiles.tenantId, tenantId)));
  return file;
}

export async function getKbFileByElevenLabsDocIdStorage(docId: string, tenantId: string): Promise<KbFile | undefined> {
  const [file] = await db
    .select()
    .from(kbFiles)
    .where(and(eq(kbFiles.elevenlabsDocId, docId), eq(kbFiles.tenantId, tenantId)));
  return file;
}

export async function createKbFileStorage(file: InsertKbFile): Promise<KbFile> {
  const [created] = await db.insert(kbFiles).values(file).returning();
  return created;
}

export async function updateKbFileStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertKbFile>
): Promise<KbFile> {
  const [updated] = await db
    .update(kbFiles)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(kbFiles.id, id), eq(kbFiles.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteKbFileStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db.delete(kbFiles).where(and(eq(kbFiles.id, id), eq(kbFiles.tenantId, tenantId)));
  return (result.rowCount || 0) > 0;
}

export async function createKbFileVersionStorage(version: InsertKbFileVersion): Promise<KbFileVersion> {
  const [created] = await db.insert(kbFileVersions).values(version).returning();
  return created;
}

export async function getKbFileVersionsStorage(fileId: string, tenantId: string): Promise<KbFileVersion[]> {
  return await db
    .select()
    .from(kbFileVersions)
    .where(and(eq(kbFileVersions.kbFileId, fileId), eq(kbFileVersions.tenantId, tenantId)))
    .orderBy(desc(kbFileVersions.versionNumber));
}

export async function getKbFileVersionStorage(id: string, tenantId: string): Promise<KbFileVersion | undefined> {
  const [version] = await db
    .select()
    .from(kbFileVersions)
    .where(and(eq(kbFileVersions.id, id), eq(kbFileVersions.tenantId, tenantId)));
  return version;
}

export async function createKbProposalStorage(proposal: InsertKbChangeProposal): Promise<KbChangeProposal> {
  const [created] = await db.insert(kbChangeProposals).values(proposal).returning();
  return created;
}

export async function getKbProposalsStorage(
  tenantId: string,
  filters?: { status?: string; kbFileId?: string }
): Promise<KbChangeProposal[]> {
  let query = db.select().from(kbChangeProposals);

  const conditions = [eq(kbChangeProposals.tenantId, tenantId)];
  if (filters?.status) {
    conditions.push(eq(kbChangeProposals.status, filters.status));
  }
  if (filters?.kbFileId) {
    conditions.push(eq(kbChangeProposals.kbFileId, filters.kbFileId));
  }

  query = query.where(and(...conditions)) as any;

  return await query.orderBy(desc(kbChangeProposals.createdAt));
}

export async function getKbProposalByIdStorage(id: string, tenantId: string): Promise<KbChangeProposal | undefined> {
  const [proposal] = await db
    .select()
    .from(kbChangeProposals)
    .where(and(eq(kbChangeProposals.id, id), eq(kbChangeProposals.tenantId, tenantId)));
  return proposal;
}

export async function updateKbProposalStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertKbChangeProposal>
): Promise<KbChangeProposal> {
  const [updated] = await db
    .update(kbChangeProposals)
    .set(updates)
    .where(and(eq(kbChangeProposals.id, id), eq(kbChangeProposals.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteKbProposalStorage(id: string, tenantId: string): Promise<boolean> {
  const result = await db
    .delete(kbChangeProposals)
    .where(and(eq(kbChangeProposals.id, id), eq(kbChangeProposals.tenantId, tenantId)))
    .returning();
  return result.length > 0;
}

export async function deleteAllKbProposalsStorage(tenantId: string): Promise<number> {
  const result = await db.delete(kbChangeProposals).where(eq(kbChangeProposals.tenantId, tenantId));
  return result.rowCount ?? 0;
}
