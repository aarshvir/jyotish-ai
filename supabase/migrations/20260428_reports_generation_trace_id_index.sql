-- Speed admin / support lookups by correlation trace.

CREATE INDEX IF NOT EXISTS reports_generation_trace_id_idx
  ON public.reports (generation_trace_id)
  WHERE generation_trace_id IS NOT NULL;
