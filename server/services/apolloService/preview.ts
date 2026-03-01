import { getOrCreateSettings } from "./settings";
import { enrichOrganization, searchOrganizations, searchPeople } from "./search";
import { ApolloOrganization, ApolloPerson } from "./types";

export async function previewContactsForCompany(options: {
  domain?: string;
  companyName?: string;
  organizationId?: string;
  tenantId: string;
}): Promise<{ company: ApolloOrganization | null; contacts: ApolloPerson[]; totalContacts: number }> {
  console.log(`[Apollo Preview] Starting preview with options:`, JSON.stringify(options, null, 2));

  let company: ApolloOrganization | null = null;

  const settings = await getOrCreateSettings(options.tenantId);
  console.log(
    `[Apollo Preview] Settings:`,
    JSON.stringify(
      {
        targetSeniorities: settings.targetSeniorities,
        targetTitles: settings.targetTitles,
        maxContactsPerCompany: settings.maxContactsPerCompany,
      },
      null,
      2,
    ),
  );

  if (options.organizationId) {
    console.log(`[Apollo Preview] Enriching by organizationId: ${options.organizationId}`);
    company = await enrichOrganization({ organizationId: options.organizationId });
    console.log(`[Apollo Preview] Organization enrichment by ID found: ${company?.name || "none"}`);
  } else if (options.domain) {
    console.log(`[Apollo Preview] Enriching by domain: ${options.domain}`);
    company = await enrichOrganization({ domain: options.domain });
    console.log(`[Apollo Preview] Organization enrichment by domain found: ${company?.name || "none"}`);

    if (!company) {
      console.log(`[Apollo Preview] Enrichment failed, falling back to search by domain: ${options.domain}`);
      const orgResult = await searchOrganizations({ domains: [options.domain], perPage: 1 });
      console.log(`[Apollo Preview] Organization search by domain found ${orgResult.organizations?.length || 0} orgs`);
      company = orgResult.organizations[0] || null;
    }
  } else if (options.companyName) {
    console.log(`[Apollo Preview] Searching by company name: ${options.companyName}`);
    const nameCandidates = [options.companyName, options.companyName.split(/\s[-|,]\s/)[0]]
      .map((n) => n.trim())
      .filter((n, idx, arr) => n.length > 0 && arr.indexOf(n) === idx);

    for (const candidate of nameCandidates) {
      const orgResult = await searchOrganizations({ name: candidate, perPage: 1 });
      console.log(`[Apollo Preview] Organization search by name "${candidate}" found ${orgResult.organizations?.length || 0} orgs`);
      const searchedCompany = orgResult.organizations[0] || null;
      if (!searchedCompany) continue;

      if (searchedCompany.primary_domain) {
        console.log(`[Apollo Preview] Enriching found company by domain: ${searchedCompany.primary_domain}`);
        company = await enrichOrganization({ domain: searchedCompany.primary_domain });
      } else if (searchedCompany.id) {
        console.log(`[Apollo Preview] Enriching found company by id: ${searchedCompany.id}`);
        company = await enrichOrganization({ organizationId: searchedCompany.id });
      }

      if (!company) {
        company = searchedCompany;
      }
      if (company) break;
    }
  } else {
    console.log(`[Apollo Preview] No domain or companyName provided!`);
  }

  if (!company) {
    console.log(`[Apollo Preview] No company found, returning empty result`);
    return { company: null, contacts: [], totalContacts: 0 };
  }

  console.log(`[Apollo Preview] Found company: ${company.name} (id: ${company.id}, domain: ${company.primary_domain})`);
  console.log(
    `[Apollo Preview] Company details - employees: ${company.estimated_num_employees}, industry: ${company.industry}, keywords: ${company.keywords?.length || 0}`,
  );

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
