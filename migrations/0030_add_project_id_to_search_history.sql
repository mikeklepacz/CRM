ALTER TABLE search_history
ADD COLUMN IF NOT EXISTS project_id VARCHAR REFERENCES tenant_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_search_history_tenant_project
  ON search_history(tenant_id, project_id, searched_at DESC);
