-- Add repeat_last_step column to sequences table
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS repeat_last_step BOOLEAN DEFAULT false;

-- Add helpful comment
COMMENT ON COLUMN sequences.repeat_last_step IS 'If true, the last step in stepDelays repeats indefinitely until recipient replies';
