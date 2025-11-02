-- Add analysis_jobs table for tracking sequential call analysis progress
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'wick_coach', 'aligner', 'both'
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  agent_id VARCHAR, -- Optional filter: which ElevenLabs agent
  total_calls INTEGER NOT NULL,
  current_call_index INTEGER DEFAULT 0, -- Track progress through calls
  proposals_created INTEGER DEFAULT 0,
  insight_id VARCHAR REFERENCES ai_insights(id),
  triggered_by VARCHAR NOT NULL, -- 'manual' or 'auto_trigger'
  started_by VARCHAR, -- User ID if manual
  error_message TEXT, -- If failed
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_agent ON analysis_jobs(agent_id);
