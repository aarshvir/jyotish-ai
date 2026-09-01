-- Atomic app-data deletion/de-identification for GDPR/DPDP account deletion.
-- PostgREST runs each RPC call in a single transaction, so any statement error rolls
-- back the whole cleanup instead of leaving partially erased user data.

CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id UUID, p_email TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Core PII tables (birth details, charts, generated reports, profile).
  DELETE FROM public.reports WHERE user_id = p_user_id;
  DELETE FROM public.kundali_charts WHERE user_id = p_user_id;
  DELETE FROM public.synastry_charts WHERE user_id = p_user_id;
  DELETE FROM public.user_profiles WHERE id = p_user_id;

  -- Product unlocks and tracking data.
  DELETE FROM public.user_kundali_unlock WHERE user_id = p_user_id;
  DELETE FROM public.user_synastry_unlock WHERE user_id = p_user_id;
  DELETE FROM public.promo_redemptions WHERE user_id = p_user_id;
  DELETE FROM public.analytics_events WHERE user_id = p_user_id;

  -- Retained legal/tax/support records are de-identified.
  UPDATE public.ziina_payments SET user_id = NULL WHERE user_id = p_user_id;
  UPDATE public.feedback SET user_id = NULL, email = NULL WHERE user_id = p_user_id;

  IF coalesce(btrim(p_email), '') <> '' THEN
    DELETE FROM public.newsletter_subscribers WHERE email = p_email;
    DELETE FROM public.promo_usage WHERE user_email = p_email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account_data(UUID, TEXT) TO service_role;
