-- Migration: Rename campaigns to sequences and restructure for multi-step email sequences
-- This migration supports the E-Hub transition from single-email campaigns to Apollo-style multi-step sequences

-- Step 1: Rename campaigns table to sequences
ALTER TABLE IF EXISTS campaigns RENAME TO sequences;

-- Step 2: Add new columns to sequences table for AI configuration
ALTER TABLE sequences 
  ADD COLUMN IF NOT EXISTS prompt_injection TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS bounced_count INTEGER DEFAULT 0;

-- Step 3: Remove old single-email fields from sequences table (if they exist)
-- Note: We'll keep them for now to preserve data, can drop in future migration if needed
-- ALTER TABLE sequences DROP COLUMN IF EXISTS subject;
-- ALTER TABLE sequences DROP COLUMN IF EXISTS body;

-- Step 4: Rename campaign_recipients table to sequence_recipients
ALTER TABLE IF EXISTS campaign_recipients RENAME TO sequence_recipients;

-- Step 5: Rename columns in sequence_recipients
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'sequence_recipients' AND column_name = 'campaign_id') THEN
    ALTER TABLE sequence_recipients RENAME COLUMN campaign_id TO sequence_id;
  END IF;
END $$;

-- Step 6: Update status enum values in sequence_recipients
-- Old: 'pending', 'sent', 'replied', 'failed', 'bounced'
-- New: 'pending', 'in_sequence', 'replied', 'bounced', 'completed'
ALTER TABLE sequence_recipients 
  ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_step_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMP;

-- Update existing 'sent' status to 'completed' (they completed the single-step campaign)
UPDATE sequence_recipients SET status = 'completed' WHERE status = 'sent';

-- Update existing 'failed' status to 'bounced'
UPDATE sequence_recipients SET status = 'bounced' WHERE status = 'failed';

-- Step 7: Remove redundant fields from sequence_recipients (moved to sequence_recipient_messages)
-- Note: Keeping them for now to preserve data
-- ALTER TABLE sequence_recipients DROP COLUMN IF EXISTS sent_subject;
-- ALTER TABLE sequence_recipients DROP COLUMN IF EXISTS sent_body;

-- Step 8: Drop old campaign_sequences table (replaced by sequence_steps)
DROP TABLE IF EXISTS campaign_sequences;

-- Step 9: Create sequence_steps table
CREATE TABLE IF NOT EXISTS sequence_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id VARCHAR NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  ai_guidance TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_number);

-- Step 10: Create sequence_recipient_messages table for multi-step email history
CREATE TABLE IF NOT EXISTS sequence_recipient_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id VARCHAR NOT NULL REFERENCES sequence_recipients(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  thread_id VARCHAR,
  message_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipient_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_recipient_messages_recipient ON sequence_recipient_messages(recipient_id, step_number);

-- Step 11: Backfill sequence_recipient_messages from existing data (if any)
-- For existing recipients that were already sent, create a step 1 message entry
INSERT INTO sequence_recipient_messages (recipient_id, step_number, subject, body, sent_at, thread_id, message_id)
SELECT 
  id as recipient_id,
  1 as step_number,
  COALESCE(sent_subject, 'Legacy Email') as subject,
  COALESCE(sent_body, '') as body,
  sent_at,
  thread_id,
  message_id
FROM sequence_recipients
WHERE sent_at IS NOT NULL 
  AND status IN ('completed', 'replied')
  AND NOT EXISTS (
    SELECT 1 FROM sequence_recipient_messages 
    WHERE recipient_id = sequence_recipients.id AND step_number = 1
  );

-- Step 12: Update sequence_recipients current_step for backfilled data
UPDATE sequence_recipients 
SET current_step = 1 
WHERE sent_at IS NOT NULL 
  AND status IN ('completed', 'replied')
  AND current_step = 0;

-- Migration complete
-- Tables renamed: campaigns → sequences, campaign_recipients → sequence_recipients
-- New tables created: sequence_steps, sequence_recipient_messages
-- Old table dropped: campaign_sequences
