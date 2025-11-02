-- Migration 0010: Add Knowledge Base Management Tables
-- Self-evolving KB system with filename immutability and version tracking

-- KB Files table - Tracks all knowledge base files from ElevenLabs
CREATE TABLE IF NOT EXISTS kb_files (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  elevenlabs_doc_id VARCHAR UNIQUE,
  filename VARCHAR(255) NOT NULL UNIQUE,
  current_content TEXT,
  current_sync_version VARCHAR,
  locked BOOLEAN DEFAULT FALSE,
  file_type VARCHAR(50) DEFAULT 'file',
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_files_filename ON kb_files(filename);
CREATE INDEX IF NOT EXISTS idx_kb_files_locked_synced ON kb_files(locked, last_synced_at);

-- KB File Versions table - Complete version history
CREATE TABLE IF NOT EXISTS kb_file_versions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_file_id VARCHAR NOT NULL REFERENCES kb_files(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(kb_file_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_kb_versions_file_id ON kb_file_versions(kb_file_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_versions_number ON kb_file_versions(kb_file_id, version_number);

-- KB Change Proposals table - Aligner's pending proposals
CREATE TABLE IF NOT EXISTS kb_change_proposals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_file_id VARCHAR NOT NULL REFERENCES kb_files(id) ON DELETE RESTRICT,
  base_version_id VARCHAR NOT NULL REFERENCES kb_file_versions(id) ON DELETE RESTRICT,
  proposed_content TEXT NOT NULL,
  rationale TEXT,
  ai_insight_id VARCHAR REFERENCES ai_insights(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  applied_version_id VARCHAR REFERENCES kb_file_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_kb_proposals_status ON kb_change_proposals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_kb_proposals_file_status ON kb_change_proposals(kb_file_id, status);

-- Trigger to prevent filename changes (enforce immutability)
CREATE OR REPLACE FUNCTION prevent_filename_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.filename IS DISTINCT FROM NEW.filename THEN
    RAISE EXCEPTION 'Cannot modify filename - filenames are immutable to protect workflow node references';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_filename_immutability
  BEFORE UPDATE ON kb_files
  FOR EACH ROW
  EXECUTE FUNCTION prevent_filename_update();
