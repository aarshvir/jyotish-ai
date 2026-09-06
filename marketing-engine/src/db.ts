import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_DIR, DB_PATH, ROOT } from './paths';

function named(obj: Record<string, unknown>): Record<string, SQLInputValue> {
  const out: Record<string, SQLInputValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[/^[@:$]/.test(k) ? k : `@${k}`] = v as SQLInputValue;
  }
  return out;
}

function wrapStmt(stmt: ReturnType<DatabaseSync['prepare']>) {
  const bind = (args: unknown[]): SQLInputValue[] | [Record<string, SQLInputValue>] => {
    if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      return [named(args[0] as Record<string, unknown>)];
    }
    return args as SQLInputValue[];
  };
  return {
    run: (...args: unknown[]) => {
      const b = bind(args);
      return Array.isArray(b) && typeof b[0] === 'object' && !Array.isArray(b[0]) && b.length === 1
        ? stmt.run(b[0] as Record<string, SQLInputValue>)
        : stmt.run(...(b as SQLInputValue[]));
    },
    get: <T = Record<string, unknown>>(...args: unknown[]): T | undefined => {
      const b = bind(args);
      const row =
        Array.isArray(b) && typeof b[0] === 'object' && !Array.isArray(b[0]) && b.length === 1
          ? stmt.get(b[0] as Record<string, SQLInputValue>)
          : stmt.get(...(b as SQLInputValue[]));
      return row as T | undefined;
    },
    all: <T = Record<string, unknown>>(...args: unknown[]): T[] => {
      const b = bind(args);
      const rows =
        Array.isArray(b) && typeof b[0] === 'object' && !Array.isArray(b[0]) && b.length === 1
          ? stmt.all(b[0] as Record<string, SQLInputValue>)
          : stmt.all(...(b as SQLInputValue[]));
      return rows as T[];
    },
  };
}

export class EngineDb {
  constructor(private raw: DatabaseSync) {}
  exec(sql: string): void {
    this.raw.exec(sql);
  }
  prepare(sql: string) {
    return wrapStmt(this.raw.prepare(sql));
  }
  transaction(fn: () => void): () => void {
    return () => {
      this.raw.exec('BEGIN');
      try {
        fn();
        this.raw.exec('COMMIT');
      } catch (e) {
        try {
          this.raw.exec('ROLLBACK');
        } catch {
          /* ignore */
        }
        throw e;
      }
    };
  }
}

let _db: EngineDb | null = null;

export function db(): EngineDb {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const raw = new DatabaseSync(DB_PATH);
  raw.exec('PRAGMA journal_mode = WAL');
  raw.exec('PRAGMA busy_timeout = 5000');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec(readFileSync(resolve(ROOT, 'src', 'schema.sql'), 'utf8'));
  _db = new EngineDb(raw);
  seedLessons(_db);
  return _db;
}

export function logRun(loop: string, status: string, detail?: string, durationMs?: number): void {
  db()
    .prepare(`INSERT INTO runs (loop, status, detail, duration_ms) VALUES (?, ?, ?, ?)`)
    .run(loop, status, detail ?? null, durationMs ?? null);
}

const OWNER_LESSONS: { source: string; severity: string; scope: string; rule: string; evidence: string }[] = [
  {
    source: 'owner',
    severity: 'critical',
    scope: 'voice',
    rule: 'Never use a synthetic female narrator — one male timbre for the whole reel, Veo-native or local/Sarvam male only.',
    evidence: 'Owner 2026-07-26: the second (female neural) voice read as AI-generated.',
  },
  {
    source: 'owner',
    severity: 'critical',
    scope: 'capture',
    rule: 'Product shots show the report hour-slots and what-to-do-when, never pricing/checkout/onboard.',
    evidence: 'Owner 2026-07-26: platform scrolling showed payment, not the report.',
  },
  {
    source: 'owner',
    severity: 'high',
    scope: 'script',
    rule: 'No engine jargon in ads: never Swiss Ephemeris, Lahiri, ayanamsa, sidereal, whole-sign, vimshottari.',
    evidence: 'Owner 2026-07-26: nobody cares, including him.',
  },
  {
    source: 'owner',
    severity: 'critical',
    scope: 'script',
    rule: 'Every reel names VedicHour on camera and shows vedichour.com on the end card. He says the name, not the URL.',
    evidence: 'Owner ruling on closers that sounded like an ad-read of a web address.',
  },
];

function seedLessons(d: EngineDb): void {
  const ins = d.prepare(
    `INSERT INTO lessons (source, severity, scope, rule, evidence, active)
     VALUES (@source, @severity, @scope, @rule, @evidence, 1)
     ON CONFLICT(rule) DO NOTHING`,
  );
  const tx = d.transaction(() => {
    for (const l of OWNER_LESSONS) ins.run(l);
  });
  tx();
}

export function activeLessonRules(scope?: string): string[] {
  const rows = scope
    ? db().prepare(`SELECT rule FROM lessons WHERE active=1 AND scope=?`).all<{ rule: string }>(scope)
    : db().prepare(`SELECT rule FROM lessons WHERE active=1`).all<{ rule: string }>();
  return rows.map((r) => r.rule);
}
