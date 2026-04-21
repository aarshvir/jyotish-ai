-- Pillar 1: idempotent Ziina webhook delivery log (replay protection)

CREATE TABLE IF NOT EXISTS public.ziina_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ziina_webhook_events_received
  ON public.ziina_webhook_events (received_at DESC);

COMMENT ON TABLE public.ziina_webhook_events IS 'One row per unique Ziina webhook delivery; duplicate event_id returns 200 without re-processing';

ALTER TABLE public.ziina_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role only (no anon/authenticated policies — server writes via service key)
