import { pathToFileURL } from 'node:url';
import { runBlogLoop } from './loops/blog';
import { runPublishPrep } from './loops/publish-prep';
import { runSocialLoop } from './loops/social';
import { runCreativeLoop } from './loops/creative';
import { runSenseLoop } from './loops/sense';
import { isKilled, killInfo } from './safety/killswitch';
import { logRun } from './db/index';
import { writeHeartbeat } from './scheduler/heartbeat';

/**
 * The daily content cycle — drafts only. Nothing paid, nothing posted.
 *
 * Faceless edge-tts reels (`loop:reel`) are intentionally NOT in this cycle: they look cheap
 * next to the presenter-led fal.ai pipeline, and the owner law is that a visible human opens
 * every ad. Paid render happens only after `npm run approvals` → human OK → `npm run loop:render`.
 */
export async function runCycle(): Promise<void> {
  if (isKilled()) {
    console.log(`[cycle] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping the whole cycle.`);
    logRun({ loop: 'cycle', status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  const t0 = Date.now();
  console.log('[cycle] === VedicHour daily content cycle (draft + audit, no spend, no post) ===');
  logRun({ loop: 'cycle', status: 'started' });

  const steps: [string, () => Promise<void>][] = [
    ['sense', async () => { await runSenseLoop(); }],
    ['creative', async () => { await runCreativeLoop({}); }],
    ['blog', async () => { await runBlogLoop({}); }],
    ['social', async () => { await runSocialLoop(); }],
    ['publish-prep', async () => { await runPublishPrep(); }],
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
  console.log(`\n[cycle] done in ${secs}s. Review: npm run cockpit  |  approve: npm run approvals`);
  logRun({ loop: 'cycle', status: 'ok', detail: `completed in ${secs}s`, duration_ms: Date.now() - t0 });
  writeHeartbeat('cycle', `completed in ${secs}s`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCycle().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
