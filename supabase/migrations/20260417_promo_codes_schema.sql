-- Promo code schema required by src/lib/promo/server.ts.
-- This migration intentionally runs before 20260418_seed_promo_codes.sql.

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_pct INTEGER NOT NULL CHECK (discount_pct >= 0 AND discount_pct <= 100),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  allowlist_emails TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active
  ON public.promo_codes(active, expires_at)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_created
  ON public.promo_redemptions(code_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_created
  ON public.promo_redemptions(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_order_id_unique
  ON public.promo_redemptions(order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_promo_used_count(p_code_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_code_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_promo_used_count(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_promo_used_count(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_promo_used_count(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_used_count(UUID) TO service_role;
