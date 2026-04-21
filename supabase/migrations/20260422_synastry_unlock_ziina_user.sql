-- Synastry standalone unlock (Ziina plan_type=synastry without report_id) + payment attribution

ALTER TABLE public.ziina_payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ziina_payments_user ON public.ziina_payments(user_id);

CREATE TABLE IF NOT EXISTS public.user_synastry_unlock (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_synastry_unlock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own synastry unlock" ON public.user_synastry_unlock;
CREATE POLICY "Users read own synastry unlock" ON public.user_synastry_unlock
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_synastry_unlock IS 'Standalone synastry product purchase (no forecast report required)';
