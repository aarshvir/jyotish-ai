-- CRITICAL payment-bypass fix (#208 regression).
--
-- 20260617 forbade browser clients from writing payment_status 'paid'/'promo'
-- because those statuses unlock Ask Q&A, hourly prose, personalized answers,
-- status-payload content, and the cheaper 7-day→monthly upgrade.
--
-- #208 then folded 'bypass' into isEntitledPaymentStatus() and pointed those
-- same gates at it, while:
--   * RLS still allowed clients to INSERT/UPDATE payment_status='bypass'
--   * the report page's createReportRecord() wrote 'bypass' as the default
--   * the column DEFAULT was still 'bypass'
--
-- Trigger: a signed-in user opens /report/{fresh-uuid}?type=7day&lat=…&lng=…
-- The browser inserts a row with payment_status='bypass'. /api/reports/start
-- correctly 402s (no Ziina payment), but does not rewrite the row. The user
-- can then POST /api/reports/{id}/ask (and personalized / hourly-day /
-- upgrade) because isEntitledPaymentStatus('bypass') is true.
--
-- 'bypass' remains a real admin/e2e grant — but only via service-role paths
-- (reports/start, record-bypass-report). Idempotent (DROP IF EXISTS + CREATE).

ALTER TABLE public.reports ALTER COLUMN payment_status SET DEFAULT 'unpaid';

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

-- Demote leftover client-written bypass rows that never completed payment or
-- generation. Leave completed admin/e2e grants (status='complete' with
-- report_data) and any row that actually collected a Ziina completion.
UPDATE public.reports r
SET payment_status = CASE
  WHEN COALESCE(r.plan_type, '') IN ('free', 'preview') THEN 'free'
  ELSE 'unpaid'
END
WHERE r.payment_status = 'bypass'
  AND r.status IN ('generating', 'pending')
  AND r.generation_completed_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.ziina_payments z
    WHERE z.report_id = r.id
      AND z.status = 'completed'
  );
