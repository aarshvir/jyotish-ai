-- Atomically enforce ONE free/preview report per user (defends the check-then-act
-- race in /api/reports/start). Idempotent. If this errors on existing duplicates,
-- dedupe free/preview rows per user first, then re-run.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_free_report_per_user
  ON public.reports (user_id)
  WHERE plan_type IN ('free', 'preview');
