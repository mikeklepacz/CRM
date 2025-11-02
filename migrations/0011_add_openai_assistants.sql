-- Migration 0011: Add OpenAI Assistants infrastructure
-- Supports multiple assistants with separate instructions and knowledge bases

-- OpenAI Assistants table
CREATE TABLE IF NOT EXISTS openai_assistants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  assistant_id VARCHAR,
  vector_store_id VARCHAR,
  instructions TEXT NOT NULL,
  model VARCHAR(50) DEFAULT 'gpt-4o',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_openai_assistants_slug ON openai_assistants(slug);
CREATE INDEX IF NOT EXISTS idx_openai_assistants_active ON openai_assistants(is_active);

-- OpenAI Assistant Files table - Links files to specific assistants
CREATE TABLE IF NOT EXISTS openai_assistant_files (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id VARCHAR NOT NULL REFERENCES openai_assistants(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  openai_file_id VARCHAR,
  file_size INTEGER,
  uploaded_by VARCHAR REFERENCES users(id),
  category VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_files_assistant ON openai_assistant_files(assistant_id);

-- Insert default assistants
INSERT INTO openai_assistants (name, slug, description, instructions, model)
VALUES 
  (
    'Sales Assistant',
    'sales-assistant',
    'AI assistant for helping sales agents with conversations, scripts, and objection handling',
    'You are a helpful sales assistant for a hemp wick sales team. You help agents with sales scripts, handling objections, and providing product information. Be concise, professional, and focused on helping close deals.',
    'gpt-4o'
  ),
  (
    'Aligner',
    'aligner',
    'AI assistant that analyzes call performance data and proposes knowledge base improvements',
    'You are the Aligner - an AI system that analyzes sales call data and coaching feedback to propose improvements to the knowledge base. Your job is to:

1. Review AI Insights data including common objections, success patterns, and sentiment analysis
2. Analyze existing knowledge base documents
3. Identify gaps, outdated information, or areas for improvement
4. Propose specific, actionable changes to knowledge base files
5. Provide clear rationale for each proposed change

Be analytical, data-driven, and focused on continuous improvement. Propose changes that will help sales agents handle objections better and close more deals.',
    'gpt-4o'
  )
ON CONFLICT (slug) DO NOTHING;
