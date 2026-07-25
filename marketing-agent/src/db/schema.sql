-- VedicHour Marketing Agent — SQLite schema (Phase 0)
-- One DB file at data/marketing.db. All loops read/write through src/db/index.ts.

CREATE TABLE IF NOT EXISTS content_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT NOT NULL,                         -- the content itself (or a path/ref to it)
  type TEXT NOT NULL,                          -- blog | reel | image | caption | ad_creative | email | script
  product TEXT,                                -- forecast | kundali | matchmaking
  script_source TEXT,                          -- where the idea came from (keyword, remix-of, etc.)
  status TEXT NOT NULL DEFAULT 'draft',        -- draft | ready | published | archived
  perf_score REAL NOT NULL DEFAULT 0,
  meta TEXT,                                   -- JSON blob (per-platform captions, prompts, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id TEXT NOT NULL,                     -- content_library.id or an external id
  channel TEXT NOT NULL,                       -- youtube | instagram | facebook | google_ads | meta_ads | blog | email | whatsapp
  metric TEXT NOT NULL,                        -- views | ctr | sessions | signups | sales | cpa | roas | spend
  value REAL NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id TEXT NOT NULL,
  product TEXT,                                -- forecast | kundali | matchmaking
  amount REAL,
  currency TEXT,
  first_touch TEXT,                            -- first channel/creative seen
  last_touch TEXT,                             -- last channel/creative before sale
  creative_id TEXT,                            -- content_library.id credited
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact TEXT NOT NULL,                       -- email or phone (E.164)
  channel TEXT NOT NULL,                       -- email | whatsapp
  opted_in_at TEXT,
  source TEXT,                                 -- free_kundli | checkout | import
  suppressed INTEGER NOT NULL DEFAULT 0,       -- 1 = do not contact (unsub / bounce / EU)
  suppressed_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(contact, channel)
);

CREATE TABLE IF NOT EXISTS approval_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL,                          -- the text/asset under review
  lane TEXT NOT NULL,                          -- A | B | C
  linter_verdict TEXT,                         -- pass | flag | block
  linter_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected
  channel TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trust_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL UNIQUE,                -- per-channel trust state
  linter_human_matches INTEGER NOT NULL DEFAULT 0,
  linter_human_total INTEGER NOT NULL DEFAULT 0,
  auto_publish INTEGER NOT NULL DEFAULT 0,     -- 0 = human approves new creative; 1 = linter-pass auto-publishes
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runs_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loop TEXT NOT NULL,                          -- job / loop name
  cli TEXT,                                    -- gemini | codex | claude | (none)
  tier TEXT,                                   -- bulk | smart | code
  status TEXT NOT NULL,                        -- started | ok | error | killed | skipped
  detail TEXT,
  tokens_est INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

-- L4 creative engine (src/loops/creative.ts). Every variant it generates lands here —
-- winners with a tournament_rank and status 'ready_to_render', losers with the exact
-- reason they died, so the next batch can learn from them. Additive + idempotent.
CREATE TABLE IF NOT EXISTS creative_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,                      -- one creative-loop run
  idea_id TEXT NOT NULL,
  family TEXT,                                 -- decision_moment | cost_time_anchor | respectful_contrarian
  angle TEXT,
  variant_index INTEGER NOT NULL DEFAULT 0,
  hook_text TEXT,                              -- the first frame, must land in <1.0s
  spoken_script TEXT,
  language TEXT NOT NULL DEFAULT 'hinglish',
  status TEXT NOT NULL DEFAULT 'rejected',     -- ready_to_render | needs_review | rejected
  lint_verdict TEXT,                           -- pass | flag | block
  lint_reason TEXT,
  hook_strength REAL NOT NULL DEFAULT 0,
  specificity REAL NOT NULL DEFAULT 0,
  credibility REAL NOT NULL DEFAULT 0,
  brand_safety REAL NOT NULL DEFAULT 0,        -- below the floor = hard reject, whatever else scored
  producibility REAL NOT NULL DEFAULT 0,
  total_score REAL NOT NULL DEFAULT 0,
  tournament_rank INTEGER,
  rejection_reason TEXT,                       -- why it died (the learning signal)
  payload TEXT,                                -- full variant JSON (shots, captions, hashtags, yt copy)
  asset_path TEXT,                             -- output/creative/<date>-<slug>.json for winners
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_perf_entity ON performance(entity_id);
CREATE INDEX IF NOT EXISTS idx_perf_metric ON performance(metric);
CREATE INDEX IF NOT EXISTS idx_runs_loop ON runs_log(loop);
CREATE INDEX IF NOT EXISTS idx_runs_ts ON runs_log(ts);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_library(status);

-- Phase 3 (render pipeline) — every paid AI-video generation is recorded here.
-- src/render/budget.ts is the ONLY writer; it refuses any render that would breach a cap.
CREATE TABLE IF NOT EXISTS video_spend (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,                        -- one render invocation (uuid-ish)
  slug TEXT,                                   -- creative slug being rendered
  shot_id TEXT,                                -- which shot in the reel
  provider TEXT NOT NULL,                      -- veo31_fast | kling30 | wan26 | seedance2_fast | screencap | placeholder
  model TEXT,                                  -- resolved fal endpoint id
  seconds REAL NOT NULL DEFAULT 0,             -- billed seconds
  cost_usd REAL NOT NULL DEFAULT 0,            -- ACTUAL charged cost (0 for free/dry providers)
  estimated_usd REAL NOT NULL DEFAULT 0,       -- what we predicted before the call
  status TEXT NOT NULL DEFAULT 'ok',           -- ok | error | refused | dry
  detail TEXT,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_video_spend_ts ON video_spend(ts);
CREATE INDEX IF NOT EXISTS idx_video_spend_run ON video_spend(run_id);
