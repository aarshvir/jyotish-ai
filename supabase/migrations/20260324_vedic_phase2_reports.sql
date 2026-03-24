-- Run in Supabase SQL Editor after backup.
-- If an older `reports` table exists (jyotish-ai legacy), rename or drop it first:
--   ALTER TABLE public.reports RENAME TO reports_legacy;

-- ══════════════════════════════════════
-- TABLE: user_consent
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  consent_given_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT NOT NULL DEFAULT '2026-03-22',
  explicitly_checked BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT one_consent_per_user_version UNIQUE(user_id, terms_version)
);

ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own consent" ON user_consent;
CREATE POLICY "Users read own consent" ON user_consent FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own consent" ON user_consent;
CREATE POLICY "Users insert own consent" ON user_consent FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own consent" ON user_consent;
CREATE POLICY "Users update own consent" ON user_consent FOR UPDATE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- TABLE: reports (VedicHour — full pipeline replay)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  native_name TEXT NOT NULL,
  user_email TEXT,
  birth_date DATE NOT NULL,
  birth_time TEXT NOT NULL,
  birth_city TEXT NOT NULL,
  birth_lat NUMERIC,
  birth_lng NUMERIC,
  current_city TEXT,
  current_lat NUMERIC,
  current_lng NUMERIC,
  timezone_offset INTEGER,
  plan_type TEXT NOT NULL DEFAULT '7day',
  report_start_date DATE,
  report_end_date DATE,
  lagna_sign TEXT,
  moon_sign TEXT,
  moon_nakshatra TEXT,
  dasha_mahadasha TEXT,
  dasha_antardasha TEXT,
  day_scores JSONB,
  report_data JSONB,
  status TEXT NOT NULL DEFAULT 'generating',
  generation_started_at TIMESTAMPTZ DEFAULT NOW(),
  generation_completed_at TIMESTAMPTZ,
  generation_time_seconds INTEGER,
  payment_status TEXT DEFAULT 'bypass',
  payment_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_email ON reports(user_email);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own reports" ON reports;
CREATE POLICY "Users see own reports" ON reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own reports" ON reports;
CREATE POLICY "Users insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own reports" ON reports;
CREATE POLICY "Users update own reports" ON reports FOR UPDATE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- TABLE: user_profiles
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  default_birth_date DATE,
  default_birth_time TEXT,
  default_birth_city TEXT,
  default_birth_lat NUMERIC,
  default_birth_lng NUMERIC,
  default_current_city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;
CREATE POLICY "Users manage own profile" ON user_profiles FOR ALL USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
