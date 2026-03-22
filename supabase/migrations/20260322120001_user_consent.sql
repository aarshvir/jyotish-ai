-- Run in Supabase SQL Editor if migrations are not applied automatically.
CREATE TABLE IF NOT EXISTS user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  consent_given_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT NOT NULL DEFAULT '2026-03-22',
  privacy_version TEXT NOT NULL DEFAULT '2026-03-22',
  refund_version TEXT NOT NULL DEFAULT '2026-03-22',
  terms_url TEXT DEFAULT 'https://vedichour.com/terms',
  privacy_url TEXT DEFAULT 'https://vedichour.com/privacy',
  refund_url TEXT DEFAULT 'https://vedichour.com/refund',
  explicitly_checked BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT one_consent_per_user_version
    UNIQUE(user_id, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_consent_user_id
  ON user_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_email
  ON user_consent(user_email);

ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own consent" ON user_consent;
DROP POLICY IF EXISTS "Users can read own consent" ON user_consent;
DROP POLICY IF EXISTS "Service role reads all" ON user_consent;

CREATE POLICY "Users can insert own consent"
  ON user_consent FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own consent"
  ON user_consent FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role reads all"
  ON user_consent FOR SELECT
  USING (auth.role() = 'service_role');
