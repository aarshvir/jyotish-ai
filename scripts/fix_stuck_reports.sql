-- Fix 3 stuck reports that have been generating for >1 hour
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql/new

UPDATE reports
SET status = 'error', error_message = 'Report generation timed out (>1 hour)'
WHERE status = 'generating'
  AND created_at < NOW() - INTERVAL '1 hour';
