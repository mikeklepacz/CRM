-- Migration 0020: Add Client Time Range Settings
-- Adds configurable client window settings instead of hard-coded 1hr/2pm rules

-- Add client_window_start_offset column (hours after business opens)
ALTER TABLE ehub_settings 
ADD COLUMN IF NOT EXISTS client_window_start_offset DECIMAL(4,2) NOT NULL DEFAULT 1.00;

-- Add client_window_end_hour column (absolute cutoff hour in client local time)
ALTER TABLE ehub_settings 
ADD COLUMN IF NOT EXISTS client_window_end_hour INTEGER NOT NULL DEFAULT 14;

COMMENT ON COLUMN ehub_settings.client_window_start_offset IS 'Hours after business opens to start sending (e.g., 1.00 = 1 hour after opening)';
COMMENT ON COLUMN ehub_settings.client_window_end_hour IS 'Client local cutoff hour (24h format, e.g., 14 = 2 PM local time)';

-- Update existing rows to have the default values (matches current hard-coded behavior)
UPDATE ehub_settings 
SET client_window_start_offset = 1.00, client_window_end_hour = 14 
WHERE client_window_start_offset IS NULL OR client_window_end_hour IS NULL;
