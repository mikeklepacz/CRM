
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS color_row_by_status BOOLEAN DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS status_options JSONB;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS color_presets JSONB;
