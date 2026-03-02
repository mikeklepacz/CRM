import {
  templates,
  userTags,
  type InsertTemplate,
  type Template,
  type UserTag,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function getUserTemplatesStorage(userId: string, tenantId: string): Promise<Template[]> {
  return await db
    .select()
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.tenantId, tenantId)))
    .orderBy(desc(templates.createdAt));
}

export async function getTemplateStorage(id: string, tenantId: string): Promise<Template | undefined> {
  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)));
  return template;
}

export async function createTemplateStorage(template: InsertTemplate): Promise<Template> {
  const [newTemplate] = await db.insert(templates).values(template).returning();
  return newTemplate;
}

export async function updateTemplateStorage(
  id: string,
  tenantId: string,
  updates: Partial<InsertTemplate>
): Promise<Template> {
  const [updated] = await db
    .update(templates)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)))
    .returning();
  return updated;
}

export async function deleteTemplateStorage(id: string, tenantId: string): Promise<void> {
  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.tenantId, tenantId)));
}

export async function getUserTagsStorage(userId: string): Promise<UserTag[]> {
  return await db.select().from(userTags).where(eq(userTags.userId, userId)).orderBy(userTags.tag);
}

export async function addUserTagStorage(userId: string, tag: string, tenantId: string): Promise<UserTag> {
  const trimmedTag = tag.trim().toLowerCase();

  const existing = await db
    .select()
    .from(userTags)
    .where(and(eq(userTags.userId, userId), eq(userTags.tag, trimmedTag)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newTag] = await db.insert(userTags).values({ userId, tag: trimmedTag, tenantId }).returning();
  return newTag;
}

export async function removeUserTagStorage(userId: string, tag: string): Promise<void> {
  await db.delete(userTags).where(and(eq(userTags.userId, userId), eq(userTags.tag, tag.trim().toLowerCase())));
}

export async function removeUserTagByIdStorage(userId: string, id: string): Promise<void> {
  await db.delete(userTags).where(and(eq(userTags.userId, userId), eq(userTags.id, id)));
}
