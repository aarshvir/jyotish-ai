-- CRITICAL payment-bypass fix.
-- The 20260514 lockdown forbade browser (anon-key) clients from writing
-- payment_status='paid', but the app later began treating payment_status='promo'
-- as fully paid-equivalent (report content gate, ask Q&A, calendar export, upsell,
-- and the standalone Kundali/Synastry access gates all accept 'promo'). With only
-- 'paid' forbidden, an authenticated user could `update({ payment_status:'promo' })`
-- on their own report row straight from the browser and self-grant the entire paid
-- experience for free.
--
-- Forbid BOTH entitled statuses from client writes. 'paid' and 'promo' may only be
-- set by the trusted server-side (service-role) payment/promo finalization paths,
-- which bypass RLS. All other statuses a browser legitimately writes (bypass/free/
-- unpaid/etc.) remain allowed. Idempotent (DROP IF EXISTS + CREATE).

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo')
  );

DROP POLICY IF EXISTS "Users update own reports" ON public.reports;
CREATE POLICY "Users update own reports" ON public.reports
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo')
  );
