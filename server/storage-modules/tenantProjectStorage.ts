import {
  tenantProjects,
  type InsertTenantProject,
  type TenantProject,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq } from "drizzle-orm";

export async function listTenantProjectsStorage(tenantId: string, status?: string): Promise<TenantProject[]> {
  if (status) {
    return await db
      .select()
      .from(tenantProjects)
      .where(and(eq(tenantProjects.tenantId, tenantId), eq(tenantProjects.status, status)))
      .orderBy(desc(tenantProjects.createdAt));
  }
  return await db.select().from(tenantProjects).where(eq(tenantProjects.tenantId, tenantId)).orderBy(desc(tenantProjects.createdAt));
}

export async function getTenantProjectByIdStorage(
  projectId: string,
  tenantId: string
): Promise<TenantProject | undefined> {
  const [project] = await db
    .select()
    .from(tenantProjects)
    .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)));
  return project;
}

export async function getTenantProjectBySlugStorage(
  slug: string,
  tenantId: string
): Promise<TenantProject | undefined> {
  const [project] = await db
    .select()
    .from(tenantProjects)
    .where(and(eq(tenantProjects.slug, slug), eq(tenantProjects.tenantId, tenantId)));
  return project;
}

export async function getDefaultTenantProjectStorage(tenantId: string): Promise<TenantProject | undefined> {
  const [project] = await db
    .select()
    .from(tenantProjects)
    .where(and(eq(tenantProjects.tenantId, tenantId), eq(tenantProjects.isDefault, true)));
  return project;
}

export async function createTenantProjectStorage(data: InsertTenantProject, slug: string): Promise<TenantProject> {
  const [project] = await db
    .insert(tenantProjects)
    .values({
      ...data,
      slug,
      status: data.status || "active",
    } as any)
    .returning();
  return project;
}

export async function updateTenantProjectStorage(
  projectId: string,
  tenantId: string,
  updates: Partial<InsertTenantProject>
): Promise<TenantProject> {
  const [project] = await db
    .update(tenantProjects)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
    .returning();
  return project;
}

export async function archiveTenantProjectStorage(
  projectId: string,
  tenantId: string,
  archivedBy: string
): Promise<TenantProject> {
  const [project] = await db
    .update(tenantProjects)
    .set({
      status: "archived",
      archivedAt: new Date(),
      archivedBy,
      updatedAt: new Date(),
    })
    .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
    .returning();
  return project;
}

export async function restoreTenantProjectStorage(projectId: string, tenantId: string): Promise<TenantProject> {
  const [project] = await db
    .update(tenantProjects)
    .set({
      status: "active",
      archivedAt: null,
      archivedBy: null,
      updatedAt: new Date(),
    })
    .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
    .returning();
  return project;
}

export async function setDefaultTenantProjectStorage(
  projectId: string,
  tenantId: string
): Promise<TenantProject> {
  await db
    .update(tenantProjects)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(eq(tenantProjects.tenantId, tenantId), eq(tenantProjects.isDefault, true)));

  const [project] = await db
    .update(tenantProjects)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
    .returning();
  return project;
}

export async function deleteTenantProjectStorage(projectId: string, tenantId: string): Promise<void> {
  await db.delete(tenantProjects).where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)));
}
