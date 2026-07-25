import { brain } from '../brain/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { logRun } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';

/**
 * Phase-0 dummy loop. Proves the full chain: kill-switch check → brain() call →
 * heartbeat + runs_log. The scheduler fires this; the cockpit shows the result.
 */
export async function runDemoLoop(): Promise<void> {
  const loop = 'demo';

  if (isKilled()) {
    const info = killInfo();
    console.log(`[demo] KILL-SWITCH engaged (${info?.reason ?? 'unknown'}) — halting, no work done.`);
    logRun({ loop, status: 'killed', detail: info?.reason ?? 'kill-switch' });
    writeHeartbeat(loop, `killed: ${info?.reason ?? 'unknown'}`);
    return;
  }

  logRun({ loop, status: 'started' });
  try {
    const res = await brain(
      'In one short, warm sentence, give an encouraging note for someone checking their daily astrology timing. No guarantees or medical/financial claims.',
      { tier: 'bulk', loop },
    );
    console.log(`[demo] ${res.cli} (${res.model ?? 'default'}, ${res.durationMs}ms): ${res.text}`);
    writeHeartbeat(loop, `${res.cli} ok`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`[demo] brain failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
