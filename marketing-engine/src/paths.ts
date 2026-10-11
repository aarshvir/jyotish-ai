import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
export const ENGINE_ROOT = resolve(here, '..');
export const REPO_ROOT = resolve(ENGINE_ROOT, '..');
export const DATA_DIR = resolve(ENGINE_ROOT, 'data');
export const DB_PATH = resolve(DATA_DIR, 'engine.db');
