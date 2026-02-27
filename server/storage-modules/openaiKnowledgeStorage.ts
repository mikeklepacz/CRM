import {
  knowledgeBaseFiles,
  openaiSettings,
  type InsertKnowledgeBaseFile,
  type InsertOpenaiSettings,
  type KnowledgeBaseFile,
  type OpenaiSettings,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getOpenaiSettingsStorage(tenantId: string): Promise<OpenaiSettings | undefined> {
  const [settings] = await db
    .select()
    .from(openaiSettings)
    .where(and(eq(openaiSettings.tenantId, tenantId), eq(openaiSettings.isActive, true)))
    .limit(1);
  return settings;
}

export async function saveOpenaiSettingsStorage(
  tenantId: string,
  settings: Partial<InsertOpenaiSettings>
): Promise<OpenaiSettings> {
  const existing = await getOpenaiSettingsStorage(tenantId);

  if (existing) {
    const [updated] = await db
      .update(openaiSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(and(eq(openaiSettings.id, existing.id), eq(openaiSettings.tenantId, tenantId)))
      .returning();
    return updated;
  } else {
    const [newSettings] = await db
      .insert(openaiSettings)
      .values({ ...settings, tenantId } as InsertOpenaiSettings)
      .returning();
    return newSettings;
  }
}

export async function getAllKnowledgeBaseFilesStorage(tenantId: string): Promise<any[]> {
  const results = await db
    .select({
      id: knowledgeBaseFiles.id,
      originalName: knowledgeBaseFiles.originalName,
      openaiFileId: knowledgeBaseFiles.openaiFileId,
      category: knowledgeBaseFiles.category,
      productCategory: knowledgeBaseFiles.productCategory,
      description: knowledgeBaseFiles.description,
      fileSize: knowledgeBaseFiles.fileSize,
      processingStatus: knowledgeBaseFiles.processingStatus,
      uploadedAt: knowledgeBaseFiles.uploadedAt,
      isActive: knowledgeBaseFiles.isActive,
    })
    .from(knowledgeBaseFiles)
    .where(and(eq(knowledgeBaseFiles.tenantId, tenantId), eq(knowledgeBaseFiles.isActive, true)))
    .orderBy(desc(knowledgeBaseFiles.uploadedAt));

  return results;
}

export async function getKnowledgeBaseFileStorage(
  id: string,
  tenantId: string
): Promise<KnowledgeBaseFile | undefined> {
  const [file] = await db
    .select()
    .from(knowledgeBaseFiles)
    .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)));
  return file;
}

export async function createKnowledgeBaseFileStorage(file: InsertKnowledgeBaseFile): Promise<KnowledgeBaseFile> {
  const [newFile] = await db.insert(knowledgeBaseFiles).values(file).returning();
  return newFile;
}

export async function updateKnowledgeBaseFileStatusStorage(
  id: string,
  tenantId: string,
  status: string
): Promise<KnowledgeBaseFile> {
  const [updated] = await db
    .update(knowledgeBaseFiles)
    .set({ processingStatus: status })
    .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function updateKnowledgeBaseFileStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertKnowledgeBaseFile>
): Promise<KnowledgeBaseFile> {
  const [updated] = await db
    .update(knowledgeBaseFiles)
    .set(updates)
    .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteKnowledgeBaseFileStorage(id: string, tenantId: string): Promise<void> {
  await db
    .update(knowledgeBaseFiles)
    .set({ isActive: false })
    .where(and(eq(knowledgeBaseFiles.id, id), eq(knowledgeBaseFiles.tenantId, tenantId)));
}
