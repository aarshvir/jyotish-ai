-- Capture a contact phone number with each report so the owner can call the
-- seeker to discuss their reading. Safe to re-run (IF NOT EXISTS).
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS phone TEXT;
