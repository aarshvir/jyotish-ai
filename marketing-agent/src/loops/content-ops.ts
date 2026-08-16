/**
 * Free half of the Content Ops loop — sense → creative → Approve queue.
 * Never spends fal.ai money. See docs/CONTENT_OPS_SOP.md.
 */
import { isKilled, killInfo } from '../safety/killswitch';
import { logRun } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { runSenseLoop } from './sense';
import { runCreativeLoop } from './creative';
import { printPending } from '../audit/approvals';

export interface ContentOpsOpts {
  count?: number;
  dry?: boolean;
  skipSense?: boolean;
}

export async function runContentOpsLoop(opts: ContentOpsOpts = {}): Promise<void> {
  const loop = 'content-ops';
  if (isKilled()) {
    console.log(`[content-ops] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  const t0 = Date.now();
  logRun({ loop, status: 'started' });
  console.log('\n[content-ops] FREE PIPELINE — sense → creative → awaiting_approval (no paid render)\n');
  if (!opts.skipSense) {
    console.log('[content-ops] 1/2 sense…');
    await runSenseLoop();
  } else {
    console.log('[content-ops] 1/2 sense skipped');
  }
  console.log('[content-ops] 2/2 creative…');
  await runCreativeLoop({ count: opts.count, dry: opts.dry });
  console.log('\n[content-ops] Founder queue:');
  printPending();
  console.log('[content-ops] Next: npm run approve <slug>  →  npm run loop:render -- <slug>');
  console.log('[content-ops] SOP: docs/CONTENT_OPS_SOP.md\n');
  logRun({ loop, status: 'ok', detail: `completed in ${((Date.now() - t0) / 1000).toFixed(0)}s`, duration_ms: Date.now() - t0 });
  writeHeartbeat(loop, 'free pipeline parked at Approve');
}
