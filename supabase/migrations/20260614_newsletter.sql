-- Newsletter subscribers (captured via the signup widget; reviewed/exported in /admin/newsletter). Idempotent.
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  email TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_newsletter_created ON public.newsletter_subscribers(created_at DESC);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- No RLS policies: writes (API) and reads (admin) use the service role.
