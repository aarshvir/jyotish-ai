import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
/** marketing-agent/ project root */
export const ROOT = resolve(here, '..', '..');
export const DATA_DIR = resolve(ROOT, 'data');
const DB_PATH = resolve(DATA_DIR, 'marketing.db');
const SCHEMA_PATH = resolve(here, 'schema.sql');

let _db: Database.Database | null = null;

/** Open (and lazily initialise) the singleton SQLite connection. */
export function db(): Database.Database {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  return _db;
}

/** Apply the schema and return the table list (used by `db:init` / `doctor`). */
export function initDb(): { path: string; tables: string[] } {
  const d = db();
  const tables = d
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r: any) => r.name as string);
  return { path: DB_PATH, tables };
}

export interface RunLogEntry {
  loop: string;
  cli?: string | null;
  tier?: string | null;
  status: 'started' | 'ok' | 'error' | 'killed' | 'skipped';
  detail?: string | null;
  tokens_est?: number;
  duration_ms?: number;
}

/** Append a row to runs_log. Every loop/job/brain call should log through here. */
export function logRun(e: RunLogEntry): void {
  db()
    .prepare(
      `INSERT INTO runs_log (loop, cli, tier, status, detail, tokens_est, duration_ms)
       VALUES (@loop, @cli, @tier, @status, @detail, @tokens_est, @duration_ms)`,
    )
    .run({
      loop: e.loop,
      cli: e.cli ?? null,
      tier: e.tier ?? null,
      status: e.status,
      detail: e.detail ?? null,
      tokens_est: e.tokens_est ?? 0,
      duration_ms: e.duration_ms ?? null,
    });
}

/** Queue an item for human review (policy escalations, flagged creative, etc.). */
export function enqueueApproval(e: {
  item: string;
  lane: 'A' | 'B' | 'C';
  linter_verdict?: string | null;
  linter_reason?: string | null;
  channel?: string | null;
}): number {
  const info = db()
    .prepare(
      `INSERT INTO approval_queue (item, lane, linter_verdict, linter_reason, channel)
       VALUES (@item, @lane, @linter_verdict, @linter_reason, @channel)`,
    )
    .run({
      item: e.item,
      lane: e.lane,
      linter_verdict: e.linter_verdict ?? null,
      linter_reason: e.linter_reason ?? null,
      channel: e.channel ?? null,
    });
  return Number(info.lastInsertRowid);
}
