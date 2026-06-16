-- Idempotency marker for the "your report is ready" email + WhatsApp notification.
-- notifyReportReady() is called inside a retryable Inngest finalize step, so without a
-- claim a step retry re-sends the email AND the WhatsApp (real Twilio cost + spam). A
-- conditional `UPDATE ... SET notify_sent_at = now() WHERE id = ? AND notify_sent_at IS
-- NULL` lets exactly one finalize win and send. Nullable, no backfill, safe to re-run.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS notify_sent_at TIMESTAMPTZ;
