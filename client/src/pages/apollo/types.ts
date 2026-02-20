export interface ApolloSettings {
  id: string;
  tenantId: string;
  targetTitles: string[] | null;
  targetSeniorities: string[] | null;
  maxContactsPerCompany: number | null;
  autoEnrichOnAdd: boolean | null;
  creditsUsedThisMonth: number | null;
  creditsResetDate: string | null;
}

export interface ApolloCompany {
  id: string;
  tenantId: string;
  googleSheetLink: string;
  apolloOrgId: string | null;
  domain: string | null;
  name: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  employeeCount: number | null;
  industry: string | null;
  foundedYear: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  logoUrl: string | null;
  enrichedAt: string;
  creditsUsed: number | null;
  contactCount?: number;
  enrichmentStatus?: string | null;
}

export interface ApolloContact {
  id: string;
  tenantId: string;
  companyId: string | null;
  googleSheetLink: string;
  apolloPersonId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  emailStatus: string | null;
  title: string | null;
  seniority: string | null;
  department: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  photoUrl: string | null;
  headline: string | null;
  isLikelyToEngage: boolean | null;
  enrichedAt: string;
  creditsUsed: number | null;
}

export interface PreviewResult {
  company: {
    id: string;
    name: string;
    primary_domain?: string;
    website_url?: string;
    estimated_num_employees?: number;
    industry?: string;
    industries?: string[];
    keywords?: string[];
    short_description?: string;
    city?: string;
    state?: string;
    country?: string;
    linkedin_url?: string;
    logo_url?: string;
  } | null;
  contacts: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    seniority?: string;
    has_email?: boolean;
    linkedin_url?: string;
    email_status?: string;
    phone_numbers?: Array<{ sanitized_number?: string }>;
  }>;
  totalContacts: number;
}

export interface StoreContact {
  name: string;
  email: string;
  state: string;
  link: string;
  website: string;
}

export interface BulkPreviewItem {
  contact: StoreContact;
  preview: PreviewResult | null;
  error?: string;
}

