import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { apolloCompanies, apolloContacts } from "../../shared/schema";

export async function listCompanyContactsWithAutoCleanup(tenantId: string, companyId: string, projectId?: string) {
  await cleanupInvalidApolloContacts(tenantId, companyId, projectId);

  const whereParts = [eq(apolloContacts.tenantId, tenantId), eq(apolloContacts.companyId, companyId)];
  if (projectId) {
    whereParts.push(eq(apolloContacts.projectId, projectId));
  }

  return db
    .select()
    .from(apolloContacts)
    .where(and(...whereParts))
    .orderBy(apolloContacts.seniority);
}

export async function cleanupInvalidApolloContacts(tenantId: string, companyId?: string, projectId?: string): Promise<number> {
  const whereParts = [
    eq(apolloContacts.tenantId, tenantId),
    or(
      isNull(apolloContacts.email),
      eq(apolloContacts.email, ""),
      sql`lower(${apolloContacts.emailStatus}) = 'unavailable'`,
      sql`lower(${apolloContacts.emailStatus}) = 'invalid'`
    ),
  ];

  if (companyId) {
    whereParts.push(eq(apolloContacts.companyId, companyId));
  }
  if (projectId) {
    whereParts.push(eq(apolloContacts.projectId, projectId));
  }

  const deleted = await db
    .delete(apolloContacts)
    .where(and(...whereParts))
    .returning({ id: apolloContacts.id });

  return deleted.length;
}

export async function deleteApolloContactById(tenantId: string, contactId: string): Promise<boolean> {
  const deleted = await db
    .delete(apolloContacts)
    .where(and(eq(apolloContacts.tenantId, tenantId), eq(apolloContacts.id, contactId)))
    .returning({ id: apolloContacts.id });

  return deleted.length > 0;
}

export async function hideApolloCompanyById(tenantId: string, companyId: string): Promise<boolean> {
  const updated = await db
    .update(apolloCompanies)
    .set({
      enrichmentStatus: "archived",
      updatedAt: new Date(),
    })
    .where(and(eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.id, companyId)))
    .returning({ id: apolloCompanies.id });

  return updated.length > 0;
}

export async function listRetiredApolloCompanies(tenantId: string, projectId?: string) {
  const whereParts = [
    eq(apolloCompanies.tenantId, tenantId),
    or(eq(apolloCompanies.enrichmentStatus, "archived"), eq(apolloCompanies.enrichmentStatus, "retired")),
  ];

  if (projectId) {
    whereParts.push(eq(apolloCompanies.projectId, projectId));
  }

  return db
    .select()
    .from(apolloCompanies)
    .where(and(...whereParts))
    .orderBy(apolloCompanies.enrichedAt);
}

export async function restoreApolloCompanyToNotFound(tenantId: string, companyId: string): Promise<boolean> {
  const updated = await db
    .update(apolloCompanies)
    .set({
      enrichmentStatus: "not_found",
      updatedAt: new Date(),
    })
    .where(and(eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.id, companyId)))
    .returning({ id: apolloCompanies.id });

  return updated.length > 0;
}

export async function deleteApolloCompanyById(tenantId: string, companyId: string): Promise<boolean> {
  const deleted = await db
    .delete(apolloCompanies)
    .where(and(eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.id, companyId)))
    .returning({ id: apolloCompanies.id });

  return deleted.length > 0;
}
