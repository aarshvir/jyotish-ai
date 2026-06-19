-- Make standalone (synastry/kundali) purchases visible to their buyer (audit cycle 7, [4]+[13]).
--
-- #122 changed /api/user/payments to filter ziina_payments.user_id directly so
-- report-less standalone unlocks (report_id = NULL) show in the buyer's history.
-- But that route uses the RLS-enforced anon client, and the only SELECT policy on
-- ziina_payments still gates on report_id IN (user's reports) — which never matches
-- a report_id = NULL row. So standalone buyers STILL saw no receipt. Broaden the
-- policy to also allow owner reads via user_id, and backfill user_id on legacy
-- rows (the column was added later, ON DELETE SET NULL) so pre-existing
-- report-bound charges resolve under the new direct filter too. Idempotent.

UPDATE public.ziina_payments z
SET user_id = r.user_id
FROM public.reports r
WHERE z.report_id = r.id
  AND z.user_id IS NULL
  AND r.user_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view own ziina payments" ON public.ziina_payments;
CREATE POLICY "Users can view own ziina payments"
  ON public.ziina_payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
  );
