-- Restore live-telemetry columns to the reports Realtime publication (audit cycle 8, [8][9][13][25]).
--
-- #126 (20260619_protect_pipeline_state_columns) replaced the reports Realtime
-- publication with a hand-typed column allow-list to keep pipeline_state/
-- pipeline_checkpoint off the wire. That list accidentally dropped columns the
-- client reads live during generation — generation_step (phase label),
-- generation_error_code / generation_error_at_phase (error CTA + diagnostic) —
-- plus report_start_date/report_end_date/notify_sent_at/personal_context. On
-- PG15+ a column-list publication strips non-listed columns from payload.new, so
-- the GeneratingScreen phase telemetry and error metadata silently went blank on
-- the Realtime path (still works via the slower /status poll).
--
-- This redoes the publication with the FULL column set EXCEPT the two sensitive
-- blobs (pipeline_state, pipeline_checkpoint — still column-REVOKED by #126) and
-- the large append-only generation_log (read via its own endpoint, not Realtime).
-- Idempotent. Re-derive this list if reports ever gains a column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports (
    id, user_id, user_email, native_name, birth_date, birth_time, birth_city,
    birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset,
    plan_type, report_start_date, report_end_date, lagna_sign, moon_sign,
    moon_nakshatra, dasha_mahadasha, dasha_antardasha, day_scores, report_data,
    status, payment_status, payment_provider, generation_step, generation_progress,
    generation_started_at, generation_completed_at, generation_time_seconds,
    generation_error_code, generation_error_at_phase, generation_trace_id,
    notify_sent_at, personal_context, phone, upsell_dismissed_at,
    upsell_converted_at, created_at, updated_at
  );
EXCEPTION WHEN OTHERS THEN
  -- Column-list publications require PG15+. On older servers the #126 column
  -- REVOKE on pipeline_state/pipeline_checkpoint is the protection and the
  -- full-table publication already carries every telemetry column. Log + continue.
  RAISE NOTICE 'Could not set column-list publication for reports: %', SQLERRM;
END $$;
