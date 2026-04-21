-- Pillar 4: upsell tracking, Ziina upsell lineage, synastry charts

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS upsell_shown_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upsell_dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upsell_converted_at TIMESTAMPTZ;

ALTER TABLE public.ziina_payments
  ADD COLUMN IF NOT EXISTS upsell_of_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ziina_payments_upsell_parent ON public.ziina_payments(upsell_of_intent_id);

COMMENT ON COLUMN public.ziina_payments.upsell_of_intent_id IS 'Original 7-day Ziina intent id when this row is a monthly upgrade payment';

CREATE TABLE IF NOT EXISTS public.synastry_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_a JSONB NOT NULL DEFAULT '{}',
  partner_b JSONB NOT NULL DEFAULT '{}',
  ashtakoot JSONB NOT NULL DEFAULT '{}',
  commentary TEXT,
  plan_gate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_synastry_charts_user ON public.synastry_charts(user_id, created_at DESC);

ALTER TABLE public.synastry_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own synastry" ON public.synastry_charts;
CREATE POLICY "Users read own synastry" ON public.synastry_charts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own synastry" ON public.synastry_charts;
CREATE POLICY "Users insert own synastry" ON public.synastry_charts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own synastry" ON public.synastry_charts;
CREATE POLICY "Users update own synastry" ON public.synastry_charts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name, created_at DESC);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users insert own analytics" ON public.analytics_events;
CREATE POLICY "Users insert own analytics" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
