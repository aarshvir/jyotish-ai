-- The live grant path (src/lib/subscriptions/grant.ts) writes public.subscriptions
-- as defined in 20260913_subscriptions.sql: a `plan` column and UNIQUE(user_id).
--
-- 20260727_subscription_pivot.sql already created public.subscriptions with a
-- different shape (sku, status, no unique user_id). 20260913 then used
-- CREATE TABLE IF NOT EXISTS, which does nothing when that pivot table is
-- present. Every database that applies this folder in order — including a
-- fresh one — keeps the pivot table.
--
-- Checkout only asked whether `user_id` could be selected. The pivot table has
-- that column, so the readiness check passed, a payment intent was created, and
-- the grant upsert of `plan` failed after the payment was marked completed.
-- Re-finalizing hits the same missing column. The buyer is charged and never
-- receives the period.
--
-- This renames the unused pivot table out of the way (rows kept) and installs
-- the table the grant actually writes. A database that already has `plan` is
-- left in place; we only add the user_id uniqueness the upsert requires.

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'sku'
     )
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan'
     )
  THEN
    IF to_regclass('public.subscriptions_pivot_legacy') IS NOT NULL THEN
      RAISE EXCEPTION 'public.subscriptions_pivot_legacy already exists; refusing to rename the pivot subscriptions table';
    END IF;
    ALTER TABLE public.subscriptions RENAME TO subscriptions_pivot_legacy;
  END IF;
END $$;

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

-- 20260913's period-end index may still be attached to the renamed pivot table,
-- so the name can already be taken. Use a distinct name for the grant table.
CREATE INDEX IF NOT EXISTS idx_subscriptions_grant_period_end
  ON public.subscriptions (current_period_end);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'public.subscriptions'::regclass
            AND attname = 'user_id'
            AND NOT attisdropped
        )
      ]::smallint[]
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Period and reminder tables were new in 20260913 (no earlier name collision).
-- Recreate them only when that migration did not.
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
CREATE INDEX IF NOT EXISTS idx_subscription_periods_user
  ON public.subscription_periods (user_id, period_end DESC);
ALTER TABLE public.subscription_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own subscription periods" ON public.subscription_periods;
CREATE POLICY "Users read own subscription periods" ON public.subscription_periods
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.subscription_reminders (
  user_id    UUID NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('renew_soon', 'expired')),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_end, kind)
);
ALTER TABLE public.subscription_reminders ENABLE ROW LEVEL SECURITY;
