-- Win-back send log. One row per (person, campaign), claimed BEFORE the email is
-- sent, so a double-clicked button, a retried batch, or a second run can never
-- email anyone twice. Idempotent; safe to re-run.

CREATE TABLE IF NOT EXISTS public.winback_sends (
  email       TEXT NOT NULL,
  campaign    TEXT NOT NULL,
  report_id   UUID,
  category    TEXT,
  subject     TEXT,
  provider_id TEXT,
  status      TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'sent', 'failed')),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, campaign)
);

ALTER TABLE public.winback_sends ENABLE ROW LEVEL SECURITY;
-- No client policies: service role only.
