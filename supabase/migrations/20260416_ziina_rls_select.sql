-- Allow authenticated users to read their own Ziina payments.
-- ziina_payments has no user_id column, so we join via reports.
CREATE POLICY "Users can view own ziina payments"
  ON ziina_payments FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM reports WHERE user_id = auth.uid()
    )
  );
