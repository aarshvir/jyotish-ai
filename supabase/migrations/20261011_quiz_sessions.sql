-- /q/[slug] ad-funnel sessions (VEDICHOUR_QUIZ_SPEC §4). One row per funnel visit.
-- Written only by the server (service role) through POST /api/quiz/session; RLS is on
-- with no policies, so the browser can never read or write it directly.
-- The funnel works without this table (it degrades to client-only state), but leads
-- and funnel analytics are only kept once it exists.

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id                uuid PRIMARY KEY,
  slug              text NOT NULL,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  utm_term          text,
  fbclid            text,
  gclid             text,
  geo_country       text,
  lang              text,
  flags             jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers           jsonb NOT NULL DEFAULT '{}'::jsonb,
  birth_id          uuid,
  contact           jsonb,
  marketing_consent boolean NOT NULL DEFAULT false,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  step_reached      text,
  reveal_viewed_at  timestamptz,
  purchased_at      timestamptz,
  value_inr         numeric(10,2),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_slug_created ON public.quiz_sessions (slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created ON public.quiz_sessions (created_at DESC);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
