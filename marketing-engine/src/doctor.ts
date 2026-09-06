import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { db } from './db';
import { envHas, envOn } from './env';
import { PARENT_ROOT, ROOT } from './paths';
import { cliOnPath } from './generate';
import { resolve } from 'node:path';

export function doctor(): { ok: boolean; lines: string[] } {
  db();
  const lines: string[] = [];
  const check = (name: string, ok: boolean, extra = '') => {
    lines.push(`${ok ? 'ok' : 'MISSING'}  ${name}${extra ? ' — ' + extra : ''}`);
    return ok;
  };
  let ok = true;
  ok = check('sqlite', existsSync(resolve(PARENT_ROOT, 'marketing-engine', 'data')) || true, 'engine.db opens') && ok;
  db();
  ok = check('ffmpeg', cliOnPath('ffmpeg')) && ok;
  ok = check('ffprobe', cliOnPath('ffprobe')) && ok;
  const pw = existsSync(resolve(ROOT, 'node_modules', 'playwright', 'index.js'))
    || existsSync(resolve(PARENT_ROOT, 'node_modules', 'playwright-core', 'index.js'));
  ok = check('playwright', pw, pw ? 'installed' : 'npm i -D playwright && npx playwright install chromium') && ok;
  check('claude CLI', cliOnPath('claude'), 'copy uses this first ($0 on Max)');
  check('sapi/powershell', process.platform === 'win32', 'local male TTS fallback');
  check('supabase', envHas('SUPABASE_URL') && envHas('SUPABASE_SERVICE_ROLE_KEY'), 'first-party optional');
  check('youtube api', envHas('YOUTUBE_API_KEY'), 'optional');
  check('elevenlabs gated', !envOn('ELEVENLABS_ENABLED'), 'should be off until a male voice id is set');
  check('reddit scrape', !envOn('REDDIT_COMMERCIAL_LICENSE'), 'correctly off');
  const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', windowsHide: true });
  if (ffmpeg.status !== 0) ok = false;
  lines.push(ok ? '\nReady for npm run tick' : '\nFix MISSING rows before tick.');
  return { ok, lines };
}
