import { db } from "../../db";
import { apolloCompanies } from "../../../shared/schema";
import { and, eq } from "drizzle-orm";
import type { ApolloCompany } from "../../../shared/schema";

export async function getNotFoundCompanies(tenantId: string, projectId?: string): Promise<ApolloCompany[]> {
  const conditions = [eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.enrichmentStatus, "not_found")];

  if (projectId) {
    conditions.push(eq(apolloCompanies.projectId, projectId));
  }

  return db.select().from(apolloCompanies).where(and(...conditions)).orderBy(apolloCompanies.enrichedAt);
}

export async function markCompanyNotFound(
  tenantId: string,
  googleSheetLink: string,
  domain?: string,
  name?: string,
  projectId?: string,
): Promise<ApolloCompany> {
  const [company] = await db
    .insert(apolloCompanies)
    .values({
      tenantId,
      projectId: projectId || null,
      googleSheetLink,
      domain: domain || null,
      name: name || null,
      enrichmentStatus: "not_found",
      creditsUsed: 0,
    })
    .onConflictDoNothing()
    .returning();

  return company;
}

export async function markCompanyPrescreened(
  tenantId: string,
  googleSheetLink: string,
  apolloOrgId: string,
  domain?: string,
  name?: string,
  contactCount?: number,
  projectId?: string,
  websiteUrl?: string,
  shortDescription?: string,
  keywords?: string[],
): Promise<ApolloCompany> {
  const _contactCount = contactCount;
  const [company] = await db
    .insert(apolloCompanies)
    .values({
      tenantId,
      projectId: projectId || null,
      googleSheetLink,
      apolloOrgId,
      domain: domain || null,
      name: name || null,
      websiteUrl: websiteUrl || null,
      shortDescription: shortDescription || null,
      keywords: keywords || null,
      enrichmentStatus: "prescreened",
      creditsUsed: 0,
    })
    .onConflictDoNothing()
    .returning();

  return company;
}

export async function getPrescreenedCompanies(tenantId: string, projectId?: string): Promise<ApolloCompany[]> {
  const conditions = [eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.enrichmentStatus, "prescreened")];

  if (projectId) {
    conditions.push(eq(apolloCompanies.projectId, projectId));
  }

  return db.select().from(apolloCompanies).where(and(...conditions)).orderBy(apolloCompanies.enrichedAt);
}
