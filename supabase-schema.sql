CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  reports_used_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE birth_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  birth_city TEXT NOT NULL,
  birth_lat DECIMAL,
  birth_lng DECIMAL,
  current_city TEXT,
  current_lat DECIMAL,
  current_lng DECIMAL,
  lagna TEXT,
  moon_sign TEXT,
  moon_nakshatra TEXT,
  dasha_sequence JSONB,
  nativity_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_chart_id UUID REFERENCES birth_charts(id),
  report_type TEXT NOT NULL,
  date_from DATE,
  date_to DATE,
  status TEXT DEFAULT 'pending',
  output_json JSONB,
  file_url TEXT,
  agent_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_payment_id TEXT,
  report_id UUID REFERENCES reports(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE birth_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own birth charts" ON birth_charts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reports" ON reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Function to increment reports used this month
CREATE OR REPLACE FUNCTION increment_reports_used(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET reports_used_this_month = reports_used_this_month + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_birth_charts_user_id ON birth_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_birth_chart_id ON reports(birth_chart_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
