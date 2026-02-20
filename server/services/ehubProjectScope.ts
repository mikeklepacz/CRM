import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { categories, tenantProjects } from "../../shared/schema";

/**
 * Resolve allowed category names for E-Hub contact filtering within a project.
 *
 * Source of truth:
 * - Category records assigned to this project (primary behavior)
 * - Project name itself (legacy fallback for rows written with project-name category)
 */
export async function getAllowedEhubCategoryNames(
  tenantId: string,
  projectId: string
): Promise<Set<string>> {
  const allowed = new Set<string>();

  const projectRows = await db
    .select({ name: tenantProjects.name })
    .from(tenantProjects)
    .where(and(eq(tenantProjects.id, projectId), eq(tenantProjects.tenantId, tenantId)))
    .limit(1);

  if (projectRows.length === 0) {
    return allowed;
  }

  const projectName = projectRows[0].name?.toLowerCase().trim();
  if (projectName) {
    allowed.add(projectName);
  }

  const categoryRows = await db
    .select({ name: categories.name })
    .from(categories)
    .where(
      and(
        eq(categories.tenantId, tenantId),
        eq(categories.isActive, true),
        eq(categories.projectId, projectId)
      )
    );

  for (const row of categoryRows) {
    const normalized = row.name?.toLowerCase().trim();
    if (normalized) {
      allowed.add(normalized);
    }
  }

  return allowed;
}
