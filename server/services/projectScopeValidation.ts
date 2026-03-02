import { and, eq, or } from "drizzle-orm";
import { tenantProjects } from "../../shared/schema";
import { db } from "../db";

export async function resolveTenantProjectId(
  tenantId: string,
  projectId?: string | null
): Promise<string | undefined> {
  if (!projectId) {
    return undefined;
  }

  const project = await db
    .select({ id: tenantProjects.id })
    .from(tenantProjects)
    .where(
      and(
        eq(tenantProjects.tenantId, tenantId),
        or(eq(tenantProjects.id, projectId), eq(tenantProjects.slug, projectId))
      )
    )
    .limit(1);

  if (project.length === 0) {
    throw new Error("Invalid projectId for tenant");
  }

  return project[0].id;
}

/**
 * Ensures a project belongs to the tenant before it is used for reads/writes.
 */
export async function assertTenantProjectScope(tenantId: string, projectId?: string | null): Promise<void> {
  await resolveTenantProjectId(tenantId, projectId);
}
