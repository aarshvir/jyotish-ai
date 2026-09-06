-- Relaunch pivot: one-time reports -> recurring subscription.
-- Adds pricing-out-of-code, subscription/entitlement state, and quiz funnel
-- telemetry. Fully idempotent; safe to re-run. Nothing here changes existing
-- report behaviour, so it can ship ahead of the UI.

-- ── 1. pricing_config ───────────────────────────────────────────────────────
-- Prices must never live in code again: ZIINA_PLANS being compiled in is why
-- the price could not be tested. Amounts are in MINOR units (paise / cents).
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id            BIGSERIAL PRIMARY KEY,
  sku           TEXT NOT NULL,                 -- 'pass' | 'light' | 'premium'
  region        TEXT NOT NULL,                 -- 'IN' | 'INTL'
  currency      TEXT NOT NULL,                 -- 'INR' | 'USD'
  amount_minor  INTEGER NOT NULL CHECK (amount_minor >= 0),
  interval      TEXT NOT NULL CHECK (interval IN ('once','month','year')),
  interval_days INTEGER,                       -- for one-time passes (e.g. 14)
  display_name  TEXT NOT NULL,
  tagline       TEXT,
  badge         TEXT,                          -- e.g. 'Most chosen'
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,-- pre-selected card
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku, region)
);
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
-- Prices are public information; anyone may read the active ladder.
DROP POLICY IF EXISTS "Anyone can read active pricing" ON public.pricing_config;
CREATE POLICY "Anyone can read active pricing" ON public.pricing_config
  FOR SELECT USING (is_active = TRUE);
-- Writes are service-role only (no policy = denied to anon/authenticated).

-- Owner-chosen India ladder: Rs 299/mo light, Rs 999/mo premium, plus the Rs 99
-- 14-day Pass that replaces a card-gated trial (India: ~8% credit-card
-- coverage, and RBI requires a 24h pre-debit cancel alert on every mandate).
--
-- Diaspora is priced separately and deliberately higher: comparable products
-- earn roughly 10x per overseas user vs per Indian user (Sri Mandir: ~Rs 7,000
-- vs Rs 600-800), and US/UK/EU/UAE buyers are anchored against The Pattern
-- (~$15/mo) and Sanctuary (~$19.99/mo), not against Hotstar (Rs 299). Regions
-- are resolved per-request from IP + Accept-Language; one global price would
-- throw away that spread at zero product cost.
INSERT INTO public.pricing_config
  (sku, region, currency, amount_minor, interval, interval_days, display_name, tagline, badge, is_default, sort_order)
VALUES
  -- India
  ('pass',    'IN', 'INR',   9900, 'once',  14,   'VedicHour Pass',    '14 days, full access. Nothing renews.', NULL,          FALSE, 0),
  ('light',   'IN', 'INR',  29900, 'month', NULL, 'VedicHour Light',   'Your daily timing, every morning.',     'Most chosen', TRUE,  1),
  ('premium', 'IN', 'INR',  99900, 'month', NULL, 'VedicHour Premium', 'Everything, plus in-depth reports.',    NULL,          FALSE, 2),
  -- United States / default for unmatched high-income markets
  ('pass',    'US', 'USD',    499, 'once',  14,   'VedicHour Pass',    '14 days, full access. Nothing renews.', NULL,          FALSE, 0),
  ('light',   'US', 'USD',    999, 'month', NULL, 'VedicHour Light',   'Your daily timing, every morning.',     'Most chosen', TRUE,  1),
  ('premium', 'US', 'USD',   2499, 'month', NULL, 'VedicHour Premium', 'Everything, plus in-depth reports.',    NULL,          FALSE, 2),
  -- United Kingdom
  ('pass',    'GB', 'GBP',    499, 'once',  14,   'VedicHour Pass',    '14 days, full access. Nothing renews.', NULL,          FALSE, 0),
  ('light',   'GB', 'GBP',    899, 'month', NULL, 'VedicHour Light',   'Your daily timing, every morning.',     'Most chosen', TRUE,  1),
  ('premium', 'GB', 'GBP',   1999, 'month', NULL, 'VedicHour Premium', 'Everything, plus in-depth reports.',    NULL,          FALSE, 2),
  -- Eurozone
  ('pass',    'EU', 'EUR',    499, 'once',  14,   'VedicHour Pass',    '14 days, full access. Nothing renews.', NULL,          FALSE, 0),
  ('light',   'EU', 'EUR',    999, 'month', NULL, 'VedicHour Light',   'Your daily timing, every morning.',     'Most chosen', TRUE,  1),
  ('premium', 'EU', 'EUR',   2499, 'month', NULL, 'VedicHour Premium', 'Everything, plus in-depth reports.',    NULL,          FALSE, 2),
  -- UAE / Gulf (large Indian diaspora, higher willingness to pay than IN)
  ('pass',    'AE', 'AED',   1900, 'once',  14,   'VedicHour Pass',    '14 days, full access. Nothing renews.', NULL,          FALSE, 0),
  ('light',   'AE', 'AED',   3900, 'month', NULL, 'VedicHour Light',   'Your daily timing, every morning.',     'Most chosen', TRUE,  1),
  ('premium', 'AE', 'AED',   9900, 'month', NULL, 'VedicHour Premium', 'Everything, plus in-depth reports.',    NULL,          FALSE, 2)
ON CONFLICT (sku, region) DO NOTHING;

-- ── 2. subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  sku                   TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('trialing','active','past_due','paused','canceled','expired')),
  provider              TEXT,                  -- 'razorpay' | 'ziina' | 'manual'
  provider_ref          TEXT,                  -- subscription / mandate id
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  trial_end             TIMESTAMPTZ,
  cancel_at             TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON public.subscriptions (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_ref
  ON public.subscriptions (provider, provider_ref) WHERE provider_ref IS NOT NULL;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions" ON public.subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);
-- Only the service role may write: a browser must never grant itself access.

-- ── 3. entitlements ─────────────────────────────────────────────────────────
-- Materialised grants so a feature check is one indexed read, and so a Pass,
-- a promo and a subscription can all grant the same feature uniformly.
CREATE TABLE IF NOT EXISTS public.entitlements (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  feature    TEXT NOT NULL,          -- 'daily_timing' | 'compatibility' | 'premium_reports'
  source     TEXT NOT NULL,          -- 'subscription' | 'pass' | 'promo' | 'admin'
  source_id  TEXT,                   -- subscription id / payment id
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,            -- NULL = no expiry
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, feature, source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_lookup
  ON public.entitlements (user_id, feature, expires_at);
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own entitlements" ON public.entitlements;
CREATE POLICY "Users read own entitlements" ON public.entitlements
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ── 4. subscription_events (idempotent webhook log) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id          BIGSERIAL PRIMARY KEY,
  provider    TEXT NOT NULL,
  event_id    TEXT NOT NULL,         -- provider's event id: the idempotency key
  event_type  TEXT NOT NULL,
  payload     JSONB,
  user_id     UUID,
  processed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
-- service-role only.

-- ── 5. quiz_sessions (funnel telemetry + resumable answers) ─────────────────
-- Anonymous-first: the quiz runs before signup, so anon_id carries it until a
-- user exists. NEVER store raw birth data here; it belongs on reports.
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id         TEXT NOT NULL,
  user_id         UUID,
  locale          TEXT NOT NULL DEFAULT 'en',
  answers         JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step    TEXT,
  steps_seen      INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  paywall_seen_at TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ,
  converted_sku   TEXT,
  utm             JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_anon    ON public.quiz_sessions (anon_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_funnel  ON public.quiz_sessions (started_at DESC);
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
-- service-role only: the API owns reads/writes so anon sessions can't be enumerated.
