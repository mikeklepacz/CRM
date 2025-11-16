-- Add state column to sequence_recipients for timezone detection
ALTER TABLE sequence_recipients 
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

COMMENT ON COLUMN sequence_recipients.state IS 'State from Google Sheets for timezone detection';
