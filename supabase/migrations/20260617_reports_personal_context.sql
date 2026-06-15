-- Optional free-text the seeker writes about themselves at onboarding
-- ("what's on your mind / biggest problems / context about yourself").
-- Flows into LLM report generation to personalize the commentary.
-- Mirrors the phone column (20260614_user_phone). Nullable, no backfill, safe to re-run.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS personal_context TEXT;
