-- Admin + coupon-rules upgrade (2026-06-14)
-- Safe to re-run (IF NOT EXISTS / idempotent updates).

-- 1) Portal-managed admins — no ADMIN_EMAILS env var needed. Seed yourself ONCE
--    (run privately in the SQL editor; your email never lives in the repo):
--      INSERT INTO public.admin_users (email) VALUES ('you@example.com')
--      ON CONFLICT (email) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- No RLS policies on purpose: only the service-role (server admin APIs) reads/writes it.

-- 2) Per-user coupon limits. Every code is once-per-user by default; ADMIN100 unlimited.
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS once_per_user BOOLEAN NOT NULL DEFAULT true;
UPDATE public.promo_codes SET once_per_user = false WHERE code = 'ADMIN100';

-- 3) Keep ADMIN100 open to everyone for now (clear any account lock).
UPDATE public.promo_codes SET allowlist_emails = NULL WHERE code = 'ADMIN100';

-- 4) Record which promo a payment used, so redemption is booked on payment SUCCESS
--    (enables reliable once-per-user enforcement without penalising abandoned checkouts).
ALTER TABLE public.ziina_payments
  ADD COLUMN IF NOT EXISTS promo_code_id UUID;
