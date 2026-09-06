PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  angle TEXT NOT NULL,
  category TEXT NOT NULL,
  sources_json TEXT NOT NULL DEFAULT '[]',
  search_demand REAL NOT NULL,
  emotional_pull REAL NOT NULL,
  uniqueness REAL NOT NULL,
  product_fit REAL NOT NULL,
  score REAL NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog',
  weight REAL NOT NULL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id),
  kind TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  body_json TEXT NOT NULL,
  lint_pass INTEGER NOT NULL,
  lint_report TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id),
  draft_id INTEGER,
  kind TEXT NOT NULL,
  aspect TEXT,
  path TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  folder TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT,
  best_time TEXT,
  why TEXT,
  policy_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  structure_json TEXT NOT NULL,
  spend_status TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS funnel_snapshots (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  paying_customers INTEGER NOT NULL,
  trials INTEGER NOT NULL,
  ltv_estimate REAL,
  cac_ceiling REAL,
  payload_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  idea_id INTEGER,
  asset_id INTEGER,
  channel TEXT,
  event TEXT NOT NULL,
  value REAL,
  utm TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS learnings (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  idea_id INTEGER,
  finding TEXT NOT NULL,
  evidence TEXT NOT NULL,
  weight_delta REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  severity TEXT NOT NULL,
  scope TEXT NOT NULL,
  rule TEXT NOT NULL UNIQUE,
  evidence TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  loop TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY,
  ts TEXT NOT NULL DEFAULT (datetime('now')),
  item TEXT NOT NULL,
  lane TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_score ON ideas(score DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_idea ON drafts(idea_id, kind);
CREATE INDEX IF NOT EXISTS idx_runs_loop ON runs(loop, ts DESC);
