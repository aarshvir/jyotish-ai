-- Remove paid personalized answers that were persisted into reports whose owners
-- are not entitled to read them. report_data is directly readable by the owner
-- through RLS, so API response projection alone cannot protect these fields.
--
-- Full personalization on paid/promo reports remains untouched. "bypass" rows are
-- admin-generated reports and remain available to the owning admin. Idempotent:
-- only rows that still contain a full personalized object are updated.

UPDATE public.reports
SET report_data = report_data - 'personalized'
WHERE report_data IS NOT NULL
  AND report_data -> 'personalized' ->> 'tier' = 'full'
  AND COALESCE(payment_status, '') NOT IN ('paid', 'promo', 'bypass');
