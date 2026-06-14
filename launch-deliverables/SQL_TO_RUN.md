# SQL to run — new features (paste into Supabase → SQL Editor → Run)

These power the **first-touch attribution** and **referral** features shipped this session.
Idempotent and safe to re-run. (Your earlier consolidated block already covered the
paywall, coupons, phone, analytics, feedback, newsletter, etc.)

```sql
-- ============================================================================
-- 1) FIRST-TOUCH ATTRIBUTION (channel that brought each user -> /admin Attribution)
-- ============================================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_touch_source   TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_medium   TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_referrer TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_landing  TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_at       TIMESTAMPTZ;

-- ============================================================================
-- 2) REFERRAL PROGRAM (referral codes + who-referred-whom)
-- ============================================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_profiles_referral_code
  ON public.user_profiles (referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_purchase_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_referrals_referee ON public.referrals (referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id, created_at DESC);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
```

After running this:
- **Attribution** fills in as new users sign up (cookie captured on first visit → saved at signup). View it at `/admin/attribution`.
- **Referral** links work immediately: each user sees their `vedichour.com/?ref=CODE` link on `/account`; sign-ups via it are recorded in `referrals`.

> The code already runs fine **before** you paste this (it's written to tolerate the missing columns) — these just turn on persistence.
