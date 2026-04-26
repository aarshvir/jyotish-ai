-- One-shot apply in Supabase SQL Editor (production) if migrations were not pushed.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE.

-- From 20260426_report_generation_log.sql
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS generation_log jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reports.generation_log IS
  'Ordered array of {ts, elapsed_ms, level, step, message, detail?} for each generation run.';

CREATE OR REPLACE FUNCTION public.append_report_generation_log(
  p_report_id uuid,
  p_user_id uuid,
  p_entry jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_len int;
BEGIN
  SELECT COALESCE(jsonb_array_length(r.generation_log), 0)
  INTO cur_len
  FROM public.reports r
  WHERE r.id = p_report_id AND r.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF cur_len >= 400 THEN
    RETURN;
  END IF;

  UPDATE public.reports
  SET
    generation_log = COALESCE(generation_log, '[]'::jsonb) || jsonb_build_array(p_entry),
    updated_at = NOW()
  WHERE id = p_report_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.append_report_generation_log(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_report_generation_log(uuid, uuid, jsonb) TO service_role;

-- From 20260427_reports_generation_trace_id.sql
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS generation_trace_id TEXT;

COMMENT ON COLUMN public.reports.generation_trace_id IS
  'Issued when generation starts; use for support and log correlation across pipeline and status API.';

-- From 20260428_reports_generation_trace_id_index.sql
CREATE INDEX IF NOT EXISTS reports_generation_trace_id_idx
  ON public.reports (generation_trace_id)
  WHERE generation_trace_id IS NOT NULL;
