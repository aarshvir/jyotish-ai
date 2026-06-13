-- Kundali Analysis standalone product (Ziina plan_type=kundali without report_id)
-- Mirrors the synastry standalone unlock pattern.

-- Per-user unlock for the standalone Kundali product
CREATE TABLE IF NOT EXISTS public.user_kundali_unlock (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_kundali_unlock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own kundali unlock" ON public.user_kundali_unlock;
CREATE POLICY "Users read own kundali unlock" ON public.user_kundali_unlock
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_kundali_unlock IS 'Standalone Kundali analysis product purchase (no forecast report required)';

-- Stored Kundali readings
CREATE TABLE IF NOT EXISTS public.kundali_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person JSONB NOT NULL,
  chart JSONB NOT NULL,
  lagna_analysis TEXT NOT NULL DEFAULT '',
  dasha_interpretation TEXT NOT NULL DEFAULT '',
  life_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kundali_charts_user ON public.kundali_charts(user_id);

ALTER TABLE public.kundali_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own kundali charts" ON public.kundali_charts;
CREATE POLICY "Users read own kundali charts" ON public.kundali_charts
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.kundali_charts IS 'Standalone Kundali (birth chart) readings';
