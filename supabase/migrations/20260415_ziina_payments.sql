-- Ziina payments log table
-- Each row records a verified Ziina payment intent.

CREATE TABLE IF NOT EXISTS ziina_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  ziina_intent_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,         -- in base currency units (fils / cents / paise)
  currency TEXT NOT NULL DEFAULT 'AED',
  plan_type TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ziina_payments_report ON ziina_payments(report_id);
CREATE INDEX IF NOT EXISTS idx_ziina_payments_intent ON ziina_payments(ziina_intent_id);

ALTER TABLE ziina_payments ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for inserts from verify route
