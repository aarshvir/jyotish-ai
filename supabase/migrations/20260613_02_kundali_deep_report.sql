-- Deepen kundali_charts to store the full multi-section birth report.
-- Additive only (ADD COLUMN IF NOT EXISTS) so it is safe to run after
-- 20260613_kundali_standalone.sql whether or not that has already been applied.

ALTER TABLE public.kundali_charts
  ADD COLUMN IF NOT EXISTS overview      TEXT  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vargas        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS doshas        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS yogas         JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS life_areas    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS year_outlook  JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS engine_version TEXT NOT NULL DEFAULT 'deep-v1';

COMMENT ON COLUMN public.kundali_charts.vargas       IS 'Divisional charts: D9 Navamsa, D7 Saptamsa, D10 Dasamsa (deterministic)';
COMMENT ON COLUMN public.kundali_charts.doshas       IS 'Manglik / Kaal Sarpa / Sade Sati detection (deterministic)';
COMMENT ON COLUMN public.kundali_charts.life_areas   IS 'Per-area narrative: life, career_finances, relationships, marriage_intimacy, health, children, family';
COMMENT ON COLUMN public.kundali_charts.year_outlook IS 'Year-by-year outlook for the next 5 years (dasha-driven)';
