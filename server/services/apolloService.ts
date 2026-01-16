import { db } from '../db';
import { apolloCompanies, apolloContacts, apolloSettings } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ApolloCompany, ApolloContact, ApolloSettings, InsertApolloCompany, InsertApolloContact } from '../../shared/schema';

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1';

interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  primary_phone?: { number?: string };
  phone?: string;
  founded_year?: number;
  logo_url?: string;
  primary_domain?: string;
  industry?: string;
  industries?: string[];
  keywords?: string[];
  short_description?: string;
  estimated_num_employees?: number;
  city?: string;
  state?: string;
  country?: string;
  raw_address?: string;
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
  title?: string;
  seniority?: string;
  departments?: string[];
  linkedin_url?: string;
  photo_url?: string;
  headline?: string;
  city?: string;
  state?: string;
  country?: string;
  is_likely_to_engage?: boolean;
  organization?: ApolloOrganization;
  has_email?: boolean;
  has_direct_phone?: string;
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    type?: string;
    status?: string;
  }>;
}

interface OrganizationSearchResult {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface PeopleSearchResult {
  people: ApolloPerson[];
  contacts?: ApolloPerson[];
  total_entries: number;
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface PeopleEnrichmentResult {
  status: string;
  matches: (ApolloPerson | null)[];
  credits_consumed: number;
  total_requested_enrichments: number;
  unique_enriched_records: number;
  missing_records: number;
}

function getApiKey(): string {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY environment variable is not set');
  }
  return apiKey;
}

async function makeApolloRequest<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  const apiKey = getApiKey();
  
  console.log(`[Apollo API] Request to ${endpoint}`);
  console.log(`[Apollo API] Request body:`, JSON.stringify(body, null, 2));
  
  const response = await fetch(`${APOLLO_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Apollo API] Error response (${response.status}):`, errorText);
    throw new Error(`Apollo API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Apollo API] Response from ${endpoint}:`, JSON.stringify(result, null, 2).substring(0, 2000));
  return result as T;
}

async function makeApolloGetRequest<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey();
  
  const queryString = new URLSearchParams(params).toString();
  const url = `${APOLLO_API_BASE}${endpoint}?${queryString}`;
  
  console.log(`[Apollo API] GET Request to ${endpoint}`);
  console.log(`[Apollo API] Query params:`, JSON.stringify(params, null, 2));
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Apollo API] Error response (${response.status}):`, errorText);
    throw new Error(`Apollo API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Apollo API] Response from ${endpoint}:`, JSON.stringify(result, null, 2).substring(0, 2000));
  return result as T;
}

interface OrganizationEnrichResult {
  organization: ApolloOrganization | null;
}

export async function enrichOrganization(options: {
  domain?: string;
  organizationId?: string;
}): Promise<ApolloOrganization | null> {
  const params: Record<string, string> = {};
  
  if (options.domain) {
    params.domain = options.domain;
  }
  if (options.organizationId) {
    params.organization_id = options.organizationId;
  }
  
  if (Object.keys(params).length === 0) {
    throw new Error('Either domain or organizationId is required for organization enrichment');
  }
  
  try {
    const result = await makeApolloGetRequest<OrganizationEnrichResult>('/organizations/enrich', params);
    return result.organization || null;
  } catch (error) {
    console.error('[Apollo API] Organization enrichment failed:', error);
    return null;
  }
}

export async function searchOrganizations(options: {
  domains?: string[];
  name?: string;
  locations?: string[];
  employeeRanges?: string[];
  page?: number;
  perPage?: number;
}): Promise<OrganizationSearchResult> {
  const body: Record<string, any> = {
    page: options.page || 1,
    per_page: options.perPage || 10,
  };

  if (options.domains && options.domains.length > 0) {
    body.q_organization_domains_list = options.domains;
  }

  if (options.name) {
    body.q_organization_name = options.name;
  }

  if (options.locations && options.locations.length > 0) {
    body.organization_locations = options.locations;
  }

  if (options.employeeRanges && options.employeeRanges.length > 0) {
    body.organization_num_employees_ranges = options.employeeRanges;
  }

  return makeApolloRequest<OrganizationSearchResult>('/mixed_companies/search', body);
}

export async function searchPeople(options: {
  organizationDomains?: string[];
  organizationIds?: string[];
  titles?: string[];
  seniorities?: string[];
  locations?: string[];
  emailStatus?: string[];
  page?: number;
  perPage?: number;
}): Promise<PeopleSearchResult> {
  const body: Record<string, any> = {
    page: options.page || 1,
    per_page: options.perPage || 10,
  };

  if (options.organizationDomains && options.organizationDomains.length > 0) {
    body.q_organization_domains_list = options.organizationDomains;
  }

  if (options.organizationIds && options.organizationIds.length > 0) {
    body.organization_ids = options.organizationIds;
  }

  if (options.titles && options.titles.length > 0) {
    body.person_titles = options.titles;
  }

  if (options.seniorities && options.seniorities.length > 0) {
    body.person_seniorities = options.seniorities;
  }

  if (options.locations && options.locations.length > 0) {
    body.person_locations = options.locations;
  }

  if (options.emailStatus && options.emailStatus.length > 0) {
    body.contact_email_status = options.emailStatus;
  }

  const result = await makeApolloRequest<PeopleSearchResult>('/mixed_people/api_search', body);
  
  // Apollo returns both 'contacts' (with full data including linkedin_url) and 'people' (limited data)
  // Merge them, preferring contacts data when available since it includes LinkedIn URLs
  if (result.contacts && result.contacts.length > 0) {
    console.log(`[Apollo API] Found ${result.contacts.length} contacts with full data (including linkedin_url)`);
    
    // Create a map of contact IDs for quick lookup
    const contactIds = new Set(result.contacts.map(c => c.id));
    
    // Add any people entries that don't exist in contacts
    const additionalPeople = (result.people || []).filter(p => !contactIds.has(p.id));
    
    // Merge: contacts first (they have linkedin_url), then additional people
    result.people = [...result.contacts, ...additionalPeople];
    
    console.log(`[Apollo API] Merged result: ${result.people.length} total people`);
  }
  
  return result;
}

export async function enrichPeople(details: Array<{
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  organization_name?: string;
  domain?: string;
  linkedin_url?: string;
}>): Promise<PeopleEnrichmentResult> {
  if (details.length === 0) {
    throw new Error('At least one person detail is required');
  }

  if (details.length > 10) {
    throw new Error('Maximum 10 people per bulk enrichment request');
  }

  return makeApolloRequest<PeopleEnrichmentResult>('/people/bulk_match', {
    details,
    reveal_personal_emails: false,
    reveal_phone_number: false,
  });
}

export async function previewContactsForCompany(options: {
  domain?: string;
  companyName?: string;
  tenantId: string;
}): Promise<{
  company: ApolloOrganization | null;
  contacts: ApolloPerson[];
  totalContacts: number;
}> {
  console.log(`[Apollo Preview] Starting preview with options:`, JSON.stringify(options, null, 2));
  
  let company: ApolloOrganization | null = null;
  
  const settings = await getOrCreateSettings(options.tenantId);
  console.log(`[Apollo Preview] Settings:`, JSON.stringify({ targetSeniorities: settings.targetSeniorities, targetTitles: settings.targetTitles, maxContactsPerCompany: settings.maxContactsPerCompany }, null, 2));
  
  if (options.domain) {
    console.log(`[Apollo Preview] Enriching by domain: ${options.domain}`);
    company = await enrichOrganization({ domain: options.domain });
    console.log(`[Apollo Preview] Organization enrichment by domain found: ${company?.name || 'none'}`);
    
    if (!company) {
      console.log(`[Apollo Preview] Enrichment failed, falling back to search by domain: ${options.domain}`);
      const orgResult = await searchOrganizations({
        domains: [options.domain],
        perPage: 1,
      });
      console.log(`[Apollo Preview] Organization search by domain found ${orgResult.organizations?.length || 0} orgs`);
      company = orgResult.organizations[0] || null;
    }
  } else if (options.companyName) {
    console.log(`[Apollo Preview] Searching by company name: ${options.companyName}`);
    const orgResult = await searchOrganizations({
      name: options.companyName,
      perPage: 1,
    });
    console.log(`[Apollo Preview] Organization search by name found ${orgResult.organizations?.length || 0} orgs`);
    const searchedCompany = orgResult.organizations[0] || null;
    
    if (searchedCompany?.primary_domain) {
      console.log(`[Apollo Preview] Enriching found company by domain: ${searchedCompany.primary_domain}`);
      company = await enrichOrganization({ domain: searchedCompany.primary_domain });
    } else if (searchedCompany?.id) {
      console.log(`[Apollo Preview] Enriching found company by id: ${searchedCompany.id}`);
      company = await enrichOrganization({ organizationId: searchedCompany.id });
    }
    
    if (!company) {
      company = searchedCompany;
    }
  } else {
    console.log(`[Apollo Preview] No domain or companyName provided!`);
  }

  if (!company) {
    console.log(`[Apollo Preview] No company found, returning empty result`);
    return { company: null, contacts: [], totalContacts: 0 };
  }

  console.log(`[Apollo Preview] Found company: ${company.name} (id: ${company.id}, domain: ${company.primary_domain})`);
  console.log(`[Apollo Preview] Company details - employees: ${company.estimated_num_employees}, industry: ${company.industry}, keywords: ${company.keywords?.length || 0}`);

  const peopleResult = await searchPeople({
    organizationDomains: company.primary_domain ? [company.primary_domain] : undefined,
    organizationIds: [company.id],
    seniorities: settings.targetSeniorities || undefined,
    titles: settings.targetTitles || undefined,
    perPage: settings.maxContactsPerCompany || 3,
  });

  console.log(`[Apollo Preview] People search found ${peopleResult.people?.length || 0} contacts (total: ${peopleResult.total_entries || 0})`);

  return {
    company,
    contacts: peopleResult.people || [],
    totalContacts: peopleResult.total_entries || 0,
  };
}

export async function enrichAndStoreCompany(options: {
  tenantId: string;
  projectId?: string;
  googleSheetLink: string;
  domain?: string;
  companyName?: string;
  selectedPersonIds?: string[];
}): Promise<{
  company: ApolloCompany | null;
  contacts: ApolloContact[];
  creditsUsed: number;
}> {
  const existingCompany = await db
    .select()
    .from(apolloCompanies)
    .where(
      and(
        eq(apolloCompanies.tenantId, options.tenantId),
        eq(apolloCompanies.googleSheetLink, options.googleSheetLink)
      )
    )
    .limit(1);

  if (existingCompany.length > 0) {
    const existingContacts = await db
      .select()
      .from(apolloContacts)
      .where(eq(apolloContacts.companyId, existingCompany[0].id));
    
    // If company exists but has no contacts and was previously enriched/prescreened, delete it to allow retry
    const canRetry = existingContacts.length === 0 && 
      (existingCompany[0].enrichmentStatus === 'enriched' || existingCompany[0].enrichmentStatus === 'prescreened');
    if (canRetry) {
      console.log(`[Apollo Enrich] Company ${existingCompany[0].name} (status: ${existingCompany[0].enrichmentStatus}) has 0 contacts, deleting for retry`);
      await db.delete(apolloCompanies).where(eq(apolloCompanies.id, existingCompany[0].id));
      // Continue to re-enrich below
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
    tenantId: options.tenantId,
  });

  if (!preview.company) {
    // Mark as not found so we don't try again
    await db.insert(apolloCompanies).values({
      tenantId: options.tenantId,
      googleSheetLink: options.googleSheetLink,
      enrichmentStatus: 'not_found',
      creditsUsed: 0,
    }).onConflictDoNothing();
    return { company: null, contacts: [], creditsUsed: 0 };
  }

  const apolloCompany = preview.company;
  
  const [insertedCompany] = await db.insert(apolloCompanies).values({
    tenantId: options.tenantId,
    googleSheetLink: options.googleSheetLink,
    apolloOrgId: apolloCompany.id,
    domain: apolloCompany.primary_domain,
    name: apolloCompany.name,
    phone: apolloCompany.phone || apolloCompany.primary_phone?.number,
    linkedinUrl: apolloCompany.linkedin_url,
    twitterUrl: apolloCompany.twitter_url,
    facebookUrl: apolloCompany.facebook_url,
    websiteUrl: apolloCompany.website_url,
    employeeCount: apolloCompany.estimated_num_employees,
    industry: apolloCompany.industry,
    foundedYear: apolloCompany.founded_year,
    city: apolloCompany.city,
    state: apolloCompany.state,
    country: apolloCompany.country,
    logoUrl: apolloCompany.logo_url,
    enrichmentStatus: 'enriched',
    creditsUsed: 1,
  }).returning();

  let contactsToEnrich = preview.contacts.filter(p => p.first_name);
  console.log(`[Apollo Enrich] Preview has ${preview.contacts.length} contacts, ${contactsToEnrich.length} have first names`);
  
  if (options.selectedPersonIds && options.selectedPersonIds.length > 0) {
    contactsToEnrich = contactsToEnrich.filter(p => options.selectedPersonIds!.includes(p.id));
    console.log(`[Apollo Enrich] After selectedPersonIds filter: ${contactsToEnrich.length}`);
  }
  let storedContacts: ApolloContact[] = [];
  let totalCreditsUsed = 1;

  if (contactsToEnrich.length > 0) {
    // Batch contacts into groups of 10 (Apollo API limit)
    const BATCH_SIZE = 10;
    const batches: typeof contactsToEnrich[] = [];
    for (let i = 0; i < contactsToEnrich.length; i += BATCH_SIZE) {
      batches.push(contactsToEnrich.slice(i, i + BATCH_SIZE));
    }
    console.log(`[Apollo Enrich] Enriching ${contactsToEnrich.length} people in ${batches.length} batch(es) for ${apolloCompany.name}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const enrichDetails = batch.map(p => ({
        id: p.id, // Pass Apollo person ID for reliable matching
        first_name: p.first_name,
        last_name: p.last_name || undefined,
        domain: apolloCompany.primary_domain,
        organization_name: apolloCompany.name,
      }));
      console.log(`[Apollo Enrich] Batch ${batchIndex + 1}/${batches.length}: enriching ${enrichDetails.length} people`);

      try {
        const enrichResult = await enrichPeople(enrichDetails);
        console.log(`[Apollo Enrich] Batch ${batchIndex + 1} result: ${enrichResult.matches?.length || 0} matches, ${enrichResult.credits_consumed} credits`);
        totalCreditsUsed += enrichResult.credits_consumed;

        // Filter out null matches (Apollo returns null for unmatched people)
        const rawMatches = enrichResult.matches || [];
        const validMatches = rawMatches.filter((match): match is ApolloPerson => match !== null);
        const nullCount = rawMatches.length - validMatches.length;
        console.log(`[Apollo Enrich] Batch ${batchIndex + 1}: ${validMatches.length} valid matches, ${nullCount} null/unmatched`);
        
        if (validMatches.length === 0 && rawMatches.length > 0) {
          console.warn(`[Apollo Enrich] Batch ${batchIndex + 1}: All ${rawMatches.length} matches were null - Apollo couldn't find these people`);
        }

        const contactInserts: InsertApolloContact[] = validMatches.map(match => ({
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

  await db.update(apolloCompanies)
    .set({ creditsUsed: totalCreditsUsed })
    .where(eq(apolloCompanies.id, insertedCompany.id));

  await db.update(apolloSettings)
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
      contactCount: sql<number>`(SELECT COUNT(*) FROM ${apolloContacts} WHERE ${apolloContacts.companyId} = ${apolloCompanies.id})`.as('contact_count'),
    })
    .from(apolloCompanies)
    .where(
      and(
        eq(apolloCompanies.tenantId, tenantId),
        eq(apolloCompanies.enrichmentStatus, 'enriched')
      )
    )
    .orderBy(apolloCompanies.enrichedAt);
  
  return result.map(r => ({ ...r.company, contactCount: Number(r.contactCount) || 0 }));
}

export async function getContactsForCompany(companyId: string): Promise<ApolloContact[]> {
  return db
    .select()
    .from(apolloContacts)
    .where(eq(apolloContacts.companyId, companyId))
    .orderBy(apolloContacts.seniority);
}

export async function getContactsByLink(tenantId: string, googleSheetLink: string): Promise<ApolloContact[]> {
  return db
    .select()
    .from(apolloContacts)
    .where(
      and(
        eq(apolloContacts.tenantId, tenantId),
        eq(apolloContacts.googleSheetLink, googleSheetLink)
      )
    )
    .orderBy(apolloContacts.seniority);
}

export async function getOrCreateSettings(tenantId: string): Promise<ApolloSettings> {
  const existing = await db
    .select()
    .from(apolloSettings)
    .where(eq(apolloSettings.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db.insert(apolloSettings).values({
    tenantId,
  }).returning();

  return created;
}

export async function updateSettings(tenantId: string, updates: Partial<{
  targetTitles: string[];
  targetSeniorities: string[];
  maxContactsPerCompany: number;
  autoEnrichOnAdd: boolean;
}>): Promise<ApolloSettings> {
  const [updated] = await db.update(apolloSettings)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(apolloSettings.tenantId, tenantId))
    .returning();

  return updated;
}

export async function isCompanyEnriched(tenantId: string, googleSheetLink: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(apolloCompanies)
    .where(
      and(
        eq(apolloCompanies.tenantId, tenantId),
        eq(apolloCompanies.googleSheetLink, googleSheetLink)
      )
    );
  
  return (result[0]?.count || 0) > 0;
}

export async function bulkCheckEnrichmentStatus(tenantId: string, links: string[]): Promise<Record<string, string | null>> {
  if (links.length === 0) return {};

  const companies = await db
    .select({ link: apolloCompanies.googleSheetLink, status: apolloCompanies.enrichmentStatus })
    .from(apolloCompanies)
    .where(
      and(
        eq(apolloCompanies.tenantId, tenantId),
        sql`${apolloCompanies.googleSheetLink} = ANY(${sql.raw(`ARRAY[${links.map(l => `'${l.replace(/'/g, "''")}'`).join(',')}]`)})`
      )
    );

  const statusMap = new Map(companies.map(r => [r.link, r.status]));
  
  return links.reduce((acc, link) => {
    acc[link] = statusMap.get(link) || null;
    return acc;
  }, {} as Record<string, string | null>);
}

export async function getNotFoundCompanies(tenantId: string): Promise<ApolloCompany[]> {
  return db
    .select()
    .from(apolloCompanies)
    .where(
      and(
        eq(apolloCompanies.tenantId, tenantId),
        eq(apolloCompanies.enrichmentStatus, 'not_found')
      )
    )
    .orderBy(apolloCompanies.enrichedAt);
}

export async function markCompanyNotFound(
  tenantId: string,
  googleSheetLink: string,
  domain?: string,
  name?: string
): Promise<ApolloCompany> {
  const [company] = await db.insert(apolloCompanies).values({
    tenantId,
    googleSheetLink,
    domain: domain || null,
    name: name || null,
    enrichmentStatus: 'not_found',
    creditsUsed: 0,
  }).onConflictDoNothing().returning();

  return company;
}

export async function markCompanyPrescreened(
  tenantId: string,
  googleSheetLink: string,
  apolloOrgId: string,
  domain?: string,
  name?: string,
  contactCount?: number
): Promise<ApolloCompany> {
  const [company] = await db.insert(apolloCompanies).values({
    tenantId,
    googleSheetLink,
    apolloOrgId,
    domain: domain || null,
    name: name || null,
    enrichmentStatus: 'prescreened',
    creditsUsed: 0,
  }).onConflictDoNothing().returning();

  return company;
}

export async function getPrescreenedCompanies(tenantId: string): Promise<ApolloCompany[]> {
  return db
    .select()
    .from(apolloCompanies)
    .where(
      and(
        eq(apolloCompanies.tenantId, tenantId),
        eq(apolloCompanies.enrichmentStatus, 'prescreened')
      )
    )
    .orderBy(apolloCompanies.enrichedAt);
}

