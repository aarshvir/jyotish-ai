-- 20260725_marketing_campaign_state.sql — Campaign Control Panel + Insights Engine
-- Mirrors the local marketing-agent state into Supabase so /admin/campaigns can
-- show every campaign asset, its hour-by-hour performance, and plain-English
-- kill/double/watch verdicts. Written by the marketing-agent loops (sync/stats/
-- insights) with the service key; read by /api/admin/campaigns.
-- Service-role only: RLS enabled, NO anon/user policies. Idempotent.

-- One row per campaign asset (reel today; kind is open for future formats).
-- Localized dubbed variants (Sarvam TTS + lip-sync) are their own rows with
-- language set (hi/ta/te/bn/mr/...) and parent_slug pointing at the original.
CREATE TABLE IF NOT EXISTS public.marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'reel',
  status TEXT NOT NULL DEFAULT 'ready_to_render'
    CHECK (status IN ('ready_to_render', 'rendered', 'published_manual', 'published_auto', 'killed')),
  hook TEXT,
  language TEXT DEFAULT 'hinglish',
  parent_slug TEXT,
  script JSONB,
  hashtags JSONB,
  youtube_title TEXT,
  youtube_description TEXT,
  utm_campaign TEXT,
  video_path TEXT,
  youtube_video_id TEXT,
  instagram_permalink TEXT,
  render_cost_usd NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Idempotent upgrades for tables created before the localization stage.
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'hinglish';
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS parent_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_marketing_assets_status ON public.marketing_assets (status);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_parent ON public.marketing_assets (parent_slug);
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

-- Append-only time series: one row per stats poll per asset → hour-by-hour trends.
CREATE TABLE IF NOT EXISTS public.marketing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.marketing_assets(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'youtube' CHECK (source IN ('youtube', 'instagram', 'manual')),
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT,
  watch_pct NUMERIC,
  raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_marketing_stats_asset_time ON public.marketing_stats (asset_id, captured_at DESC);
ALTER TABLE public.marketing_stats ENABLE ROW LEVEL SECURITY;

-- Plain-English verdicts from the insights loop (brain-generated, rule-guarded).
CREATE TABLE IF NOT EXISTS public.marketing_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period TEXT,
  headline TEXT,
  body TEXT,
  actions JSONB, -- [{assetSlug, action: 'kill'|'double'|'watch', reason, confidence}]
  raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_marketing_insights_generated ON public.marketing_insights (generated_at DESC);
ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;
