import { makeApolloGetRequest, makeApolloRequest } from "./api";
import {
  ApolloOrganization,
  OrganizationEnrichResult,
  OrganizationSearchResult,
  PeopleEnrichmentResult,
  PeopleSearchResult,
} from "./types";

export async function enrichOrganization(options: { domain?: string; organizationId?: string }): Promise<ApolloOrganization | null> {
  const params: Record<string, string> = {};

  if (options.domain) {
    params.domain = options.domain;
  }
  if (options.organizationId) {
    params.organization_id = options.organizationId;
  }

  if (Object.keys(params).length === 0) {
    throw new Error("Either domain or organizationId is required for organization enrichment");
  }

  try {
    const result = await makeApolloGetRequest<OrganizationEnrichResult>("/organizations/enrich", params);
    return result.organization || null;
  } catch (error) {
    console.error("[Apollo API] Organization enrichment failed:", error);
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

  return makeApolloRequest<OrganizationSearchResult>("/mixed_companies/search", body);
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

  const result = await makeApolloRequest<PeopleSearchResult>("/mixed_people/api_search", body);

  if (result.contacts && result.contacts.length > 0) {
    console.log(`[Apollo API] Found ${result.contacts.length} contacts with full data (including linkedin_url)`);

    const contactIds = new Set(result.contacts.map((c) => c.id));
    const additionalPeople = (result.people || []).filter((p) => !contactIds.has(p.id));

    result.people = [...result.contacts, ...additionalPeople];

    console.log(`[Apollo API] Merged result: ${result.people.length} total people`);
  }

  return result;
}

export async function enrichPeople(
  details: Array<{
    id?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
    organization_name?: string;
    domain?: string;
    linkedin_url?: string;
  }>,
): Promise<PeopleEnrichmentResult> {
  if (details.length === 0) {
    throw new Error("At least one person detail is required");
  }

  if (details.length > 10) {
    throw new Error("Maximum 10 people per bulk enrichment request");
  }

  return makeApolloRequest<PeopleEnrichmentResult>("/people/bulk_match", {
    details,
    reveal_personal_emails: false,
    reveal_phone_number: false,
  });
}
