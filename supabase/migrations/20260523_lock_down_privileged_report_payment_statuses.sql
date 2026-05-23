-- Browser clients can create unpaid/free report drafts, but privileged payment
-- states must come from trusted server-side payment or promo authorization.

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo', 'bypass')
  );

DROP POLICY IF EXISTS "Users update own reports" ON public.reports;
CREATE POLICY "Users update own reports" ON public.reports
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo', 'bypass')
  );
