import { openDb } from './db';
import { runAssets } from './loops/assets';
import { runCopy } from './loops/copy';
import { runDistribute } from './loops/distribute';
import { runInsight } from './loops/insight';
import { runLearn } from './loops/learn';
import { runMeasure } from './loops/measure';
import { runPaid } from './loops/paid';

const cmd = process.argv[2] ?? 'cycle';

async function main(): Promise<void> {
  const db = openDb();
  if (cmd === 'insight' || cmd === 'cycle') {
    const ranked = runInsight(db);
    console.log('[insight]', ranked.map((r) => `${r.slug} ${r.score}`).join(' | '));
  }
  if (cmd === 'copy' || cmd === 'cycle') {
    const copy = runCopy(db);
    console.log('[copy]', copy);
  }
  if (cmd === 'assets' || cmd === 'cycle') {
    const dir = await runAssets(db);
    console.log('[assets]', dir);
  }
  if (cmd === 'distribute' || cmd === 'cycle') {
    runDistribute(db);
    console.log('[distribute] staged');
  }
  if (cmd === 'measure' || cmd === 'cycle') {
    runMeasure(db);
    console.log('[measure] dashboard');
  }
  if (cmd === 'paid' || cmd === 'cycle') {
    runPaid(db);
    console.log('[paid] campaigns exported, spend not sent');
  }
  if (cmd === 'learn' || cmd === 'cycle') {
    runLearn(db);
    console.log('[learn] appended');
  }
  if (!['insight', 'copy', 'assets', 'distribute', 'measure', 'paid', 'learn', 'cycle'].includes(cmd)) {
    console.error('unknown command', cmd);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
