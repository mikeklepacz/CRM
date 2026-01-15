-- Apollo Integration Tables for enriching leads with Apollo.io data

-- Apollo Companies - Enriched company data from Apollo
CREATE TABLE IF NOT EXISTS apollo_companies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  google_sheet_link VARCHAR NOT NULL,
  apollo_org_id VARCHAR,
  domain VARCHAR(255),
  name VARCHAR(500),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  twitter_url VARCHAR(500),
  facebook_url VARCHAR(500),
  website_url VARCHAR(500),
  employee_count INTEGER,
  industry VARCHAR(255),
  founded_year INTEGER,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  logo_url VARCHAR(500),
  enriched_at TIMESTAMP DEFAULT NOW(),
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apollo_companies_tenant ON apollo_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apollo_companies_link ON apollo_companies(tenant_id, google_sheet_link);
CREATE INDEX IF NOT EXISTS idx_apollo_companies_domain ON apollo_companies(tenant_id, domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apollo_companies_tenant_link ON apollo_companies(tenant_id, google_sheet_link);

-- Apollo Contacts - Individual contacts enriched from Apollo
CREATE TABLE IF NOT EXISTS apollo_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id VARCHAR REFERENCES apollo_companies(id) ON DELETE CASCADE,
  google_sheet_link VARCHAR NOT NULL,
  apollo_person_id VARCHAR,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  email_status VARCHAR(50),
  title VARCHAR(255),
  seniority VARCHAR(50),
  department VARCHAR(100),
  phone VARCHAR(50),
  linkedin_url VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  photo_url VARCHAR(500),
  headline VARCHAR(500),
  is_likely_to_engage BOOLEAN DEFAULT FALSE,
  enriched_at TIMESTAMP DEFAULT NOW(),
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apollo_contacts_tenant ON apollo_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_company ON apollo_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_link ON apollo_contacts(tenant_id, google_sheet_link);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_email ON apollo_contacts(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_seniority ON apollo_contacts(tenant_id, seniority);

-- Apollo Settings - Per-tenant configuration for Apollo enrichment
CREATE TABLE IF NOT EXISTS apollo_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  target_titles TEXT[] DEFAULT ARRAY['Owner', 'Manager', 'Director', 'Buyer']::text[],
  target_seniorities TEXT[] DEFAULT ARRAY['owner', 'founder', 'director', 'manager']::text[],
  max_contacts_per_company INTEGER DEFAULT 3,
  auto_enrich_on_add BOOLEAN DEFAULT FALSE,
  credits_used_this_month INTEGER DEFAULT 0,
  credits_reset_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
