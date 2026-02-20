import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { apolloCompanies, apolloContacts, type ApolloCompany, type ApolloContact } from "../../shared/schema";

type EnrichedCompanyWithCount = ApolloCompany & { contactCount: number };

export async function getScopedEnrichedCompanies(
  tenantId: string,
  projectId?: string
): Promise<EnrichedCompanyWithCount[]> {
  if (!projectId) {
    const result = await db
      .select({
        company: apolloCompanies,
        contactCount: sql<number>`COUNT(${apolloContacts.id})`.as("contact_count"),
      })
      .from(apolloCompanies)
      .leftJoin(apolloContacts, eq(apolloContacts.companyId, apolloCompanies.id))
      .where(and(eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.enrichmentStatus, "enriched")))
      .groupBy(apolloCompanies.id)
      .orderBy(apolloCompanies.enrichedAt);

    return result.map((row) => ({ ...row.company, contactCount: Number(row.contactCount) || 0 }));
  }

  const result = await db
    .select({
      company: apolloCompanies,
      contactCount: sql<number>`COUNT(${apolloContacts.id})`.as("contact_count"),
    })
    .from(apolloCompanies)
    .leftJoin(
      apolloContacts,
      and(eq(apolloContacts.companyId, apolloCompanies.id), eq(apolloContacts.projectId, projectId))
    )
    .where(
      and(
        eq(apolloCompanies.tenantId, tenantId),
        eq(apolloCompanies.enrichmentStatus, "enriched"),
        or(
          eq(apolloCompanies.projectId, projectId),
          sql`EXISTS (
            SELECT 1
            FROM apollo_contacts ac
            WHERE ac.company_id = ${apolloCompanies.id}
              AND ac.tenant_id = ${tenantId}
              AND ac.project_id = ${projectId}
          )`
        )
      )
    )
    .groupBy(apolloCompanies.id)
    .orderBy(apolloCompanies.enrichedAt);

  return result.map((row) => ({ ...row.company, contactCount: Number(row.contactCount) || 0 }));
}

export async function getScopedContactsForCompany(
  tenantId: string,
  companyId: string,
  projectId?: string
): Promise<ApolloContact[]> {
  const conditions = [eq(apolloContacts.tenantId, tenantId), eq(apolloContacts.companyId, companyId)];

  if (projectId) {
    conditions.push(eq(apolloContacts.projectId, projectId));
  }

  return db
    .select()
    .from(apolloContacts)
    .where(and(...conditions))
    .orderBy(apolloContacts.seniority);
}
