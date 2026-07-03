-- Email suppression list for one-click unsubscribe (RFC 8058) + CAN-SPAM compliance.
-- Marketing/nurture sends check this before emailing; /api/unsubscribe writes to it.
-- Service-role only (RLS on, no client policies) — the app reads/writes via the
-- service client, which bypasses RLS. Idempotent.

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email      TEXT PRIMARY KEY,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
-- No client policies: anon/authenticated get zero access; service_role bypasses RLS.
