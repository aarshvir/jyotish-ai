-- Visitor feedback (shown as a floating widget; reviewed in /admin/feedback). Idempotent.
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  brought_by TEXT,           -- what brought them to the site
  rating INT,                -- optional 1-5
  message TEXT NOT NULL,     -- what they'd like better / general comments
  path TEXT,                 -- page they were on
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
-- No RLS policies: writes (API) and reads (admin) both use the service role.
