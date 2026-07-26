-- PUBLISH GATE tables. Applied by src/audit/store.ts against the same data/marketing.db
-- as src/db/schema.sql (kept separate so concurrent work on the main schema can't conflict).
-- Additive + idempotent.

-- STAGE 4 — the owner approval gate. NOTHING may be published unless a row here says 'approved'.
CREATE TABLE IF NOT EXISTS publish_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  verdict TEXT NOT NULL,                       -- ship | ship_with_notes | block (from the review)
  review_path TEXT,                            -- output/reels/<slug>/REVIEW.md
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected | superseded
  owner_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pub_appr_slug ON publish_approvals(slug);
CREATE INDEX IF NOT EXISTS idx_pub_appr_status ON publish_approvals(status);

-- STAGE 3 — auto-fixable findings the render/assembly path can consume and redo at $0.
CREATE TABLE IF NOT EXISTS fix_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  run_id TEXT NOT NULL,
  lens TEXT,
  severity TEXT NOT NULL,
  timestamp TEXT,
  issue TEXT NOT NULL,
  fix TEXT NOT NULL,
  fix_class TEXT NOT NULL DEFAULT 'auto_fixable',
  status TEXT NOT NULL DEFAULT 'open',         -- open | consumed | dismissed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_fix_queue_slug ON fix_queue(slug, status);

-- The review spend ledger. Mirrors src/render/budget.ts: the ONLY writer is src/audit/store.ts,
-- and no paid review call may be made without a checkReviewBudget() allowance first.
-- CLI (subscription) reviews are logged here too, at cost 0, so the ledger shows what ran.
CREATE TABLE IF NOT EXISTS review_spend (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  slug TEXT,
  lens TEXT,
  provider TEXT NOT NULL,                      -- codex_cli | claude_cli | openai_api
  model TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  images INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  estimated_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',           -- ok | error | refused
  detail TEXT,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_review_spend_slug ON review_spend(slug);
CREATE INDEX IF NOT EXISTS idx_review_spend_ts ON review_spend(ts);

-- STAGE 0 — every pre-flight decision, so we can prove money was only spent on a clean plan.
CREATE TABLE IF NOT EXISTS preflight_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  ok INTEGER NOT NULL,
  blocks INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  detail TEXT,                                 -- JSON: the full block/warning list
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_preflight_slug ON preflight_runs(slug);
