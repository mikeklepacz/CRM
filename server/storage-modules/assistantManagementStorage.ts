import {
  openaiAssistantFiles,
  openaiAssistants,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getAllAssistantsStorage(tenantId?: string): Promise<any[]> {
  if (tenantId) {
    return await db
      .select()
      .from(openaiAssistants)
      .where(and(eq(openaiAssistants.isActive, true), eq(openaiAssistants.tenantId, tenantId)));
  }
  return await db.select().from(openaiAssistants).where(eq(openaiAssistants.isActive, true));
}

export async function getAssistantByIdStorage(id: string): Promise<any | undefined> {
  const [assistant] = await db.select().from(openaiAssistants).where(eq(openaiAssistants.id, id));
  return assistant;
}

export async function getAssistantBySlugStorage(slug: string, tenantId?: string): Promise<any | undefined> {
  if (tenantId) {
    const [assistant] = await db
      .select()
      .from(openaiAssistants)
      .where(and(eq(openaiAssistants.slug, slug), eq(openaiAssistants.tenantId, tenantId)));
    return assistant;
  }
  const [assistant] = await db.select().from(openaiAssistants).where(eq(openaiAssistants.slug, slug));
  return assistant;
}

export async function updateAssistantStorage(id: string, updates: any): Promise<any> {
  const [updated] = await db
    .update(openaiAssistants)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(openaiAssistants.id, id))
    .returning();
  return updated;
}

export async function getAssistantFilesStorage(assistantId: string): Promise<any[]> {
  return await db
    .select()
    .from(openaiAssistantFiles)
    .where(eq(openaiAssistantFiles.assistantId, assistantId))
    .orderBy(desc(openaiAssistantFiles.uploadedAt));
}

export async function getAssistantFileByIdStorage(id: string): Promise<any | undefined> {
  const [file] = await db.select().from(openaiAssistantFiles).where(eq(openaiAssistantFiles.id, id));
  return file;
}

export async function createAssistantFileStorage(file: any): Promise<any> {
  const [created] = await db.insert(openaiAssistantFiles).values(file).returning();
  return created;
}

export async function deleteAssistantFileByAssistantIdStorage(fileId: string, assistantId: string): Promise<boolean> {
  const result = await db
    .delete(openaiAssistantFiles)
    .where(and(eq(openaiAssistantFiles.id, fileId), eq(openaiAssistantFiles.assistantId, assistantId)))
    .returning();
  return result.length > 0;
}
