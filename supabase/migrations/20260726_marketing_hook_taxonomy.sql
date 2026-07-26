-- 20260726_marketing_hook_taxonomy.sql — close the marketing learning loop.
--
-- The engine could already learn from REJECTIONS (owner rulings become lessons injected into the
-- next prompt). It could NOT learn from RESULTS: marketing_stats recorded views and likes against
-- an asset SLUG, and a slug says nothing about the shape of the creative, so "which hooks actually
-- perform?" had no join key and was unanswerable.
--
-- These four columns are that join key. Every variant is tagged at CREATION by
-- marketing-agent/src/taxonomy.ts, loop:sync mirrors the tags here, and
-- marketing-agent/src/performance.ts aggregates marketing_stats BY TAG and feeds an honest,
-- sample-size-labelled brief back into the script-writing prompts.
--
-- Purely additive and idempotent. Nothing reads these columns until they exist; loop:sync detects
-- their absence and keeps syncing without them.

ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS hook_family TEXT;
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS decision_domain TEXT;
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS emotional_register TEXT;
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS duration_target_sec NUMERIC;

COMMENT ON COLUMN public.marketing_assets.hook_family IS
  'question_dilemma | cost_time_anchor | contrarian_respectful | pov_relatable | proof_demo | curiosity_gap';
COMMENT ON COLUMN public.marketing_assets.decision_domain IS
  'work | relationships | family | study | money_timing | health_routine | other';
COMMENT ON COLUMN public.marketing_assets.emotional_register IS 'anxious | hopeful | practical | playful';
COMMENT ON COLUMN public.marketing_assets.duration_target_sec IS 'Intended finished reel length in seconds.';

CREATE INDEX IF NOT EXISTS idx_marketing_assets_hook_family ON public.marketing_assets (hook_family);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_decision_domain ON public.marketing_assets (decision_domain);
