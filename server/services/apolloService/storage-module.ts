import { db } from "../../db";
import { apolloCompanies, apolloContacts, apolloSettings } from "../../../shared/schema";
import { and, eq, sql } from "drizzle-orm";
import type { ApolloCompany, ApolloContact, InsertApolloContact } from "../../../shared/schema";
import { previewContactsForCompany } from "./preview";
import { enrichPeople } from "./search";
export {
  getNotFoundCompanies,
  markCompanyNotFound,
  markCompanyPrescreened,
  getPrescreenedCompanies,
} from "./storage-not-found";

export async function enrichAndStoreCompany(options: {
  tenantId: string;
  projectId?: string;
  googleSheetLink: string;
  domain?: string;
  companyName?: string;
  organizationId?: string;
  selectedPersonIds?: string[];
}): Promise<{ company: ApolloCompany | null; contacts: ApolloContact[]; creditsUsed: number }> {
  const existingCompany = await db
    .select()
    .from(apolloCompanies)
    .where(and(eq(apolloCompanies.tenantId, options.tenantId), eq(apolloCompanies.googleSheetLink, options.googleSheetLink)))
    .limit(1);

  if (existingCompany.length > 0) {
    const existingContacts = await db.select().from(apolloContacts).where(eq(apolloContacts.companyId, existingCompany[0].id));

    const canRetry =
      existingContacts.length === 0 &&
      (existingCompany[0].enrichmentStatus === "enriched" || existingCompany[0].enrichmentStatus === "prescreened");
    const canRetryNotFound = existingCompany[0].enrichmentStatus === "not_found";
    if (canRetry || canRetryNotFound) {
      console.log(
        `[Apollo Enrich] Company ${existingCompany[0].name} (status: ${existingCompany[0].enrichmentStatus}) has 0 contacts, deleting for retry`,
      );
      await db.delete(apolloCompanies).where(eq(apolloCompanies.id, existingCompany[0].id));
    } else {
      return {
        company: existingCompany[0],
        contacts: existingContacts,
        creditsUsed: 0,
      };
    }
  }

  const preview = await previewContactsForCompany({
    domain: options.domain,
    companyName: options.companyName,
    organizationId: options.organizationId,
    tenantId: options.tenantId,
  });

  if (!preview.company) {
    await db
      .insert(apolloCompanies)
      .values({
        tenantId: options.tenantId,
        projectId: options.projectId || null,
        googleSheetLink: options.googleSheetLink,
        enrichmentStatus: "not_found",
        creditsUsed: 0,
      })
      .onConflictDoNothing();
    return { company: null, contacts: [], creditsUsed: 0 };
  }

  const apolloCompany = preview.company;

  const [insertedCompany] = await db
    .insert(apolloCompanies)
    .values({
      tenantId: options.tenantId,
      projectId: options.projectId || null,
      googleSheetLink: options.googleSheetLink,
      apolloOrgId: apolloCompany.id,
      domain: apolloCompany.primary_domain,
      name: apolloCompany.name,
      phone: apolloCompany.phone || apolloCompany.primary_phone?.number,
      linkedinUrl: apolloCompany.linkedin_url,
      twitterUrl: apolloCompany.twitter_url,
      facebookUrl: apolloCompany.facebook_url,
      websiteUrl: apolloCompany.website_url,
      shortDescription: apolloCompany.short_description,
      keywords: apolloCompany.keywords,
      employeeCount: apolloCompany.estimated_num_employees,
      industry: apolloCompany.industry,
      foundedYear: apolloCompany.founded_year,
      city: apolloCompany.city,
      state: apolloCompany.state,
      country: apolloCompany.country,
      logoUrl: apolloCompany.logo_url,
      enrichmentStatus: "enriched",
      creditsUsed: 1,
    })
    .returning();

  let contactsToEnrich = preview.contacts.filter((p) => p.first_name);
  console.log(`[Apollo Enrich] Preview has ${preview.contacts.length} contacts, ${contactsToEnrich.length} have first names`);

  if (options.selectedPersonIds && options.selectedPersonIds.length > 0) {
    contactsToEnrich = contactsToEnrich.filter((p) => options.selectedPersonIds!.includes(p.id));
    console.log(`[Apollo Enrich] After selectedPersonIds filter: ${contactsToEnrich.length}`);
  }
  let storedContacts: ApolloContact[] = [];
  let totalCreditsUsed = 1;

  if (contactsToEnrich.length > 0) {
    const BATCH_SIZE = 10;
    const batches: typeof contactsToEnrich[] = [];
    for (let i = 0; i < contactsToEnrich.length; i += BATCH_SIZE) {
      batches.push(contactsToEnrich.slice(i, i + BATCH_SIZE));
    }
    console.log(`[Apollo Enrich] Enriching ${contactsToEnrich.length} people in ${batches.length} batch(es) for ${apolloCompany.name}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const enrichDetails = batch.map((p) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name || undefined,
        domain: apolloCompany.primary_domain,
        organization_name: apolloCompany.name,
      }));
      console.log(`[Apollo Enrich] Batch ${batchIndex + 1}/${batches.length}: enriching ${enrichDetails.length} people`);

      try {
        const enrichResult = await enrichPeople(enrichDetails);
        console.log(
          `[Apollo Enrich] Batch ${batchIndex + 1} result: ${enrichResult.matches?.length || 0} matches, ${enrichResult.credits_consumed} credits`,
        );
        totalCreditsUsed += enrichResult.credits_consumed;

        const rawMatches = enrichResult.matches || [];
        const validMatches = rawMatches.filter((match): match is any => match !== null);
        const nullCount = rawMatches.length - validMatches.length;
        console.log(`[Apollo Enrich] Batch ${batchIndex + 1}: ${validMatches.length} valid matches, ${nullCount} null/unmatched`);

        if (validMatches.length === 0 && rawMatches.length > 0) {
          console.warn(
            `[Apollo Enrich] Batch ${batchIndex + 1}: All ${rawMatches.length} matches were null - Apollo couldn't find these people`,
          );
        }

        const contactInserts: InsertApolloContact[] = validMatches.map((match) => ({
          tenantId: options.tenantId,
          projectId: options.projectId,
          companyId: insertedCompany.id,
          googleSheetLink: options.googleSheetLink,
          apolloPersonId: match.id,
          firstName: match.first_name,
          lastName: match.last_name,
          email: match.email,
          emailStatus: match.email_status,
          title: match.title,
          seniority: match.seniority,
          department: match.departments?.[0],
          phone: match.phone_numbers?.[0]?.sanitized_number,
          linkedinUrl: match.linkedin_url,
          photoUrl: match.photo_url,
          headline: match.headline,
          city: match.city,
          state: match.state,
          country: match.country,
          isLikelyToEngage: match.is_likely_to_engage,
          creditsUsed: 1,
        }));

        if (contactInserts.length > 0) {
          const batchStoredContacts = await db.insert(apolloContacts).values(contactInserts).returning();
          storedContacts.push(...batchStoredContacts);
          console.log(`[Apollo Enrich] Batch ${batchIndex + 1}: stored ${batchStoredContacts.length} contacts`);
        }
      } catch (error) {
        console.error(`[Apollo Enrich] Batch ${batchIndex + 1} failed:`, error);
      }
    }
    console.log(`[Apollo Enrich] Total stored: ${storedContacts.length} contacts`);
  } else {
    console.log(`[Apollo Enrich] No contacts to enrich for ${apolloCompany.name}`);
  }

  await db.update(apolloCompanies).set({ creditsUsed: totalCreditsUsed }).where(eq(apolloCompanies.id, insertedCompany.id));

  await db
    .update(apolloSettings)
    .set({
      creditsUsedThisMonth: sql`${apolloSettings.creditsUsedThisMonth} + ${totalCreditsUsed}`,
      updatedAt: new Date(),
    })
    .where(eq(apolloSettings.tenantId, options.tenantId));

  return {
    company: { ...insertedCompany, creditsUsed: totalCreditsUsed },
    contacts: storedContacts,
    creditsUsed: totalCreditsUsed,
  };
}

export async function getEnrichedCompanies(tenantId: string): Promise<(ApolloCompany & { contactCount: number })[]> {
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

  const companies = result.map((r) => ({ ...r.company, contactCount: Number(r.contactCount) || 0 }));
  console.log(`[Apollo Companies] Returning ${companies.length} enriched companies for tenant ${tenantId}`);
  companies.forEach((c) => console.log(`[Apollo Companies] ${c.name}: ${c.contactCount} contacts`));
  return companies;
}

export async function getContactsForCompany(companyId: string): Promise<ApolloContact[]> {
  return db.select().from(apolloContacts).where(eq(apolloContacts.companyId, companyId)).orderBy(apolloContacts.seniority);
}

export async function getContactsByLink(tenantId: string, googleSheetLink: string): Promise<ApolloContact[]> {
  return db
    .select()
    .from(apolloContacts)
    .where(and(eq(apolloContacts.tenantId, tenantId), eq(apolloContacts.googleSheetLink, googleSheetLink)))
    .orderBy(apolloContacts.seniority);
}

export async function isCompanyEnriched(tenantId: string, googleSheetLink: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(apolloCompanies)
    .where(and(eq(apolloCompanies.tenantId, tenantId), eq(apolloCompanies.googleSheetLink, googleSheetLink)));

  return (result[0]?.count || 0) > 0;
}

export async function bulkCheckEnrichmentStatus(
  tenantId: string,
  links: string[],
  projectId?: string,
): Promise<Record<string, string | null>> {
  if (links.length === 0) return {};

  console.log(`[Apollo Check] Checking ${links.length} links for tenant ${tenantId}`);

  const conditions = [
    eq(apolloCompanies.tenantId, tenantId),
    sql`${apolloCompanies.googleSheetLink} = ANY(${sql.raw(`ARRAY[${links.map((l) => `'${l.replace(/'/g, "''")}'`).join(",")}]`)})`,
  ];
  if (projectId) {
    conditions.push(eq(apolloCompanies.projectId, projectId));
  }

  const companies = await db
    .select({ link: apolloCompanies.googleSheetLink, status: apolloCompanies.enrichmentStatus })
    .from(apolloCompanies)
    .where(and(...conditions));

  console.log(`[Apollo Check] Found ${companies.length} matching companies in DB`);
  companies.forEach((c) => console.log(`[Apollo Check] DB match: ${c.link?.substring(0, 60)}... -> ${c.status}`));

  const statusMap = new Map(companies.map((r) => [r.link, r.status]));

  const result = links.reduce((acc, link) => {
    acc[link] = statusMap.get(link) || null;
    return acc;
  }, {} as Record<string, string | null>);

  const enrichedCount = Object.values(result).filter((s) => s === "enriched").length;
  const prescreenedCount = Object.values(result).filter((s) => s === "prescreened").length;
  const notFoundCount = Object.values(result).filter((s) => s === "not_found").length;
  const nullCount = Object.values(result).filter((s) => s === null).length;
  console.log(`[Apollo Check] Results: ${enrichedCount} enriched, ${prescreenedCount} prescreened, ${notFoundCount} not_found, ${nullCount} pending`);

  return result;
}
