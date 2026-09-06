import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..');
export const DATA_DIR = resolve(ROOT, 'data');
export const OUT_DIR = resolve(ROOT, 'out');
export const READY_DIR = resolve(ROOT, 'ready-to-post');
export const CONFIG_DIR = resolve(ROOT, 'config');
export const EVIDENCE_DIR = resolve(ROOT, 'evidence');
export const LEARNINGS_FILE = resolve(ROOT, 'learnings.md');
export const DB_PATH = resolve(DATA_DIR, 'engine.db');
export const PARENT_ROOT = resolve(ROOT, '..');
