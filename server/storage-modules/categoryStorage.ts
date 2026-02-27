import {
  categories,
  type Category,
  type InsertCategory,
} from "@shared/schema";
import { db } from "../db";
import { and, eq, isNull, or } from "drizzle-orm";

export async function getAllCategoriesStorage(tenantId: string, projectId?: string): Promise<Category[]> {
  if (projectId) {
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), or(eq(categories.projectId, projectId), isNull(categories.projectId))))
      .orderBy(categories.displayOrder, categories.name);
  }
  return await db
    .select()
    .from(categories)
    .where(eq(categories.tenantId, tenantId))
    .orderBy(categories.displayOrder, categories.name);
}

export async function getActiveCategoriesStorage(tenantId: string, projectId?: string): Promise<Category[]> {
  if (projectId) {
    return await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.isActive, true),
          eq(categories.tenantId, tenantId),
          or(eq(categories.projectId, projectId), isNull(categories.projectId))
        )
      )
      .orderBy(categories.displayOrder, categories.name);
  }
  return await db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), eq(categories.tenantId, tenantId)))
    .orderBy(categories.displayOrder, categories.name);
}

export async function getCategoryStorage(id: string): Promise<Category | undefined> {
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  return category;
}

export async function getCategoryByNameStorage(
  tenantId: string,
  name: string,
  projectId?: string
): Promise<Category | undefined> {
  if (projectId) {
    const [projectCategory] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.name, name), eq(categories.projectId, projectId)));
    if (projectCategory) return projectCategory;

    const [sharedCategory] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.name, name), isNull(categories.projectId)));
    return sharedCategory;
  }

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.tenantId, tenantId), eq(categories.name, name)));
  return category;
}

export async function getOrCreateCategoryByNameStorage(
  tenantId: string,
  name: string,
  projectId?: string
): Promise<Category> {
  const existing = await getCategoryByNameStorage(tenantId, name, projectId);
  if (existing) {
    return existing;
  }

  const [newCategory] = await db
    .insert(categories)
    .values({ tenantId, name, isActive: true, ...(projectId ? { projectId } : {}) })
    .returning();
  return newCategory;
}

export async function createCategoryStorage(category: InsertCategory): Promise<Category> {
  const [newCategory] = await db.insert(categories).values(category).returning();
  return newCategory;
}

export async function updateCategoryStorage(id: string, updates: Partial<InsertCategory>): Promise<Category> {
  const [updated] = await db
    .update(categories)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  return updated;
}

export async function deleteCategoryStorage(id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}
