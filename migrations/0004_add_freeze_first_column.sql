
-- Add freezeFirstColumn preference to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS freeze_first_column BOOLEAN DEFAULT false;
