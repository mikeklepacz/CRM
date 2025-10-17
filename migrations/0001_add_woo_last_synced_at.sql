
-- Add woo_last_synced_at column to user_integrations table
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS woo_last_synced_at TIMESTAMP;
