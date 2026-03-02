CREATE TABLE IF NOT EXISTS apollo_candidates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES tenant_projects(id) ON DELETE CASCADE,
  canonical_key VARCHAR(500) NOT NULL,
  clean_company_name VARCHAR(500) NOT NULL,
  domain VARCHAR(255),
  representative_link VARCHAR NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  last_checked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apollo_candidates_unique_key
  ON apollo_candidates(tenant_id, project_id, canonical_key);
CREATE INDEX IF NOT EXISTS idx_apollo_candidates_tenant_project
  ON apollo_candidates(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_apollo_candidates_status
  ON apollo_candidates(tenant_id, project_id, status);

CREATE TABLE IF NOT EXISTS apollo_candidate_sources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES tenant_projects(id) ON DELETE CASCADE,
  candidate_id VARCHAR NOT NULL REFERENCES apollo_candidates(id) ON DELETE CASCADE,
  source_link VARCHAR NOT NULL,
  raw_name VARCHAR(500),
  raw_website VARCHAR(500),
  state VARCHAR(100),
  category VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apollo_candidate_sources_unique_link
  ON apollo_candidate_sources(tenant_id, project_id, source_link);
CREATE INDEX IF NOT EXISTS idx_apollo_candidate_sources_candidate
  ON apollo_candidate_sources(candidate_id);
