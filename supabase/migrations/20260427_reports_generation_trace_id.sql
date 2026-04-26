-- Correlates a single generation run from /api/reports/start through orchestrator, Inngest, and status polls.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS generation_trace_id TEXT;

COMMENT ON COLUMN public.reports.generation_trace_id IS
  'Issued when generation starts; use for support and log correlation across pipeline and status API.';
