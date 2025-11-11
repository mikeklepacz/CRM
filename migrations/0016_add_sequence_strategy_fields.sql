-- Add strategy conversation and step delays to sequences table
-- Migration: 0016_add_sequence_strategy_fields.sql

ALTER TABLE sequences 
  ADD COLUMN IF NOT EXISTS strategy_transcript JSONB,
  ADD COLUMN IF NOT EXISTS step_delays INTEGER[];

COMMENT ON COLUMN sequences.strategy_transcript IS 'JSONB array of {role, content} objects storing the AI strategy conversation';
COMMENT ON COLUMN sequences.step_delays IS 'Array of delay days between steps, e.g., [0, 3, 7, 15, 31]';
COMMENT ON COLUMN sequences.prompt_injection IS 'DEPRECATED: Use strategy_transcript instead';
