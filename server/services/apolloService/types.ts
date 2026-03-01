import type { ApolloCompany, ApolloContact, ApolloSettings, InsertApolloContact } from "../../../shared/schema";

export const APOLLO_API_BASE = "https://api.apollo.io/api/v1";

export interface ApolloOrganization {
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

export interface ApolloPerson {
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

export interface OrganizationSearchResult {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface PeopleSearchResult {
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

export interface PeopleEnrichmentResult {
  status: string;
  matches: (ApolloPerson | null)[];
  credits_consumed: number;
  total_requested_enrichments: number;
  unique_enriched_records: number;
  missing_records: number;
}

export interface OrganizationEnrichResult {
  organization: ApolloOrganization | null;
}

export type { ApolloCompany, ApolloContact, ApolloSettings, InsertApolloContact };
