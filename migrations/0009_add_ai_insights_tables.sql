-- Create AI insights history tracking tables

CREATE TABLE IF NOT EXISTS ai_insights (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzed_at TIMESTAMP DEFAULT NOW(),
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP,
  agent_id VARCHAR,
  call_count INTEGER NOT NULL,
  sentiment_positive INTEGER,
  sentiment_neutral INTEGER,
  sentiment_negative INTEGER,
  sentiment_trends_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_analyzed_at ON ai_insights(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_agent ON ai_insights(agent_id);

CREATE TABLE IF NOT EXISTS ai_insight_objections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id VARCHAR NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  objection TEXT NOT NULL,
  frequency INTEGER NOT NULL,
  example_conversations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objections_insight ON ai_insight_objections(insight_id);

CREATE TABLE IF NOT EXISTS ai_insight_patterns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id VARCHAR NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  frequency INTEGER NOT NULL,
  example_conversations JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patterns_insight ON ai_insight_patterns(insight_id);

CREATE TABLE IF NOT EXISTS ai_insight_recommendations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id VARCHAR NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_insight ON ai_insight_recommendations(insight_id);
