-- Leads from the /q funnel ("Save your chart") and the consent ledger behind them.
-- Written only by the server (service role) through POST /api/lead/capture. RLS is on with
-- no policies, so a browser can never read or write these tables.
--
-- The funnel and the chart-link email work without these tables: until this has been run,
-- /api/lead/capture answers { saved: false, reason: "storage_unavailable" }, sends no email
-- (it could not record consent or keep the answers the link needs) and the visitor carries
-- on to their result. Safe to run more than once.
--
-- Email only. phone_e164 is kept (nullable, never written) so a later channel needs no
-- migration; nothing in the product asks for a phone number.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text,
  phone_e164        text,
  first_name        text,
  lang              text NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'hi')),  -- 'hi' = Hinglish (Roman script)
  country           text,
  tz                text NOT NULL DEFAULT 'Asia/Kolkata',
  source            text NOT NULL,           -- quiz_s15 | reveal_reask | checkout | legacy_newsletter
  slug              text,
  first_session_id  uuid,
  latest_session_id uuid,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  focus_area        text,
  goal_12m          text,
  birth_time_known  text,
  problems          text,                    -- comma-separated option codes from "what is hardest"
  -- The chart-defining quiz answers (birth details and the option codes). Needed so the
  -- emailed link can rebuild the chart on any device. Never holds the free-text answer.
  answers           jsonb NOT NULL DEFAULT '{}'::jsonb,
  age_ok            boolean NOT NULL DEFAULT true,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stage             text NOT NULL DEFAULT 'captured'
                    CHECK (stage IN ('captured', 'revealed', 'offer_seen', 'checkout_started', 'customer', 'lapsed')),
  reveal_viewed_at  timestamptz,
  offer_viewed_at   timestamptz,
  purchased_at      timestamptz,
  pass_ends_at      timestamptz,
  erased_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_has_contact CHECK (erased_at IS NOT NULL OR email IS NOT NULL OR phone_e164 IS NOT NULL),
  CONSTRAINT leads_email_lower CHECK (email IS NULL OR email = lower(email)),
  CONSTRAINT leads_phone_fmt   CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

-- A plain unique index: several NULL emails are allowed, and lookups by email are indexed.
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_uq ON public.leads (email);
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_uq ON public.leads (phone_e164);
CREATE INDEX IF NOT EXISTS leads_stage_idx ON public.leads (stage, created_at DESC);

-- Append-only record of what each person was shown and agreed to. Survives erasure of the
-- lead (lead_id goes NULL, contact_hash stays) so a withdrawal can still be honoured.
CREATE TABLE IF NOT EXISTS public.consent_events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id        uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_hash   text NOT NULL,              -- sha256(lower(email) | server secret)
  channel        text NOT NULL CHECK (channel IN ('email')),
  purpose        text NOT NULL CHECK (purpose IN ('service', 'marketing')),
  action         text NOT NULL CHECK (action IN ('notice_shown', 'granted', 'withdrawn')),
  source         text NOT NULL,              -- quiz_s15 | reveal_reask | unsubscribe_link | list_unsubscribe_post | erasure | admin
  notice_version text,
  text_shown     text,                       -- the exact words, in the language shown
  lang           text,
  session_id     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consent_lead_idx ON public.consent_events (lead_id, channel, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS consent_hash_idx ON public.consent_events (contact_hash, channel, purpose, created_at DESC);

-- Current state per person and purpose: the latest grant or withdrawal wins.
CREATE OR REPLACE VIEW public.lead_consent_state AS
SELECT DISTINCT ON (contact_hash, channel, purpose)
       contact_hash, lead_id, channel, purpose, action, source, created_at
FROM public.consent_events
WHERE action IN ('granted', 'withdrawn')
ORDER BY contact_hash, channel, purpose, created_at DESC;
REVOKE ALL ON public.lead_consent_state FROM anon, authenticated;

ALTER TABLE public.leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

-- Link a funnel session to its lead, if the sessions table has been created.
DO $$
BEGIN
  IF to_regclass('public.quiz_sessions') IS NOT NULL THEN
    ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;
