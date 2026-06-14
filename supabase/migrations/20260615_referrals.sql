-- Referral program: each user gets a referral code; referrals link a referrer to a
-- referee captured via ?ref=CODE at signup. Reward fulfilment is manual for now
-- (founder issues a coupon to top referrers in /admin). Safe to re-run.

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
-- No policies: only the service-role (server) reads/writes referrals.
