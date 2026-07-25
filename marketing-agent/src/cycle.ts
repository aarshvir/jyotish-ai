import { pathToFileURL } from 'node:url';
import { runBlogLoop } from './loops/blog';
import { runReelLoop } from './loops/video';
import { runPublishPrep } from './loops/publish-prep';
import { runSocialLoop } from './loops/social';
import { isKilled, killInfo } from './safety/killswitch';
import { logRun } from './db/index';
import { writeHeartbeat } from './scheduler/heartbeat';

/**
 * The daily content cycle — one kill-aware pass over the organic loops.
 * This is what the Windows scheduler runs; it's the "hands-off engine" entrypoint.
 * Each loop is independently kill-aware and policy-gated; one failing loop never
 * stops the others (logged, then continue).
 */
export async function runCycle(): Promise<void> {
  if (isKilled()) {
    console.log(`[cycle] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping the whole cycle.`);
    logRun({ loop: 'cycle', status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  const t0 = Date.now();
  console.log('[cycle] === VedicHour daily content cycle ===');
  logRun({ loop: 'cycle', status: 'started' });

  const steps: [string, () => Promise<void>][] = [
    ['blog', () => runBlogLoop({})],
    ['reel', () => runReelLoop({})],
    ['publish', () => runPublishPrep()],
    ['social', () => runSocialLoop()],
  ];

  for (const [name, fn] of steps) {
    if (isKilled()) {
      console.log('[cycle] kill-switch tripped mid-cycle — stopping.');
      break;
    }
    console.log(`\n[cycle] → ${name}`);
    try {
      await fn();
    } catch (e: any) {
      const msg = String(e?.message ?? e).slice(0, 160);
      console.error(`[cycle] ${name} failed: ${msg}`);
      logRun({ loop: 'cycle', status: 'error', detail: `${name}: ${msg}` });
    }
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n[cycle] done in ${secs}s. Run \`npm run report\` for the inventory.`);
  logRun({ loop: 'cycle', status: 'ok', detail: `completed in ${secs}s`, duration_ms: Date.now() - t0 });
  writeHeartbeat('cycle', `completed in ${secs}s`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCycle().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
