-- CRITICAL paywall fix (audit cycle 7, finding [1]).
--
-- reports.pipeline_state / pipeline_checkpoint hold the fully-populated PAID
-- product (12-month forecast, weekly synthesis, all-day hourly commentary,
-- nativity text) during generation, so the pipeline can resume between Inngest
-- steps. But these columns sit on the owner-readable `reports` row: the owner's
-- RLS SELECT policy + REPLICA IDENTITY FULL (Realtime) exposed them to a
-- free/preview user who never paid for that content. All prior paywall hardening
-- stripped only report_data and missed these two columns.
--
-- Fix: revoke column-level SELECT from the client roles. The orchestrator and all
-- checkpoint read/writes use the service_role (createServiceClient), which is
-- unaffected by these grants, so resume keeps working. PostgREST resolves
-- `select('*')` against the columns the requesting role may read, so existing
-- client queries keep working and simply no longer receive these blobs (no client
-- code reads them). Idempotent — safe to re-run.

REVOKE SELECT (pipeline_state, pipeline_checkpoint) ON public.reports FROM authenticated;
REVOKE SELECT (pipeline_state, pipeline_checkpoint) ON public.reports FROM anon;

-- Restrict the Realtime publication for `reports` to a safe column allow-list so
-- UPDATE broadcasts (REPLICA IDENTITY FULL) never carry the pipeline blobs to
-- subscribed clients. Lists every column EXCEPT pipeline_state/pipeline_checkpoint.
-- Wrapped so it is a no-op if the publication/table membership isn't present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports (
      id, user_id, user_email, native_name, birth_date, birth_time, birth_city,
      birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset,
      plan_type, payment_status, payment_provider, status, lagna_sign, moon_sign,
      moon_nakshatra, dasha_mahadasha, dasha_antardasha, day_scores, report_data,
      generation_progress, generation_started_at, generation_completed_at,
      generation_time_seconds, generation_trace_id, created_at, updated_at
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Column-list publications require PG15+. If unsupported, the column REVOKE above
  -- is the primary protection; log and continue rather than failing the migration.
  RAISE NOTICE 'Could not set column-list publication for reports: %', SQLERRM;
END $$;

-- One-time backfill: clear the blobs from any already-terminal rows (they no
-- longer need resume), so historical free/preview reports stop carrying paid copy.
UPDATE public.reports
SET pipeline_state = NULL, pipeline_checkpoint = NULL
WHERE status IN ('complete', 'error')
  AND (pipeline_state IS NOT NULL OR pipeline_checkpoint IS NOT NULL);
