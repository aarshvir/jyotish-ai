-- Resonance loop: one-tap user rating of how a day actually felt vs the
-- predicted day score. Powers (a) the user-facing alignment view ("your clearer
-- windows aligned on 7 of 10 rated days") and (b) admin correlation analytics
-- (predicted-score vs felt-rating distributions). Brand-safe framing: alignment/
-- reflection, never "prediction accuracy proof". Safe to re-run (idempotent).

CREATE TABLE IF NOT EXISTS public.day_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  rated_date DATE NOT NULL,
  -- -1 = heavier than expected, 0 = as expected, +1 = clearer than expected
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 0, 1)),
  -- Snapshot of the predicted day score (0-100) at rating time, so alignment
  -- stats survive later re-generations of the report.
  predicted_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_day_rating_per_user_day UNIQUE (user_id, rated_date)
);

CREATE INDEX IF NOT EXISTS idx_day_ratings_user ON public.day_ratings (user_id, rated_date DESC);
CREATE INDEX IF NOT EXISTS idx_day_ratings_created ON public.day_ratings (created_at DESC);

ALTER TABLE public.day_ratings ENABLE ROW LEVEL SECURITY;

-- Users manage their own ratings; admin reads go via the service role.
DROP POLICY IF EXISTS "day_ratings_select_own" ON public.day_ratings;
CREATE POLICY "day_ratings_select_own" ON public.day_ratings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "day_ratings_insert_own" ON public.day_ratings;
CREATE POLICY "day_ratings_insert_own" ON public.day_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "day_ratings_update_own" ON public.day_ratings;
CREATE POLICY "day_ratings_update_own" ON public.day_ratings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
