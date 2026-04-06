-- Razorpay payments log table
-- Each row records a verified Razorpay payment event.

CREATE TABLE IF NOT EXISTS razorpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,         -- in paise
  currency TEXT NOT NULL DEFAULT 'INR',
  plan_type TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rzp_payments_user ON razorpay_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rzp_payments_report ON razorpay_payments(report_id);

ALTER TABLE razorpay_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments; service role bypasses RLS
CREATE POLICY "Users can view own razorpay payments"
  ON razorpay_payments FOR SELECT
  USING (auth.uid() = user_id);
