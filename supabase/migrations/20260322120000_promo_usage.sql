-- Run in Supabase SQL editor if migrations are not applied via CLI.
CREATE TABLE IF NOT EXISTS promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  user_email TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  report_id UUID
);

CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_usage (code);
CREATE INDEX IF NOT EXISTS idx_promo_usage_user_email ON promo_usage (user_email);

-- Enable RLS — only service role can read/write promo_usage (via admin client in checkout flow).
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon users — all access goes through service role.
-- If a user-facing SELECT is ever needed, add an explicit policy here.
