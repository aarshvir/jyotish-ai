-- Append-only JSON log per report row for pipeline debugging (service + owner read).
-- Capped in-app at 400 lines per report to control row size.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS generation_log jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.reports.generation_log IS
  'Ordered array of {ts, elapsed_ms, level, step, message, detail?} for each generation run.';

-- SECURITY DEFINER: server calls with service role; still scope by user_id.
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
