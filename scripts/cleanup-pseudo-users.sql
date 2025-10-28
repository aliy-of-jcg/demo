-- Clean up old redirect-based pseudo user IDs from visit_logs
-- These were incorrectly using IP-based user_ids instead of UUID cookies

-- Check current state
SELECT 
  'Before cleanup' as stage,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  countIf(user_id LIKE 'redirect_%') as pseudo_users
FROM analytics.visit_logs;

-- Delete old pseudo-user entries
ALTER TABLE analytics.visit_logs DELETE WHERE user_id LIKE 'redirect_%';

-- Wait for deletion to complete
OPTIMIZE TABLE analytics.visit_logs FINAL;

-- Check after cleanup
SELECT 
  'After cleanup' as stage,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  countIf(user_id LIKE 'redirect_%') as pseudo_users
FROM analytics.visit_logs;






