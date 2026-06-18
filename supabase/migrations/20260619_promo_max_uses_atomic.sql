-- Enforce promo max_uses ATOMICALLY at redemption time.
-- Before: max_uses was only a soft read-time check in getPromoDiscount (intent-create),
-- and the RPC incremented used_count unconditionally — so N concurrent checkouts could
-- all pass the create-time check and push used_count well past max_uses (a "first 10
-- customers" code honored far more than 10 times). Now the increment is conditional on
-- staying under the cap; if the cap is already reached, the just-inserted redemption is
-- rolled back and the function returns FALSE. Idempotent (CREATE OR REPLACE), safe to re-run.

CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code_id  UUID,
  p_user_id  UUID,
  p_order_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_updated INT;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'redeem_promo_code requires a non-null order_id for idempotency';
  END IF;

  INSERT INTO public.promo_redemptions (code_id, user_id, order_id)
  VALUES (p_code_id, p_user_id, p_order_id)
  ON CONFLICT (order_id) WHERE order_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  -- Already redeemed under this order_id (idempotent replay / once-per-user dedup).
  IF v_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Atomically bump used_count ONLY while under the cap.
  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_code_id
    AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Cap already reached: undo the redemption we just booked and report failure.
  IF v_updated = 0 THEN
    DELETE FROM public.promo_redemptions WHERE id = v_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) TO service_role;
