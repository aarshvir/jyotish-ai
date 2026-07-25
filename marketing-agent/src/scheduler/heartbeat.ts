import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';

export const HEARTBEAT_FILE = resolve(ROOT, 'data', 'heartbeat.json');

type Heartbeat = Record<string, { at: string; detail: string }> & {
  _last?: { loop: string; at: string };
};

export function writeHeartbeat(loop: string, detail = ''): void {
  let hb: Heartbeat = {};
  if (existsSync(HEARTBEAT_FILE)) {
    try {
      hb = JSON.parse(readFileSync(HEARTBEAT_FILE, 'utf8'));
    } catch {
      hb = {};
    }
  }
  const at = new Date().toISOString();
  hb[loop] = { at, detail };
  hb._last = { loop, at };
  writeFileSync(HEARTBEAT_FILE, JSON.stringify(hb, null, 2));
}

export function readHeartbeat(): Heartbeat {
  if (!existsSync(HEARTBEAT_FILE)) return {};
  try {
    return JSON.parse(readFileSync(HEARTBEAT_FILE, 'utf8'));
  } catch {
    return {};
  }
}
