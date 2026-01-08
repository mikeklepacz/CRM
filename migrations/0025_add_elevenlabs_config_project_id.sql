-- Add projectId column to elevenlabs_config for project-scoped configuration
-- NULL projectId means tenant-wide default, non-null means project-specific config

ALTER TABLE elevenlabs_config 
ADD COLUMN project_id VARCHAR REFERENCES tenant_projects(id) ON DELETE SET NULL;

-- Create index for efficient lookups by tenant + project
CREATE INDEX IF NOT EXISTS idx_elevenlabs_config_tenant_project 
ON elevenlabs_config(tenant_id, project_id);
