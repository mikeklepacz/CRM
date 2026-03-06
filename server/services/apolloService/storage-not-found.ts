import { db } from "../../db";
import { apolloCompanies } from "../../../shared/schema";
import { and, eq } from "drizzle-orm";
import type { ApolloCompany } from "../../../shared/schema";

type PrescreenPersonPreview = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  seniority: string | null;
  hasEmail: boolean;
  linkedinUrl: string | null;
};

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
      prescreenContactCount: 0,
      prescreenPeoplePreview: [],
      creditsUsed: 0,
    })
    .onConflictDoUpdate({
      target: [apolloCompanies.tenantId, apolloCompanies.googleSheetLink],
      set: {
        projectId: projectId || null,
        domain: domain || null,
        name: name || null,
        enrichmentStatus: "not_found",
        prescreenContactCount: 0,
        prescreenPeoplePreview: [],
        creditsUsed: 0,
        updatedAt: new Date(),
      },
    })
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
  linkedinUrl?: string,
  shortDescription?: string,
  keywords?: string[],
  employeeCount?: number,
  previewPeople?: PrescreenPersonPreview[],
): Promise<ApolloCompany> {
  const normalizedContactCount = Math.max(0, contactCount || 0);
  const normalizedPreviewPeople = (previewPeople || []).slice(0, 5);
  const metadataPatch = {
    domain: domain || null,
    name: name || null,
    websiteUrl: websiteUrl || null,
    linkedinUrl: linkedinUrl || null,
    shortDescription: shortDescription || null,
    keywords: keywords || null,
    employeeCount: employeeCount ?? null,
    prescreenContactCount: normalizedContactCount,
    prescreenPeoplePreview: normalizedPreviewPeople,
    enrichmentStatus: "prescreened" as const,
    creditsUsed: 0,
    updatedAt: new Date(),
  };

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
      linkedinUrl: linkedinUrl || null,
      shortDescription: shortDescription || null,
      keywords: keywords || null,
      employeeCount: employeeCount ?? null,
      prescreenContactCount: normalizedContactCount,
      prescreenPeoplePreview: normalizedPreviewPeople,
      enrichmentStatus: "prescreened",
      creditsUsed: 0,
    })
    .onConflictDoUpdate({
      target: [apolloCompanies.tenantId, apolloCompanies.googleSheetLink],
      set: { projectId: projectId || null, apolloOrgId, ...metadataPatch },
    })
    .returning();

  // Keep all source links for the same Apollo organization aligned so Pre-screen rows don't diverge.
  const scopeConditions = [eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.apolloOrgId, apolloOrgId)];
  if (projectId) {
    scopeConditions.push(eq(apolloCompanies.projectId, projectId));
  }
  await db.update(apolloCompanies).set(metadataPatch).where(and(...scopeConditions));

  return company;
}

export async function getPrescreenedCompanies(tenantId: string, projectId?: string): Promise<ApolloCompany[]> {
  const conditions = [eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.enrichmentStatus, "prescreened")];

  if (projectId) {
    conditions.push(eq(apolloCompanies.projectId, projectId));
  }

  return db.select().from(apolloCompanies).where(and(...conditions)).orderBy(apolloCompanies.enrichedAt);
}
