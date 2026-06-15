-- Atomic, idempotent promo redemption.
--
-- Replaces the app's non-atomic "insert redemption + increment used_count" pair
-- (which could double-increment on retry) with a single function that:
--   1. inserts the redemption row, relying on the partial UNIQUE index on
--      order_id (idx_promo_redemptions_order_id_unique) to dedupe retries, and
--   2. increments promo_codes.used_count ONLY when a new row was actually inserted.
--
-- Returns TRUE when a new redemption was booked, FALSE when it was a duplicate
-- (idempotent no-op). Safe to re-run this migration.

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
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'redeem_promo_code requires a non-null order_id for idempotency';
  END IF;

  INSERT INTO public.promo_redemptions (code_id, user_id, order_id)
  VALUES (p_code_id, p_user_id, p_order_id)
  ON CONFLICT (order_id) WHERE order_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- A redemption for this order_id already exists → idempotent no-op.
    RETURN FALSE;
  END IF;

  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_code_id;

  RETURN TRUE;
END;
$$;

-- Service-role only (the app calls it via the service client); never client-callable.
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) TO service_role;
