-- Migration: Create non_duplicates table
-- Description: Track store pairs that have been manually marked as "not duplicates"

CREATE TABLE IF NOT EXISTS non_duplicates (
  id SERIAL PRIMARY KEY,
  link1 TEXT NOT NULL,
  link2 TEXT NOT NULL,
  marked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(link1, link2)
);

-- Create index for fast lookups
CREATE INDEX idx_non_duplicates_links ON non_duplicates(link1, link2);

-- Also create reverse index for bidirectional lookups
CREATE INDEX idx_non_duplicates_links_reverse ON non_duplicates(link2, link1);
