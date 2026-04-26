-- Nullable metadata when status = 'error' (orchestrator + cron + inngest).
alter table public.reports
  add column if not exists generation_error_code text,
  add column if not exists generation_error_at_phase text;

comment on column public.reports.generation_error_code is
  'Stable machine code for failed generation (e.g. BUDGET_EXCEEDED, EPHEMERIS_DOWN).';
comment on column public.reports.generation_error_at_phase is
  'Pipeline phase slug when failure occurred (matches generation_step vocabulary).';
