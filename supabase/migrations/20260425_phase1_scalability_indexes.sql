-- Phase 1 scalability indexes for multi-user report dashboards and cleanup sweeps.

CREATE INDEX IF NOT EXISTS idx_reports_user_status_created
  ON public.reports(user_id, status, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_generating_updated
  ON public.reports(updated_at)
  WHERE status = 'generating';

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
  ON public.analytics_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
