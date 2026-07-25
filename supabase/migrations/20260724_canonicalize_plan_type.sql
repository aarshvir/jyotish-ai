-- Canonicalize plan_type so free/preview entitlement cannot be bypassed with
-- whitespace/case variants (e.g. ' free '). App code now normalizes at write
-- time; this cleans existing rows, strips leaked paid sections from those
-- rows, and hardens the one-free unique index.
-- Idempotent.

UPDATE public.reports
SET plan_type = lower(btrim(plan_type))
WHERE plan_type IS NOT NULL
  AND plan_type <> lower(btrim(plan_type));

-- Strip paid sections from free/preview rows that may have been stored in full
-- because a padded plan_type skipped orchestrator preview stripping. Same shape
-- as 20260619_strip_existing_free_report_data.sql.
UPDATE public.reports
SET report_data = jsonb_set(
      report_data - 'months' - 'weeks' - 'synthesis',
      '{days}',
      CASE
        WHEN jsonb_typeof(report_data -> 'days') = 'array'
             AND jsonb_array_length(report_data -> 'days') > 0
          THEN jsonb_build_array(report_data -> 'days' -> 0)
        ELSE COALESCE(report_data -> 'days', '[]'::jsonb)
      END
    )
WHERE lower(btrim(plan_type)) IN ('free', 'preview')
  AND report_data IS NOT NULL
  AND (
    report_data ? 'months'
    OR report_data ? 'weeks'
    OR report_data ? 'synthesis'
    OR (jsonb_typeof(report_data -> 'days') = 'array' AND jsonb_array_length(report_data -> 'days') > 1)
  );

-- If canonicalize created duplicate free/preview rows for one user, keep the
-- earliest and demote later ones so the unique index can be applied. Demoted
-- rows lose free entitlement (payment_status unpaid unless already paid/promo).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.reports
  WHERE lower(btrim(plan_type)) IN ('free', 'preview')
)
UPDATE public.reports r
SET
  plan_type = '7day',
  payment_status = CASE
    WHEN r.payment_status IN ('paid', 'promo') THEN r.payment_status
    ELSE 'unpaid'
  END
FROM ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

DROP INDEX IF EXISTS uniq_one_free_report_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_free_report_per_user
  ON public.reports (user_id)
  WHERE lower(btrim(plan_type)) IN ('free', 'preview');
