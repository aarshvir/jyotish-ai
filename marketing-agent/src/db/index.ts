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

/**
 * Additive column migrations. `CREATE TABLE IF NOT EXISTS` in schema.sql is a no-op on a database
 * that already exists, so a column added to an existing table has to be ALTERed in — and SQLite
 * has no `ADD COLUMN IF NOT EXISTS`. Each entry is applied only when PRAGMA table_info says it is
 * missing, which makes this idempotent and safe to run on every open.
 */
const COLUMN_MIGRATIONS: { table: string; column: string; ddl: string }[] = [
  // Hook taxonomy (src/taxonomy.ts) — the join key between a creative's SHAPE and its results.
  { table: 'creative_variants', column: 'hook_family', ddl: 'ALTER TABLE creative_variants ADD COLUMN hook_family TEXT' },
  { table: 'creative_variants', column: 'decision_domain', ddl: 'ALTER TABLE creative_variants ADD COLUMN decision_domain TEXT' },
  { table: 'creative_variants', column: 'emotional_register', ddl: 'ALTER TABLE creative_variants ADD COLUMN emotional_register TEXT' },
  { table: 'creative_variants', column: 'duration_target_sec', ddl: 'ALTER TABLE creative_variants ADD COLUMN duration_target_sec REAL' },
  { table: 'creative_variants', column: 'explore', ddl: 'ALTER TABLE creative_variants ADD COLUMN explore INTEGER NOT NULL DEFAULT 0' },
];

function migrate(d: Database.Database): void {
  for (const m of COLUMN_MIGRATIONS) {
    const cols = d.prepare(`PRAGMA table_info(${m.table})`).all() as { name: string }[];
    if (!cols.length) continue; // table itself is absent — schema.sql owns creating it
    if (cols.some((c) => c.name === m.column)) continue;
    d.exec(m.ddl);
  }
  d.exec('CREATE INDEX IF NOT EXISTS idx_creative_variants_tags ON creative_variants(hook_family, decision_domain)');
}

/** Open (and lazily initialise) the singleton SQLite connection. */
export function db(): Database.Database {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
  migrate(_db);
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
