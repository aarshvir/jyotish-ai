-- Track real-time pipeline progress so the client can show accurate % + phase label.
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS generation_step TEXT,
  ADD COLUMN IF NOT EXISTS generation_progress INTEGER;
