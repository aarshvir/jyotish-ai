-- CRITICAL paywall backfill. Free/preview reports were historically generated AND stored
-- in full, and report_data is readable by the owner via the direct Supabase client and
-- Supabase Realtime (replica identity full) — both bypass the API-layer strip. The
-- orchestrator now stores only the preview subset for NEW free reports; this one-time
-- backfill does the same for EXISTING free/preview rows: drop the paid sections
-- (months / weeks / synthesis) and keep only the first sample day.
-- Idempotent: the WHERE clause skips rows already stripped, so it's safe to re-run.

UPDATE public.reports
SET report_data = jsonb_set(
      report_data - 'months' - 'weeks' - 'synthesis',
      '{days}',
      CASE
        WHEN jsonb_typeof(report_data -> 'days') = 'array'
             AND jsonb_array_length(report_data -> 'days') > 0
          THEN jsonb_build_array(report_data -> 'days' -> 0)
        ELSE COALESCE(report_data -> 'days', '[]'::jsonb)
      END
    )
WHERE plan_type IN ('free', 'preview')
  AND report_data IS NOT NULL
  AND (
    report_data ? 'months'
    OR report_data ? 'weeks'
    OR report_data ? 'synthesis'
    OR (jsonb_typeof(report_data -> 'days') = 'array' AND jsonb_array_length(report_data -> 'days') > 1)
  );
