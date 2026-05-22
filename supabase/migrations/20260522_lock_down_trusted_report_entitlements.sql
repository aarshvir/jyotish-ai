-- Browser clients may create/update their own report rows, but trusted
-- entitlement states must only be written by service-role server paths.

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') <> ALL (ARRAY['paid', 'promo', 'bypass'])
  );

DROP POLICY IF EXISTS "Users update own reports" ON public.reports;
CREATE POLICY "Users update own reports" ON public.reports
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') <> ALL (ARRAY['paid', 'promo', 'bypass'])
  );

CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code_id UUID,
  p_user_id UUID,
  p_order_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inserted_id UUID;
  updated_id UUID;
BEGIN
  INSERT INTO public.promo_redemptions (code_id, user_id, order_id)
  VALUES (p_code_id, p_user_id, p_order_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_code_id
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at >= NOW())
    AND (max_uses IS NULL OR used_count < max_uses)
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'Promo code cannot be redeemed';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) TO service_role;
