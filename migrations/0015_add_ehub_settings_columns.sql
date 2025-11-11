
-- Add missing columns to ehub_settings table
ALTER TABLE ehub_settings 
ADD COLUMN IF NOT EXISTS prompt_injection TEXT,
ADD COLUMN IF NOT EXISTS keyword_bin TEXT;
