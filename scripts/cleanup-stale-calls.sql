
-- Reset call_campaign_targets that have been stuck in 'in-progress' for over 1 hour
UPDATE call_campaign_targets
SET 
  target_status = 'failed',
  last_error = 'Timeout: No status update received'
WHERE 
  target_status = 'in-progress'
  AND updated_at < NOW() - INTERVAL '1 hour';

-- Verify the cleanup
SELECT 
  target_status,
  COUNT(*) as count
FROM call_campaign_targets
GROUP BY target_status;
