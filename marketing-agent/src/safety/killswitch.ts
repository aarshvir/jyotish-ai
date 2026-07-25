import { existsSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';

/** The kill-switch file. Its mere existence halts every spending/sending loop. */
export const KILL_FILE = resolve(ROOT, 'data', 'KILL');

export function isKilled(): boolean {
  return existsSync(KILL_FILE);
}

export function engageKill(reason = 'manual'): void {
  writeFileSync(KILL_FILE, JSON.stringify({ engaged_at: new Date().toISOString(), reason }, null, 2));
}

export function releaseKill(): void {
  rmSync(KILL_FILE, { force: true });
}

export function killInfo(): { engaged_at: string; reason: string } | null {
  if (!existsSync(KILL_FILE)) return null;
  try {
    return JSON.parse(readFileSync(KILL_FILE, 'utf8'));
  } catch {
    return { engaged_at: 'unknown', reason: 'unknown' };
  }
}
