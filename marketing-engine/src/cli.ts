import { runInsight } from './loops/insight';
import { runCopy } from './loops/copy';
import { runAssets } from './loops/assets';
import { runDistribute } from './loops/distribute';
import { runPaid } from './loops/paid';
import { runMeasure } from './loops/measure';
import { runLearn } from './loops/learn';
import { writeDashboard } from './dashboard';
import { doctor } from './doctor';
import { db } from './db';

const cmd = process.argv[2] ?? 'help';

async function tick(): Promise<void> {
  const steps: [string, () => Promise<unknown>][] = [
    ['insight', () => runInsight()],
    ['copy', () => runCopy(1)],
    ['assets', () => runAssets()],
    ['distribute', () => runDistribute()],
    ['paid', () => runPaid()],
    ['measure', () => runMeasure()],
    ['learn', () => runLearn()],
  ];
  for (const [name, fn] of steps) {
    try {
      console.log(name, await fn());
    } catch (e) {
      console.error(name, 'FAILED', e instanceof Error ? e.message : e);
    }
  }
  console.log('dashboard', writeDashboard());
}

async function main(): Promise<void> {
  db();
  switch (cmd) {
    case 'doctor': {
      const d = doctor();
      console.log(d.lines.join('\n'));
      process.exit(d.ok ? 0 : 1);
      return;
    }
    case 'insight':
      console.log(await runInsight());
      break;
    case 'copy':
      console.log(await runCopy(Number(process.argv[3] ?? 2)));
      break;
    case 'assets':
      console.log(await runAssets());
      break;
    case 'distribute':
      console.log(await runDistribute());
      break;
    case 'paid':
      console.log(await runPaid());
      break;
    case 'measure':
      console.log(await runMeasure());
      break;
    case 'learn':
      console.log(await runLearn());
      break;
    case 'dashboard':
      console.log(writeDashboard());
      break;
    case 'tick':
      await tick();
      break;
    case 'daemon': {
      console.log('daemon: tick now, then every 24h. Ctrl+C to stop.');
      await tick();
      setInterval(() => {
        tick().catch((e) => console.error(e));
      }, 24 * 60 * 60 * 1000);
      return;
    }
    default:
      console.log(`VedicHour marketing engine
  npm run doctor | tick | loop:insight | loop:copy | loop:assets
  loop:distribute | loop:paid | loop:measure | loop:learn | dashboard`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
