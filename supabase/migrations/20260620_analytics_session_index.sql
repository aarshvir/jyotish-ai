-- Per-visitor journey analytics: index analytics_events by session_id so the
-- admin /admin/journeys list (one row per session) and the per-session timeline
-- (/admin/journeys/[sid]) can scan a single visitor's events efficiently.
--
-- session_id lives inside the JSONB `properties` column (set by /api/track), so
-- this is an expression index on (properties->>'session_id', created_at). It is
-- additive and backward-compatible: no existing column is altered.

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created
  ON public.analytics_events ((properties->>'session_id'), created_at)
  WHERE properties ? 'session_id';
