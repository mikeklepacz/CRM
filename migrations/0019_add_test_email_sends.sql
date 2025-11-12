-- Test Email Sends table for rapid testing of email threading and reply detection
CREATE TABLE IF NOT EXISTS test_email_sends (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  gmail_thread_id VARCHAR,
  gmail_message_id VARCHAR,
  rfc822_message_id VARCHAR,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  reply_detected_at TIMESTAMP,
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMP,
  error_message TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_email_sends_created_by ON test_email_sends(created_by);
CREATE INDEX idx_test_email_sends_thread_id ON test_email_sends(gmail_thread_id);
CREATE INDEX idx_test_email_sends_status ON test_email_sends(status);

COMMENT ON TABLE test_email_sends IS 'Test email sends for rapid testing of Gmail threading and reply detection';
