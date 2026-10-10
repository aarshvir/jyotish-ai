-- /admin2 analytics + drop-off capture (2026-10-11). Safe to re-run.
--
-- 1) Indexes so the funnel/ops queries stay fast as analytics_events grows.
--    Funnel events and drop-off answers already land in analytics_events (no new
--    table needed): canonical rows carry properties.schema = 1.
CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON public.analytics_events (created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_activity
  ON public.analytics_events (created_at, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_cron
  ON public.analytics_events (created_at DESC)
  WHERE event_name = 'cron_run';

-- 2) Report-run observability. The pipeline has been writing to report_runs and
--    agent_runs since April, but production never had these tables (migration
--    20260425_report_run_observability.sql was not applied), so every write
--    silently failed and there is no record of LLM cost or failure class.
--    Identical to that migration; repeated here so one paste fixes it.

CREATE TABLE IF NOT EXISTS public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  inngest_run_id TEXT,
  correlation_id TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 0),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'complete', 'error', 'timeout')),
  phase TEXT,
  error_class TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_runs_report_id
  ON public.report_runs(report_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_runs_user_id
  ON public.report_runs(user_id, started_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_runs_running
  ON public.report_runs(started_at)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_report_runs_correlation_id
  ON public.report_runs(correlation_id);

ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_run_id UUID REFERENCES public.report_runs(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'fallback', 'skipped')),
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  cost_usd_micro INTEGER CHECK (cost_usd_micro IS NULL OR cost_usd_micro >= 0),
  error_class TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_report_id
  ON public.agent_runs(report_id, started_at DESC)
  WHERE report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runs_report_run_id
  ON public.agent_runs(report_run_id, started_at DESC)
  WHERE report_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_started
  ON public.agent_runs(agent_name, started_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- 3) Make PostgREST see the new tables immediately.
NOTIFY pgrst, 'reload schema';
