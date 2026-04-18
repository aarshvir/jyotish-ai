-- Pillar 1: Resumable pipeline checkpoints
-- Allows generateReportPipeline to resume from the last completed phase
-- rather than restarting from scratch when Inngest retries a failed step.
--
-- pipeline_checkpoint: last completed phase name
--   values: 'ephemeris' | 'nativity_grids' | 'commentary' | 'monthly' | 'weekly' | 'validation' | 'assembled'
-- pipeline_state: intermediate data produced by completed phases (small blobs only —
--   ephemeris data, nativity profile, day scores, raw grids, etc.)
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS pipeline_checkpoint TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_state JSONB;

CREATE INDEX IF NOT EXISTS idx_reports_pipeline_checkpoint
  ON reports (pipeline_checkpoint)
  WHERE pipeline_checkpoint IS NOT NULL;
