-- Browser clients may create/update their own report rows, but "paid" must only
-- be written by trusted server-side payment finalization paths.

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') <> 'paid'
  );

DROP POLICY IF EXISTS "Users update own reports" ON public.reports;
CREATE POLICY "Users update own reports" ON public.reports
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') <> 'paid'
  );
