import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR, DB_PATH } from './paths';

export function openDb(path = DB_PATH): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ideas (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      score REAL NOT NULL,
      concern TEXT NOT NULL,
      ads_allowed INTEGER NOT NULL,
      rationale TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_slug TEXT NOT NULL,
      kind TEXT NOT NULL,
      lang TEXT NOT NULL,
      body TEXT NOT NULL,
      ok INTEGER NOT NULL,
      errors TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_slug TEXT NOT NULL,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_slug TEXT,
      channel TEXT NOT NULL,
      paying_customers INTEGER NOT NULL,
      cac_usd REAL,
      ltv_usd REAL,
      d30_retention REAL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loop_name TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export function logRun(db: DatabaseSync, loopName: string, status: string, detail: string): void {
  db.prepare(`INSERT INTO runs (loop_name, status, detail, created_at) VALUES (?, ?, ?, ?)`).run(
    loopName,
    status,
    detail.slice(0, 500),
    new Date().toISOString(),
  );
}
