-- Narrow day_scores on existing free/preview rows to the single preview day
-- (audit cycle 8, [11]). day_scores (date->score map) is the paid day-by-day
-- score curve. dbSaveFinal already narrows it to the sliced preview day going
-- forward, and the orchestrator's intermediate write now narrows too, but
-- historical free rows (created before the preview-strip work, or that failed
-- mid-generation) still carry the full multi-day curve, readable by the free
-- owner via select('*') / Realtime. Narrow each such row to only the date present
-- in its already-stripped report_data (or empty if none). Idempotent: only
-- touches free/preview rows that still have more than one score entry.

UPDATE public.reports
SET day_scores = COALESCE(
  (CASE
     WHEN report_data->'days'->0->>'date' IS NOT NULL
          AND day_scores ? (report_data->'days'->0->>'date')
     THEN jsonb_build_object(
            report_data->'days'->0->>'date',
            day_scores->(report_data->'days'->0->>'date'))
     ELSE NULL
   END),
  '{}'::jsonb)
WHERE plan_type IN ('free', 'preview')
  AND day_scores IS NOT NULL
  AND jsonb_typeof(day_scores) = 'object'
  AND (SELECT count(*) FROM jsonb_object_keys(day_scores)) > 1;
