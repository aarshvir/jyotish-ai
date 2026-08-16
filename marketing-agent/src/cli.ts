import { initDb } from './db/index';
import { brain, type Tier } from './brain/index';
import { lint } from './policy/linter';
import { isKilled, killInfo, engageKill, releaseKill } from './safety/killswitch';
import { cliAvailable } from './brain/clis';
import { runDemoLoop } from './loops/demo';
import { runBlogLoop, promoteBlog } from './loops/blog';
import { runCreativeLoop } from './loops/creative';
import { runConsentSync } from './loops/consent-sync';
import { runReelLoop } from './loops/video';
import { runRenderLoop, printBudgetStatus } from './loops/render';
import { runPublishPrep } from './loops/publish-prep';
import { runPackageLoop } from './loops/package';
import { runContentOpsLoop } from './loops/content-ops';
import { runSocialLoop } from './loops/social';
import { runSyncLoop } from './loops/sync';
import { runStatsLoop } from './loops/stats';
import { runInsightsLoop } from './loops/insights';
import { startCockpit } from './cockpit/server';
import { readHeartbeat } from './scheduler/heartbeat';
import { runReviewLoop } from './audit/index';
import { preflightCli } from './audit/preflight';
import { approve, printPending, reject } from './audit/approvals';
import { parse } from './cli-parse';
import { printEnvDoctor } from './env';

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, text, pos } = parse(rest);

  switch (cmd) {
    case 'doctor': {
      console.log('VedicHour Marketing Agent — doctor\n');
      console.log('CLIs:');
      for (const c of ['gemini', 'codex', 'claude', 'ffmpeg', 'edge-tts']) {
        console.log(`  ${c.padEnd(9)} ${cliAvailable(c) ? 'available' : 'MISSING/installed elsewhere'}`);
      }
      const { path, tables } = initDb();
      console.log(`\nDB: ${path}`);
      console.log(`  tables: ${tables.join(', ')}`);
      console.log(`\nKill-switch: ${isKilled() ? `ENGAGED (${killInfo()?.reason})` : 'off'}`);
      const hb = readHeartbeat();
      console.log(`Last heartbeat: ${hb._last ? `${hb._last.loop} @ ${hb._last.at}` : 'none yet'}`);
      printEnvDoctor();
      break;
    }
    case 'db:init': {
      const { path, tables } = initDb();
      console.log(`DB ready at ${path}\nTables: ${tables.join(', ')}`);
      break;
    }
    case 'brain': {
      if (!text) return console.error('usage: npm run brain "<prompt>" [--tier bulk|smart|code]');
      const res = await brain(text, { tier: (flags.tier as Tier) ?? 'bulk', loop: 'cli' });
      console.log(`\n[${res.cli} · ${res.model ?? 'default'} · ${res.durationMs}ms]\n`);
      console.log(res.text);
      break;
    }
    case 'linter': {
      if (!text) return console.error('usage: npm run linter "<marketing text>" [--context organic|ad]');
      const r = await lint(text, { context: (flags.context as 'organic' | 'ad') ?? 'organic' });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'loop:demo':
      await runDemoLoop();
      break;
    case 'loop:blog':
      await runBlogLoop({ tier: flags.tier as Tier });
      break;
    case 'blog:promote':
      promoteBlog(text || undefined);
      break;
    case 'loop:creative':
      await runCreativeLoop({
        tier: flags.tier as Tier,
        count: flags.count ? Number(flags.count) : undefined,
        dry: flags.dry === 'true',
      });
      break;
    case 'loop:content-ops':
      await runContentOpsLoop({
        count: flags.count ? Number(flags.count) : undefined,
        dry: flags.dry === 'true',
        skipSense: flags['skip-sense'] === 'true',
      });
      break;
    case 'loop:reel':
      await runReelLoop({ slug: text || undefined });
      break;
    case 'loop:render':
      await runRenderLoop({
        slug: text || undefined,
        dry: flags.dry === 'true',
        estimateOnly: flags.estimate === 'true',
        keepIntermediates: flags.keep === 'true',
        resume: flags.resume === 'true',
        languages: flags.languages,
      });
      break;
    case 'render:budget':
      printBudgetStatus();
      break;
    case 'preflight':
      process.exitCode = await preflightCli(text);
      break;
    case 'loop:review':
      await runReviewLoop({
        slug: pos[0],
        allowPaid: flags['allow-paid'] === 'true',
        concurrency: flags.conc ? Number(flags.conc) : undefined,
      });
      break;
    case 'approvals':
      printPending();
      break;
    case 'approve': {
      if (!pos[0]) return console.error('usage: npm run approve <slug> ["note"]');
      const r = approve(pos[0], pos.slice(1).join(' '));
      console.log(r ? `APPROVED ${pos[0]} — it may now be published.` : `Nothing pending for "${pos[0]}". Run: npm run approvals`);
      break;
    }
    case 'reject': {
      if (!pos[0] || !pos[1]) return console.error('usage: npm run reject <slug> "<reason>"');
      const reason = pos.slice(1).join(' ');
      const { row, lesson } = await reject(pos[0], reason);
      console.log(
        row
          ? `REJECTED ${pos[0]}. Lesson filed (${lesson === 'store' ? 'lessons store' : 'data/lessons-pending.jsonl'}) so it cannot happen again:\n  "${reason}"`
          : `Nothing pending for "${pos[0]}". Run: npm run approvals`,
      );
      break;
    }
    case 'loop:publish':
      await runPublishPrep();
      break;
    case 'loop:package':
      await runPackageLoop({ slug: pos[0] });
      break;
    case 'loop:social':
      await runSocialLoop();
      break;
    case 'loop:consent':
      await runConsentSync();
      break;
    case 'loop:sync':
      await runSyncLoop();
      break;
    case 'loop:stats':
      await runStatsLoop();
      break;
    case 'loop:insights':
      await runInsightsLoop();
      break;
    case 'kill':
      engageKill(text || 'cli');
      console.log(`KILL-SWITCH engaged. Reason: ${text || 'cli'}. All spend/sending loops will halt.`);
      break;
    case 'revive':
      releaseKill();
      console.log('Kill-switch released. Loops may run again.');
      break;
    case 'cockpit':
      startCockpit();
      break;
    default:
      console.log(
        `VedicHour Marketing Agent\n\nCommands:\n` +
          `  npm run doctor                 environment + DB + kill-switch status\n` +
          `  npm run db:init                create/verify the SQLite schema\n` +
          `  npm run brain "<prompt>"       route a prompt through the brain (--tier bulk|smart|code)\n` +
          `  npm run linter "<text>"        policy-lint marketing copy (--context organic|ad)\n` +
          `  npm run loop:demo              demo loop once (kill-aware, writes heartbeat)\n` +
          `  npm run loop:blog              draft + lint + stage a blog article (L1) [--tier]\n` +
          `  npm run blog:promote [slug]    publish a staged post into the live site\n` +
          `  npm run loop:creative          ideate -> variants -> adversarial audit -> tournament (L4)\n` +
          `                                 [--count N ideas] [--tier] [--dry no writes]\n` +
          `  npm run loop:content-ops       FREE pipeline: sense + creative → Approve queue (never spends)\n` +
          `                                 [--count N] [--dry] [--skip-sense]\n` +
          `  npm run loop:reel [slug]       render a faceless 9:16 reel (L2, edge-tts + ffmpeg)\n` +
          `  npm run loop:render [slug]     render a PRESENTER-LED AI reel (L2b, fal.ai + ffmpeg)\n` +
          `                                 --dry stubs only the paid calls · --estimate prices it and stops\n` +
          `                                 --resume reuses paid work/<shot>.raw.mp4 · --languages hi,ta,te\n` +
          `  npm run render:budget          video budget caps, spend so far, and the fal.ai price table\n` +
          `\n  -- THE PUBLISH GATE (nothing reaches a platform without it) --\n` +
          `  npm run preflight -- <slug>    STAGE 0 ($0, BEFORE any render): hard-block a creative plan on\n` +
          `                                 voice, capture targets, jargon, narration fit, brand safety, lessons\n` +
          `  npm run loop:review -- <slug>  4 internal audits + 5 GPT cross-reviews + 2 deterministic passes\n` +
          `                                 over a rendered reel -> REVIEW.md + review.json + fix_queue\n` +
          `                                 [--conc N] [--allow-paid  metered OpenAI fallback, cap $0.25/reel]\n` +
          `  npm run approvals              reels waiting for your decision\n` +
          `  npm run approve <slug>         approve for publishing\n` +
          `  npm run reject <slug> "why"    reject + file the reason as a lesson\n\n` +
          `  npm run loop:publish           package reels into post-ready platform posts (L3)\n` +
          `  npm run loop:package [slug]    IG Reels / YT Shorts / YT 8-12m / GBP / IG carousel (L3b)\n` +
          `  npm run loop:social            generate platform social posts (L3 organic)\n` +
          `  npm run loop:consent           sync Supabase signups into the consent ledger (L8)\n` +
          `  npm run loop:sync              mirror campaign assets up to Supabase + pull admin kills down\n` +
          `  npm run loop:stats             poll YouTube public stats (+ manual_stats.json) into marketing_stats\n` +
          `  npm run loop:insights          brain-generated kill/double/watch/localize verdicts -> marketing_insights\n` +
          `  npm run kill ["reason"]        engage the kill-switch\n` +
          `  npm run revive                 release the kill-switch\n` +
          `  npm run cockpit                start the dashboard (http://localhost:4317)`,
      );
  }
}

main().catch((e) => {
  console.error(e?.stack ?? e);
  process.exit(1);
});
