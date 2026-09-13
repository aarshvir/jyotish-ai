-- Subscriptions for the live platform. Idempotent; safe to re-run.
--
-- Ziina has no recurring-billing API (no saved cards, no mandates, no off-session
-- charges — verified against its full doc index on 2026-09-13). So a subscription
-- here is a run of paid periods: each completed Ziina payment for a subscription
-- plan extends access by one period, and renewal happens when the customer pays
-- again from a reminder. The shape does not assume manual renewal, so an automatic
-- provider can replace it later without a schema change.

-- ── 1. subscriptions: one row per customer, the current state ─────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE,
  plan                 TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  provider             TEXT NOT NULL DEFAULT 'ziina',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  canceled_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- "Active" is derived (current_period_end > now()), never stored, so a lapsed
-- subscription can never be left marked active by a cron that did not run.
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions (current_period_end);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);
-- Writes are service-role only: a browser must never extend its own access.

-- ── 2. subscription_periods: every paid period, keyed by the payment ──────────
-- The Ziina webhook, the verify redirect and the reconcile cron can all finalize
-- the same payment. The primary key on the payment intent is what guarantees a
-- payment extends access exactly once.
CREATE TABLE IF NOT EXISTS public.subscription_periods (
  payment_intent_id TEXT PRIMARY KEY,
  user_id           UUID NOT NULL,
  plan              TEXT NOT NULL CHECK (plan IN ('monthly', 'annual')),
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  amount            INTEGER NOT NULL CHECK (amount >= 0),
  currency          TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_periods_user ON public.subscription_periods (user_id, period_end DESC);
ALTER TABLE public.subscription_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscription periods" ON public.subscription_periods;
CREATE POLICY "Users read own subscription periods" ON public.subscription_periods
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ── 3. subscription_reminders: renewal nudges, once per period per kind ───────
CREATE TABLE IF NOT EXISTS public.subscription_reminders (
  user_id    UUID NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('renew_soon', 'expired')),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_end, kind)
);
ALTER TABLE public.subscription_reminders ENABLE ROW LEVEL SECURITY;
-- service-role only.
