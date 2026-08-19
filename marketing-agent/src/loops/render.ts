import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { lint, jargonHits } from '../policy/linter';
import { activeLessons } from '../lessons';
import { buildPublishPack, verifyNoteFrom } from './publish-pack';
import { validateCreative, SPOKEN_SITE, LCUT_MIN_PICTURE_SEC, type CreativeScript, type Shot, type ShotProvider } from '../render/types';
import { PRICE_TABLE, ROLE_ROUTING, estimateCost, providerFor, hasFalKey, quantizeSeconds } from '../render/providers';
import { checkBudget, recordSpend, caps, budgetLine, spendSnapshot } from '../render/budget';
import { captureProductShot, browserEngineAvailable } from '../render/screencap';
import { assertCaptureAllowed, resolveLiveCapture } from '../render/capture-policy';
import { AD_VO_VOICE, NATIVE_VOICE, assertSingleAdVoice, SARVAM_PRICING } from '../render/sarvam';
import {
  FRAME, PRESENTER_LAYOUT, renderPlaceholder, normalizeClip, concatClips, finish,
  synthesizeVo, nativeVo, requireMusicBed, verifyOutput, renderEndCard,
  extractCarryAudio, carryIsAudible, lastSpeechEndSec, type PreparedShot,
} from '../render/assemble';
import { resolveTools, probeVideo, type Seg } from '../render/ffmpeg';
import {
  parseLanguages, translateCreative, sarvamTts, syncLipsync, renderCaptionPlates, planPlates,
  plateOverlayGraph, estimateLocalization, hasSarvamKey, hasSyncKey, indicFontAvailable,
  LOCALIZE_PRICING, type LangSpec, type LocalizedScript,
} from '../render/localize';

/**
 * L2b — the AI VIDEO RENDER PIPELINE.
 *
 * Reads the top-ranked creative from output/creative/*.json (status `ready_to_render`), renders
 * every shot through the right fal.ai model, assembles them with the v3.1 grade + karaoke
 * captions, verifies the result, and writes output/reels/<slug>/{final.mp4, publish.json,
 * PUBLISH.md}. Publishing is MANUAL — PUBLISH.md is the copy-paste sheet for that.
 *
 * Three independent gates must all pass before a single cent is spent:
 *   1. kill-switch      (data/KILL)
 *   2. policy linter    (block verdict = no render)
 *   3. budget guard     (per-run / per-day / per-week caps in SQLite)
 */

const CREATIVE_DIR = resolve(ROOT, 'output', 'creative');
const REELS_OUT = resolve(ROOT, 'output', 'reels');

export interface RenderOpts {
  slug?: string;
  /** Stub ONLY the paid generation calls; everything else runs for real. */
  dry?: boolean;
  /** Estimate and validate, then stop before rendering anything. */
  estimateOnly?: boolean;
  keepIntermediates?: boolean;
  /**
   * Reuse any `work/<shot>.raw.mp4` that a previous run of THIS creative already paid for.
   *
   * Exists because a mid-reel failure (fal 422 content-checker, a network drop) otherwise makes
   * the retry re-buy every shot that had already succeeded. On 2026-07-26 a rejected prompt on
   * shot 2 would have cost the owner a second $0.90 for a shot 1 that was already sitting on
   * disk. Paying twice for identical footage is exactly the waste CLAUDE.md §1 exists to stop.
   * Opt-in, never the default: a reused clip is footage nobody re-checked this run.
   */
  resume?: boolean;
  /** e.g. "hi,ta,te". Localization is opt-in and meant for WINNER assets only. */
  languages?: string;
}

/** Which shot roles get true lip-sync when dubbing. Others just take the dubbed VO. */
const LIPSYNC_ROLES = ['presenter', 'presenter_close'];

// ---------------------------------------------------------------------------
// $0 PRE-FLIGHT — CLAUDE.md §1: never spend before you check
// ---------------------------------------------------------------------------

/**
 * Everything below is decidable from the creative JSON alone, i.e. for $0, BEFORE a cent of
 * fal.ai spend. All three defects the owner found in the first two ads (a synthetic female
 * narrator, a scroll of the pricing page, "Swiss Ephemeris" in the script) were plain text in
 * this file and are hard-blocked here.
 *
 * Note the sibling `src/audit/preflight.ts` gate runs the same laws earlier, over the whole
 * batch. This is the last line of defence in the spend path itself — it must never be softened
 * into a warning, whatever else exists upstream.
 */
export function preflight(creative: CreativeScript, scriptText: string): string[] {
  const problems: string[] = [];

  // 1. capture targets — the report, never the payment section
  for (const s of creative.shots) {
    if (s.role !== 'product' || !s.capture?.url) continue;
    try {
      assertCaptureAllowed(s.capture.url, `shot ${s.id}`);
    } catch (e: any) {
      problems.push(String(e?.message ?? e));
    }
  }

  // 2. jargon — plain English or nothing
  const jargon = jargonHits(scriptText);
  if (jargon.length) {
    problems.push(
      `ad copy contains engine jargon (${jargon.join(', ')}). Owner: "No one gives a shit. I don't even ` +
        'know what this is." Say "real astronomical data, the same math a careful astrologer uses" instead.',
    );
  }

  // 3. voice plan — one narrator, and it is never edge-tts
  try {
    assertSingleAdVoice(
      creative.shots.map((s) => ({
        id: s.id,
        voice: s.voice ?? (s.role === 'presenter' || s.role === 'presenter_close' ? NATIVE_VOICE : s.vo?.trim() ? AD_VO_VOICE : null),
      })),
    );
  } catch (e: any) {
    problems.push(String(e?.message ?? e));
  }

  // 4. the closing CTA must NAME THE SITE OUT LOUD, in the presenter's own on-camera dialogue.
  //
  // Owner law 2026-07-26, verbatim: "at the end there should be a call to action: Try
  // VedicHour.com... because people who are listening to the reel will figure out, Oh, I found
  // this new platform, VedicHour." A reel is half-watched and fully HEARD; an on-screen-only CTA
  // reaches nobody whose eyes are elsewhere. The renderer always appends the branded end card
  // (END_CARD), but the card cannot put the name in the viewer's EARS in the reel's one voice —
  // only the presenter can, and Veo performs his line for free. This is decidable from the JSON,
  // so it is decided here, before a cent (CLAUDE.md §1).
  const presenterShots = creative.shots.filter((s) => s.role === 'presenter' || s.role === 'presenter_close');
  const closer = presenterShots[presenterShots.length - 1];
  if (!closer) {
    problems.push(
      'no presenter shot to close on — the reel cannot say the brand name out loud in its own voice. ' +
        'End on a presenter whose dialogue says VedicHour.',
    );
  } else if (!SPOKEN_SITE.test(closer.dialogue ?? '')) {
    problems.push(
      `the closing presenter shot (${closer.id}) never says the brand name out loud: "${(closer.dialogue ?? '').slice(0, 80)}". ` +
        'Owner law 2026-07-26: "at the end there should be a call to action: Try VedicHour.com... because people who are ' +
        'LISTENING to the reel will figure out, Oh, I found this new platform, VedicHour." Rewrite the last on-camera line to ' +
        'say the NAME — e.g. "…VedicHour pe dekh liya." Veo performs it, so it costs nothing and stays in the one voice. ' +
        'He does not have to read out "dot com"; the branded end card carries the full vedichour.com in writing (amended 2026-08-18).',
    );
  }

  return problems;
}

/**
 * Log every active lesson that governs the RENDER side, so an unattended run leaves a record of
 * what it was holding itself to. The mechanically checkable ones are asserted separately
 * (capture policy and voice plan in preflight(); caption banding in assertCaptionPlan()).
 */
function logRenderLessons(): void {
  const rows = activeLessons(['visual', 'capture', 'caption']);
  if (!rows.length) return;
  console.log(`[render] pre-flight — ${rows.length} active lesson(s) governing this render:`);
  for (const l of rows) console.log(`[render]   · [${l.scope}] ${l.rule}`);
}

/**
 * Lesson "captions must never overlap the page's own text — use the opaque band": mechanically,
 * every product shot must contribute a window to `productWindows`, because that array is what
 * switches buildAss() to the CaptionBand/CtaBand styles. If a product shot were missing from it,
 * gold karaoke text would land straight on the page's own copy.
 */
function assertCaptionPlan(prepared: PreparedShot[], productWindows: { start: number; end: number }[]): void {
  const productShots = prepared.filter((p) => p.shot.role === 'product').length;
  if (productWindows.length !== productShots) {
    throw new Error(
      `caption plan violation — ${productShots} product shot(s) but ${productWindows.length} banded caption window(s). ` +
        'Captions over a screencap must use the opaque band or they garble the page text.',
    );
  }
}

// ---------------------------------------------------------------------------
// Creative selection
// ---------------------------------------------------------------------------

function loadCreatives(): { file: string; raw: any }[] {
  if (!existsSync(CREATIVE_DIR)) return [];
  return readdirSync(CREATIVE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const file = resolve(CREATIVE_DIR, f);
      try {
        return { file, raw: JSON.parse(readFileSync(file, 'utf8')) };
      } catch (e: any) {
        console.warn(`[render] ${f} is not valid JSON — skipping (${String(e?.message ?? e).slice(0, 80)})`);
        return null;
      }
    })
    .filter(Boolean) as { file: string; raw: any }[];
}

function pickCreative(slug?: string): { file: string; raw: any } | null {
  const all = loadCreatives();
  if (slug) return all.find((c) => c.raw?.slug === slug) ?? null;
  const ready = all.filter((c) => c.raw?.status === 'ready_to_render');
  if (!ready.length) return null;
  ready.sort((a, b) => (Number(b.raw?.rank ?? 0) - Number(a.raw?.rank ?? 0)) || String(a.raw?.slug).localeCompare(String(b.raw?.slug)));
  return ready[0];
}

function providerForShot(shot: Shot): ShotProvider {
  return shot.provider ?? (ROLE_ROUTING as Record<string, ShotProvider>)[shot.role] ?? 'wan27';
}

/**
 * Everything the reel actually says out loud, for the policy linter and the jargon gate.
 * (Restored: the publish-pack extraction moved this into buildPublishPack() as a local and left
 * the caller in the policy gate below without a definition, so `main` stopped typechecking.)
 */
function spokenText(c: CreativeScript): string {
  return c.shots.map((s) => s.dialogue ?? s.vo ?? '').filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Cost model
// ---------------------------------------------------------------------------

export interface ShotEstimate {
  id: string;
  role: string;
  provider: ShotProvider;
  label: string;
  requestedSec: number;
  billedSec: number;
  usd: number;
  priceVerified: boolean;
}

export function estimateReel(c: CreativeScript): { shots: ShotEstimate[]; totalUsd: number; totalSec: number } {
  const shots = c.shots.map((s) => {
    const key = providerForShot(s);
    const spec = PRICE_TABLE[key];
    const { seconds, usd } = estimateCost(key, s.seconds);
    return {
      id: s.id,
      role: s.role,
      provider: key,
      label: spec.label,
      requestedSec: s.seconds,
      billedSec: spec.allowedSeconds.length ? seconds : s.seconds,
      usd,
      priceVerified: spec.priceVerified,
    };
  });
  return {
    shots,
    totalUsd: Math.round(shots.reduce((a, s) => a + s.usd, 0) * 10000) / 10000,
    totalSec: Math.round(shots.reduce((a, s) => a + s.billedSec, 0) * 100) / 100,
  };
}

function printEstimate(c: CreativeScript, est: ReturnType<typeof estimateReel>, dry: boolean): void {
  console.log(`\n  COST MODEL — "${c.title}" (${c.slug})`);
  console.log(`  ${'shot'.padEnd(18)}${'role'.padEnd(17)}${'model'.padEnd(26)}${'billed'.padEnd(9)}cost`);
  console.log(`  ${'-'.repeat(76)}`);
  for (const s of est.shots) {
    const flag = s.priceVerified ? '' : '  <- price INFERRED, budgeted high';
    const billed = PRICE_TABLE[s.provider].costPerSecond ? `${s.billedSec}s` : `${s.billedSec}s`;
    console.log(`  ${s.id.padEnd(18)}${s.role.padEnd(17)}${s.label.padEnd(26)}${billed.padEnd(9)}$${s.usd.toFixed(4)}${flag}`);
  }
  console.log(`  ${'-'.repeat(76)}`);
  console.log(`  ${'TOTAL'.padEnd(61)}${String(est.totalSec + 's').padEnd(9)}$${est.totalUsd.toFixed(2)}${dry ? '   (DRY — not charged)' : ''}\n`);
}

// ---------------------------------------------------------------------------
// PUBLISH.md
// ---------------------------------------------------------------------------

function writePublishMd(dir: string, pack: ReturnType<typeof buildPublishPack>, est: ReturnType<typeof estimateReel>, verifyNote: string): void {
  const doNotPost = pack.status !== 'ready_to_post_manually';
  const banner = doNotPost
    ? `\n> **DO NOT POST** — status \`${pack.status}\`. Play the mp4 with sound on before anything else. ${pack.dryRun ? 'This is a dry placeholder (navy cards, silent AAC), not a reel.' : 'Verification failed or the waveform is not audible.'}\n`
    : pack.dryRun
      ? '\n> **DRY RUN** — the picture is placeholder footage, not generated shots. Do not publish this file.\n'
      : '';
  const md = `# PUBLISH — ${pack.title}

**Manual publish sheet.** API posting is not wired yet (no OAuth approvals), so everything below
is copy-paste ready. Video: \`${pack.video}\` · ${pack.durationSec.toFixed(1)}s · 1080x1920
${banner}
## YouTube Short

**Title**
\`\`\`
${pack.youtubeTitle}
\`\`\`

**Description**
\`\`\`
${pack.description}
\`\`\`

**Tags** (comma-separated, paste into the tags box)
\`\`\`
${pack.tags.join(', ')}
\`\`\`

## Instagram Reel / TikTok / Facebook Reel

**Caption** (identical across all three; the link goes in bio / link sticker)
\`\`\`
${pack.caption}
\`\`\`

**Hashtags**
\`\`\`
${pack.hashtags.join(' ')}
\`\`\`

## Tracked links (UTM-tagged — use these, not bare vedichour.com)

| Platform | Link |
|---|---|
| Instagram | ${pack.links.instagram} |
| YouTube | ${pack.links.youtube} |
| TikTok | ${pack.links.tiktok} |
| Facebook | ${pack.links.facebook} |

## Generation cost

| Shot | Role | Model | Billed | Cost |
|---|---|---|---|---|
${est.shots.map((s) => `| ${s.id} | ${s.role} | ${s.label}${s.priceVerified ? '' : ' *(price inferred)*'} | ${s.billedSec}s | $${s.usd.toFixed(4)} |`).join('\n')}
| **Total** | | | **${est.totalSec}s** | **$${est.totalUsd.toFixed(2)}**${pack.dryRun ? ' *(not charged — dry run)*' : ''} |

## Verification

${verifyNote}
`;
  writeFileSync(resolve(dir, 'PUBLISH.md'), md);
}

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

export async function runRenderLoop(opts: RenderOpts = {}): Promise<void> {
  const loop = 'render';
  const runId = randomUUID();
  const dry = opts.dry === true || !hasFalKey();

  if (isKilled()) {
    console.log(`[render] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  const t0 = Date.now();

  try {
    // ---- 1. pick + validate creative ------------------------------------------------
    const picked = pickCreative(opts.slug);
    if (!picked) {
      const msg = opts.slug ? `no creative with slug "${opts.slug}"` : 'no creative with status ready_to_render';
      console.log(`[render] ${msg} in ${CREATIVE_DIR}`);
      logRun({ loop, status: 'skipped', detail: msg });
      writeHeartbeat(loop, msg);
      return;
    }
    const { ok, issues, creative } = validateCreative(picked.raw);
    for (const i of issues) console.log(`[render] ${i.level === 'error' ? 'ERROR' : 'warn '} ${i.where}: ${i.message}`);
    if (!ok || !creative) {
      console.error(`[render] "${picked.file}" failed validation — not rendering.`);
      logRun({ loop, status: 'error', detail: `invalid creative: ${issues.filter((i) => i.level === 'error').length} errors` });
      return;
    }
    console.log(`[render] creative "${creative.title}" (${creative.slug}) · ${creative.shots.length} shots · rank ${creative.rank ?? 'n/a'}`);
    if (!hasFalKey() && !opts.dry) console.log('[render] FAL_KEY is not set — falling back to DRY mode automatically.');

    // ---- 2. policy gate --------------------------------------------------------------
    const scriptText = [creative.hook, spokenText(creative), creative.cta].join('\n');

    // 2a. $0 pre-flight on the INPUTS. Refuses before the budget guard is even consulted.
    logRenderLessons();
    const preflightProblems = preflight(creative, scriptText);
    // The plan-only gate above cannot see the PAGE. The owner's jargon defect lived on the
    // captured page, not in the script, so the deep gate also fetches each capture URL and
    // scans what a viewer would actually read. Never let its own failure block a clean render.
    try {
      const { runPreflight } = await import('../audit/preflight');
      const deep = await runPreflight(picked.raw, { file: picked.file, raw: readFileSync(picked.file, 'utf8') });
      for (const b of deep?.blocks ?? []) {
        const line = `${b.rule}: ${b.detail ?? ''}`.trim();
        if (!preflightProblems.includes(line)) preflightProblems.push(line);
      }
    } catch (e: any) {
      console.warn(`[render] deep pre-flight unavailable (${String(e?.message ?? e).slice(0, 120)}) — plan-only gate still applied.`);
    }
    if (preflightProblems.length) {
      console.error(`[render] PRE-FLIGHT FAILED (${preflightProblems.length}) — nothing generated, nothing charged:`);
      for (const p of preflightProblems) console.error(`[render]   ✗ ${p}`);
      logRun({ loop, status: 'skipped', detail: `pre-flight: ${preflightProblems[0].slice(0, 160)}` });
      writeHeartbeat(loop, `pre-flight blocked: ${creative.slug}`);
      // --estimate is a price printout. Do not mutate the creative to `blocked` or the
      // blocked_reason string (which often quotes jargon) will fail the next lesson scan.
      if (!opts.estimateOnly) {
        writeFileSync(picked.file, JSON.stringify({ ...picked.raw, status: 'blocked', blocked_reason: preflightProblems.join(' | ').slice(0, 900) }, null, 2));
        enqueueApproval({ item: `Reel BLOCKED by pre-flight: ${creative.title} — ${preflightProblems[0]}`, lane: 'B', linter_verdict: 'block', linter_reason: 'pre-flight', channel: 'reel' });
      }
      return;
    }
    console.log('[render] pre-flight: PASS — capture targets, voice plan and jargon all clean ($0 spent so far)');
    // The L-cut plan, stated out loud before any spend: validateCreative() has already refused
    // every illegal shape (see Shot.audioExtendsSec), so what is printed here is what will render.
    for (let i = 0; i < creative.shots.length; i++) {
      const e = Number(creative.shots[i].audioExtendsSec) || 0;
      if (e > 0)
        console.log(
          `[render] pre-flight: L-CUT — ${creative.shots[i].id} keeps ${(Number(creative.shots[i].seconds) - e).toFixed(1)}s of picture ` +
            `and its last ${e}s of voice play under ${creative.shots[i + 1]?.id} (${creative.shots[i + 1]?.role}). No TTS: his own take, still running.`,
        );
    }

    const verdict = await lint(scriptText, { context: 'ad' });
    if (verdict.verdict === 'block') {
      console.log(`[render] BLOCKED by policy linter — ${verdict.reason}. Not rendering, not spending.`);
      logRun({ loop, status: 'skipped', detail: `blocked: ${verdict.reason}` });
      writeHeartbeat(loop, `blocked: ${creative.slug}`);
      if (!opts.estimateOnly) {
        writeFileSync(picked.file, JSON.stringify({ ...picked.raw, status: 'blocked', blocked_reason: verdict.reason }, null, 2));
      }
      return;
    }
    console.log(`[render] linter: ${verdict.verdict} — ${verdict.reason}`);

    // ---- 3. cost model + budget gate -------------------------------------------------
    const est = estimateReel(creative);
    printEstimate(creative, est, dry);

    const engine = browserEngineAvailable();
    if (creative.shots.some((s) => s.role === 'product') && !engine.ok) {
      console.log('[render] warn: no browser engine — product shots will fall back to a placeholder card.');
    }

    if (!dry) {
      const decision = checkBudget(runId, est.totalUsd, { slug: creative.slug });
      if (!decision.allowed) {
        console.error(`[render] BUDGET REFUSED — ${decision.reason}`);
        console.error(`[render] ${budgetLine(runId)}`);
        console.error('[render] Nothing was generated and nothing was charged.');
        logRun({ loop, status: 'skipped', detail: `budget refused: ${decision.reason}` });
        writeHeartbeat(loop, `budget refused: ${creative.slug}`);
        return;
      }
      console.log(`[render] budget OK — ${decision.reason}`);
    }
    console.log(`[render] ${budgetLine(runId)}`);

    if (opts.estimateOnly) {
      console.log('[render] --estimate: validated the graph and priced the reel. Stopping before render.');
      logRun({ loop, status: 'ok', detail: `estimate only: $${est.totalUsd.toFixed(2)}` });
      return;
    }

    // ---- 4. render every shot ---------------------------------------------------------
    const outDir = resolve(REELS_OUT, creative.slug);
    const work = resolve(outDir, 'work');
    mkdirSync(work, { recursive: true });
    // The reel's voice is not negotiable per-creative any more: Veo native in-shot audio, and
    // AD_VO_VOICE for the little narration that survives. Legacy creatives carrying an edge-tts
    // name here are ignored rather than obeyed.
    if (creative.voice && creative.voice !== AD_VO_VOICE) {
      console.log(`[render] ignoring creative.voice "${creative.voice}" — ad narration is Sarvam "${AD_VO_VOICE}" (owner law 2026-07-26).`);
    }
    const prepared: PreparedShot[] = [];
    let cursor = 0;
    let spentUsd = 0;
    /**
     * THE L-CUT, in flight: the tail of the previous presenter shot's own Veo take, waiting for
     * the next shot's picture to be laid under. See Shot.audioExtendsSec in src/render/types.ts.
     */
    let pendingCarry: { fromId: string; wav: string; seconds: number } | null = null;

    for (const shot of creative.shots) {
      const key = providerForShot(shot);
      const spec = PRICE_TABLE[key];
      const rawClip = resolve(work, `${shot.id}.raw.mp4`);
      const normClip = resolve(work, `${shot.id}.norm.mp4`);
      const isPresenter = shot.role === 'presenter' || shot.role === 'presenter_close';
      const billedSec = spec.allowedSeconds.length ? quantizeSeconds(spec, shot.seconds) : shot.seconds;
      let costUsd = 0;
      let nativeAudio = false;
      let providerUsed: string = key;

      console.log(`[render] shot ${shot.id} (${shot.role}) -> ${dry ? 'PLACEHOLDER for ' : ''}${spec.label}, ${billedSec}s`);

      // 4a. get the picture
      if (dry) {
        providerUsed = 'placeholder';
        await renderPlaceholder(shot, billedSec, rawClip, `${spec.label} (dry)`);
        // Placeholder clips have no Veo in-shot audio. Still treat presenter lines as native
        // so --dry never bills Sarvam (or throws for a missing SARVAM_API_KEY). Captions
        // still come from nativeVo(); b-roll/product stay silent unless they carry `vo`.
        nativeAudio = isPresenter && spec.nativeAudio;
        recordSpend({ run_id: runId, slug: creative.slug, shot_id: shot.id, provider: 'placeholder', model: spec.endpoint, seconds: billedSec, cost_usd: 0, estimated_usd: est.shots.find((s) => s.id === shot.id)?.usd ?? 0, status: 'dry', detail: `stand-in for ${spec.label}` });
      } else if (shot.role === 'product') {
        if (engine.ok && shot.capture?.url) {
          // Second gate, at the moment of capture: pre-flight already refused a pricing/checkout
          // URL in the plan, and this refuses one that a 404-fallback could still produce.
          const target = await resolveLiveCapture(
            { url: shot.capture.url, libraryKey: shot.capture.libraryKey ?? 'unspecified', waitForSelector: shot.capture.waitForSelector, scrollPx: shot.capture.scrollPx, panToPx: shot.capture.panToPx },
            (m) => console.log(`[render]   ${m}`),
          );
          assertCaptureAllowed(target.url, `shot ${shot.id}`);
          console.log(`[render]   capturing ${target.url} (${target.libraryKey})${target.waitForSelector ? ` after ${target.waitForSelector}` : ''}`);
          await captureProductShot({ url: target.url, seconds: billedSec, outPath: rawClip, waitForSelector: target.waitForSelector, offsetPx: target.scrollPx, panToPx: target.panToPx, onProgress: (m) => console.log(`[render]   ${m}`) });
        } else {
          await renderPlaceholder(shot, billedSec, rawClip, 'product shot unavailable');
        }
        recordSpend({ run_id: runId, slug: creative.slug, shot_id: shot.id, provider: 'screencap', seconds: billedSec, cost_usd: 0, estimated_usd: 0, status: 'ok', detail: shot.capture?.url ?? '' });
      } else if (opts.resume && existsSync(rawClip) && statSync(rawClip).size > 100_000) {
        // Already generated and already paid for by an earlier run of this creative.
        nativeAudio = isPresenter && spec.nativeAudio;
        console.log(`[render]   --resume: reusing ${shot.id}.raw.mp4 from a previous run — nothing regenerated, nothing charged.`);
        recordSpend({ run_id: runId, slug: creative.slug, shot_id: shot.id, provider: key, model: spec.endpoint, seconds: billedSec, cost_usd: 0, estimated_usd: 0, status: 'ok', detail: 'reused existing raw clip (--resume) — paid for in an earlier run' });
      } else {
        // Re-check the budget per shot: a multi-shot reel must not blow the cap halfway through.
        const shotEst = estimateCost(key, shot.seconds);
        const d = checkBudget(runId, shotEst.usd, { slug: creative.slug, shotId: shot.id, provider: key });
        if (!d.allowed) throw new Error(`budget refused mid-reel at shot ${shot.id}: ${d.reason}`);

        const provider = providerFor(key, false);
        const prompt = isPresenter ? presenterPrompt(shot) : shot.prompt!;
        try {
          const res = await provider.generate(prompt, shot.seconds, {
            outPath: rawClip,
            aspectRatio: '9:16',
            resolution: key === 'seedance2_fast' ? '720p' : '1080p',
            audio: isPresenter,
            imageUrl: shot.imageUrl,
            onProgress: (m) => console.log(`[render]   ${m}`),
          });
          costUsd = res.costUsd;
          spentUsd += costUsd;
          nativeAudio = isPresenter && spec.nativeAudio;
          recordSpend({ run_id: runId, slug: creative.slug, shot_id: shot.id, provider: key, model: res.model, seconds: res.seconds, cost_usd: costUsd, estimated_usd: shotEst.usd, status: 'ok' });
        } catch (e: any) {
          recordSpend({ run_id: runId, slug: creative.slug, shot_id: shot.id, provider: key, model: spec.endpoint, seconds: billedSec, cost_usd: 0, estimated_usd: shotEst.usd, status: 'error', detail: String(e?.message ?? e).slice(0, 300) });
          throw e;
        }
      }

      // 4a-bis. THE L-CUT, geometry first — see Shot.audioExtendsSec in src/render/types.ts.
      //
      // `pictureSec` is what is on screen; `audioSec` is how long he is heard for (his picture
      // plus the tail that plays under the next shot). Both are derived from where he ACTUALLY
      // stops talking, because the clip's nominal length includes Veo's trailing pad and cutting
      // against that carries silence instead of speech. Captions are timed against `audioSec`, so
      // the line finishes over the product screen rather than running off the end of the reel.
      const lcutSec = nativeAudio && Number(shot.audioExtendsSec) > 0 ? Number(shot.audioExtendsSec) : 0;
      let pictureSec = billedSec;
      let audioSec = billedSec;
      if (lcutSec > 0) {
        const speechEnd = await lastSpeechEndSec(rawClip);
        const anchor = speechEnd ?? billedSec;
        audioSec = Math.round(anchor * 100) / 100;
        pictureSec = Math.round((anchor - lcutSec) * 100) / 100;
        console.log(
          `[render]   L-cut: ${shot.id} stops speaking at ${speechEnd === null ? `?s (silent clip — assuming ${billedSec}s)` : `${anchor.toFixed(2)}s`} ` +
            `of ${billedSec}s; picture out at ${pictureSec}s, ${lcutSec}s of voice carries forward.`,
        );
        if (pictureSec < LCUT_MIN_PICTURE_SEC) {
          throw new Error(
            `shot ${shot.id}: an L-cut of ${lcutSec}s would leave only ${pictureSec}s of picture (he stops speaking at ${anchor.toFixed(2)}s), ` +
              `below the ${LCUT_MIN_PICTURE_SEC}s floor — that is a flash frame, not a beat. The take is shorter than the line was written for: ` +
              'shorten audioExtendsSec, or lengthen the dialogue so his picture has something to be on screen for.',
          );
        }
      }

      // 4b. audio for this shot — the voice ladder (see src/render/sarvam.ts)
      let voPath: string | null = null;
      let segments: Seg[] = [];
      let actualSec = billedSec;
      let voiceId: string | null = null;
      // The previous presenter shot handed its voice forward; this shot's picture plays under it.
      const carried = pendingCarry;
      pendingCarry = null;

      if (nativeAudio) {
        // (a) Veo performed the line in-shot. Free, and the quality bar — never overdubbed.
        // `audioSec` is the length of the PERFORMANCE, which under an L-cut is longer than this
        // shot's picture — so the caption segments correctly run over the shot that follows.
        const vo = nativeVo(shot.dialogue!, audioSec);
        segments = vo.segments;
        voiceId = vo.voiceId;
      } else if (carried) {
        // (a2) THE L-CUT. This shot is silent of its own accord and inherits the tail of the
        // previous presenter's take. Not a new voice — the same man, still mid-sentence — so it
        // reports NATIVE_VOICE and cannot trip the one-reel-one-narrator assertion. Its captions
        // belong to the shot that is speaking, so it contributes none of its own.
        voPath = carried.wav;
        voiceId = NATIVE_VOICE;
        console.log(`[render]   L-cut: ${carried.seconds}s of ${carried.fromId}'s own voice plays under this picture — the screen arrives inside his sentence.`);
      } else {
        // (b) Sarvam Bulbul v3, one male voice for the whole reel. (c) No key -> this throws.
        const speak = isPresenter ? shot.dialogue : shot.vo;
        const vo = await synthesizeVo(speak, work, shot.id);
        voPath = vo.audioPath;
        segments = vo.segments;
        voiceId = vo.voiceId;
        if (vo.costUsd > 0) {
          spentUsd += vo.costUsd;
          recordSpend({ run_id: runId, slug: creative.slug, shot_id: shot.id, provider: 'sarvam_bulbul_v3', model: SARVAM_PRICING.model, seconds: 0, cost_usd: vo.costUsd, estimated_usd: vo.costUsd, status: 'ok', detail: `tts ${vo.chars} chars · voice ${vo.voiceId}` });
          console.log(`[render]   narration: Sarvam ${vo.voiceId}, ${vo.chars} chars, $${vo.costUsd.toFixed(5)}`);
        }
        if (vo.durationSec > billedSec + 0.05) {
          // Real feedback for the creative engine: the line does not fit the billable duration.
          console.log(`[render]   note: ${shot.id} narration is ${vo.durationSec.toFixed(1)}s but the shot bills ${billedSec}s.`);
          if (dry) {
            actualSec = Math.round((vo.durationSec + 0.35) * 100) / 100;
            console.log(`[render]   dry mode extends the shot to ${actualSec}s; LIVE Veo would CUT the line off — shorten it.`);
          } else {
            console.log('[render]   the tail will be cut. Shorten the line or buy the next duration tier.');
          }
        }
      }

      // 4c. normalize to the house format.
      //
      // THE L-CUT IS A PICTURE CUT, NOT AN AUDIO EDIT: the shot is normalized to a SHORTER
      // duration than it was generated at (`pictureSec`, set above), and the seconds trimmed off
      // the picture are lifted back out of the raw clip as a wav for the next shot.
      if (lcutSec === 0) pictureSec = actualSec;
      await normalizeClip(rawClip, normClip, pictureSec, voPath, nativeAudio);
      const p = await probeVideo(resolveTools().ffprobe, normClip);
      if (p.width !== FRAME.w || p.height !== FRAME.h) throw new Error(`shot ${shot.id} normalized to ${p.width}x${p.height}`);

      if (lcutSec > 0) {
        const wav = resolve(work, `${shot.id}.lcut.wav`);
        const got = await extractCarryAudio(rawClip, pictureSec, lcutSec, wav);
        const heard = await carryIsAudible(wav);
        console.log(
          `[render]   L-cut: lifted ${got.toFixed(2)}s of ${shot.id}'s voice (mean ${heard.meanDb === null ? '-inf' : heard.meanDb.toFixed(1)} dB) ` +
            'to play under the next picture.',
        );
        // Pre-flight predicts this from word counts for $0; this is the waveform's own answer, and
        // it is the difference between an L-cut and the same silence one shot earlier. Loud in dry
        // mode only — a placeholder clip is silent by construction and that is not a defect.
        if (!heard.audible) {
          const msg = `L-cut on ${shot.id} carries SILENCE (mean ${heard.meanDb === null ? '-inf' : heard.meanDb.toFixed(1)} dB): the line "${(shot.dialogue ?? '').slice(0, 50)}" had already finished before the picture left at ${pictureSec}s. Shorten audioExtendsSec or lengthen the line.`;
          if (dry) console.log(`[render]   note (dry): ${msg}`);
          else throw new Error(msg);
        }
        pendingCarry = { fromId: shot.id, wav, seconds: lcutSec };
      }

      prepared.push({
        shot, path: normClip, seconds: pictureSec, startSec: cursor,
        segments: segments.map((s) => ({ ...s, start: s.start + cursor, end: s.end + cursor })),
        nativeAudio, voiceId, costUsd, provider: providerUsed,
        audioTailSec: lcutSec > 0 ? lcutSec : undefined,
        carriesVoiceFrom: carried?.fromId,
      });
      cursor = Math.round((cursor + pictureSec) * 100) / 100;
    }
    if (pendingCarry) throw new Error(`shot ${pendingCarry.fromId} declares an L-cut but nothing followed it — validateCreative should have refused this creative.`);

    // ---- 5. assemble ------------------------------------------------------------------
    // Post-generation restatement of the voice law: whatever the shots actually ended up
    // speaking with, it must still be one narrator. Throws before the finishing pass.
    assertSingleAdVoice(prepared.map((p) => ({ id: p.shot.id, voice: p.voiceId })));
    const voices = [...new Set(prepared.map((p) => p.voiceId).filter(Boolean))];
    console.log(`[render] voice plan verified: ${voices.join(' + ') || 'silent'}`);

    // The branded end card is a STANDING element of the renderer, not something a script opts
    // into: every reel ends on the wordmark and `vedichour.com`, and no creative can forget it.
    // Owner law 2026-07-26 — see END_CARD in src/render/assemble.ts.
    const bodySec = cursor;
    const endCardPath = resolve(work, 'endcard.mp4');
    const card = await renderEndCard(work, endCardPath, { dry });
    console.log(
      `[render] end card: ${card.seconds}s — vedichour.com + the "${'Try Vedic Hour dot com'}" sign-off at +${card.tagStartSec}s` +
        `${card.costUsd > 0 ? ` (tag synthesized once, $${card.costUsd.toFixed(5)}, cached for every future reel)` : ' (cached tag — $0)'}`,
    );
    if (card.costUsd > 0) {
      recordSpend({ run_id: runId, slug: creative.slug, shot_id: 'endcard', provider: 'sarvam_bulbul_v3', model: SARVAM_PRICING.model, seconds: 0, cost_usd: card.costUsd, estimated_usd: card.costUsd, status: 'ok', detail: 'branded end-card sign-off tag — synthesized once, then cached in media/brand/' });
    }

    const totalSec = Math.round((bodySec + card.seconds) * 100) / 100;
    const stitched = resolve(work, 'stitched.mp4');
    console.log(`[render] stitching ${prepared.length} shots + end card -> ${totalSec}s`);
    await concatClips([...prepared.map((p) => p.path), endCardPath], work, stitched);

    // THE BED IS MANDATORY. Every shot without a spoken line — hero, product, b-roll — is carried
    // by this and nothing else, so a missing file is a refusal, never a "voice-only" render.
    const music = requireMusicBed();
    console.log(`[render] music bed: ${music}`);

    const finalPath = resolve(outDir, 'final.mp4');
    const allSegments = prepared.flatMap((p) => p.segments);
    // Product pages carry their own dense text — move karaoke captions to the top zone there.
    const productWindows = prepared
      .filter((p) => p.shot.role === 'product')
      .map((p) => ({ start: p.startSec, end: p.startSec + p.seconds }));
    assertCaptionPlan(prepared, productWindows);
    console.log('[render] finishing: grade -> bloom -> vignette -> karaoke captions -> wordmark -> progress -> grain');
    const shotWindows = prepared.map((p) => ({ id: p.shot.id, start: p.startSec, end: p.startSec + p.seconds }));
    await finish({ stitched, work, outPath: finalPath, creative, segments: allSegments, totalSec, music, productWindows, shotWindows, endCardSec: card.seconds });

    // ---- 6. verify --------------------------------------------------------------------
    const framesDir = resolve(outDir, 'frames');
    const v = await verifyOutput(finalPath, totalSec, framesDir, 6, { dry });
    const verifyNote = verifyNoteFrom(v);
    console.log(`[render] verify: ${verifyNote}`);
    for (const f of v.frames) console.log(`[render]   frame: ${f}`);
    if (!v.ok) {
      logRun({ loop, status: 'error', detail: `verify failed: ${v.problems.join('; ').slice(0, 180)}` });
      enqueueApproval({ item: `Reel FAILED verification: ${creative.title} — ${v.problems.join('; ')}`, lane: 'B', linter_verdict: verdict.verdict, linter_reason: 'render verification failed', channel: 'reel' });
    }

    // ---- 7. publish pack --------------------------------------------------------------
    const pack = buildPublishPack(creative, finalPath, v.probe.durationSec, Math.round(spentUsd * 10000) / 10000, { dry, verified: v.ok });
    writeFileSync(resolve(outDir, 'publish.json'), JSON.stringify({ ...pack, verification: { ok: v.ok, problems: v.problems, probe: v.probe, frames: v.frames }, shots: est.shots }, null, 2));
    writePublishMd(outDir, pack, est, verifyNote);

    db().prepare(`INSERT INTO content_library (asset, type, product, script_source, status, meta) VALUES (?,?,?,?,?,?)`)
      .run(finalPath, 'reel', creative.product, `creative:${creative.slug}`, v.ok && !dry ? 'ready' : 'draft', JSON.stringify({ slug: creative.slug, title: creative.title, durationSec: v.probe.durationSec, costUsd: spentUsd, dry, verified: v.ok }));

    if (!dry) writeFileSync(picked.file, JSON.stringify({ ...picked.raw, status: 'rendered', rendered_at: new Date().toISOString() }, null, 2));
    if (verdict.verdict === 'flag') {
      enqueueApproval({ item: `Reel: ${creative.title}`, lane: 'B', linter_verdict: 'flag', linter_reason: verdict.reason, channel: 'reel' });
    }
    // ---- 8. localization (opt-in, winners only) ---------------------------------------
    const langs = parseLanguages(opts.languages ?? (picked.raw?.languages as string[] | undefined));
    if (langs.length) {
      console.log(`\n[localize] ${langs.length} language(s) requested: ${langs.map((l) => l.label).join(', ')}`);
      await localizeReel({ runId, creative, prepared, outDir, totalSec, music, est, dry, endCard: card }, langs);
    }

    // Cleanup on success keeps the PAID shots and deletes only the cheap derived files.
    //
    // The `*.raw.mp4` clips are the single most expensive thing this pipeline produces (~$3 a
    // reel) and they are the ONLY way to re-cut a reel for $0 afterwards. Wiping `work/`
    // wholesale turned a caption/pan fix into a full re-render — the exact waste CLAUDE.md §1
    // exists to prevent. Everything else here (norm/stitched/endcard/vo/plates/concat lists) is
    // regenerated for free from those raws, so it is the only thing worth reclaiming disk for.
    // Product shots are re-captured every run regardless (see the `role === 'product'` branch
    // above), so a kept product raw can never go stale into a later `--resume`.
    if (!opts.keepIntermediates && v.ok) {
      for (const entry of readdirSync(work)) {
        if (entry.endsWith('.raw.mp4')) continue;
        rmSync(resolve(work, entry), { recursive: true, force: true });
      }
      console.log('[render] cleanup: derived intermediates removed; the paid *.raw.mp4 shots stay in `work/` so this reel can be re-cut for $0 with --resume.');
    }

    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n[render] ${v.ok ? 'OK' : 'DONE WITH PROBLEMS'} ${finalPath}`);
    console.log(`[render] ${totalSec}s · ${FRAME.w}x${FRAME.h} · $${spentUsd.toFixed(2)} spent · rendered in ${secs}s${dry ? ' (DRY)' : ''}`);
    console.log(`[render] publish sheet: ${resolve(outDir, 'PUBLISH.md')}`);
    console.log(`[render] ${budgetLine(runId)}`);
    logRun({ loop, status: v.ok ? 'ok' : 'error', detail: `${creative.slug} ${totalSec}s $${spentUsd.toFixed(2)}${dry ? ' dry' : ''}`, duration_ms: Date.now() - t0 });
    writeHeartbeat(loop, `${dry ? 'dry ' : ''}${creative.slug}: ${v.ok ? 'verified' : 'problems'}`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`[render] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200), duration_ms: Date.now() - t0 });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Localization stage
// ---------------------------------------------------------------------------

interface LocalizeCtx {
  runId: string;
  creative: CreativeScript;
  prepared: PreparedShot[];
  outDir: string;
  totalSec: number;
  music: string | null;
  est: ReturnType<typeof estimateReel>;
  dry: boolean;
  /** The same branded end card the English cut ends on — a dub is still a VedicHour reel. */
  endCard: { path: string; seconds: number };
}

/**
 * Produce a REAL DUBBED variant per language: translated spoken script -> Sarvam TTS ->
 * sync.so lip-sync on the presenter shots -> reassembly with native-script captions.
 *
 * Every stage degrades rather than crashes:
 *   - no SARVAM_API_KEY   -> localization is skipped entirely (nothing else can proceed without audio)
 *   - no SYNC_API_KEY     -> ship the dub WITHOUT lip-sync (dubbed VO over the original footage,
 *                            standard practice for dubbed content) and say so in PUBLISH.md
 *   - no Indic system font -> skip, because captions would render as tofu
 */
async function localizeReel(ctx: LocalizeCtx, langs: LangSpec[]): Promise<void> {
  const { ffprobe } = resolveTools();

  if (!hasSarvamKey()) {
    console.log(`[localize] SARVAM_API_KEY not set — skipping ${langs.length} language(s). Nothing was charged.`);
    console.log('[localize] Get a key at sarvam.ai (new accounts receive Rs.100 of free credits).');
    return;
  }
  if (!indicFontAvailable()) {
    console.log('[localize] no Indic-capable system font found (expected Nirmala UI) — captions would render as tofu. Skipping.');
    return;
  }
  const lipsync = hasSyncKey();
  if (!lipsync) {
    console.log('[localize] SYNC_API_KEY not set — dubbing WITHOUT lip-sync (dubbed VO over the original presenter footage).');
  }

  for (const l of langs) {
    const langDir = resolve(ctx.outDir, l.code);
    const work = resolve(langDir, 'work');
    mkdirSync(work, { recursive: true });
    const estL = estimateLocalization(ctx.creative, lipsync ? LIPSYNC_ROLES : []);
    console.log(`\n[localize] ${l.label} (${l.nativeName}) — est. $${estL.totalUsd.toFixed(3)} (TTS $${estL.ttsUsd.toFixed(3)} + lip-sync $${estL.lipsyncUsd.toFixed(3)} over ${estL.lipsyncSec}s)`);

    if (ctx.dry) {
      console.log(`[localize] DRY — skipping the paid translate/TTS/lip-sync calls for ${l.label}.`);
      recordSpend({ run_id: ctx.runId, slug: ctx.creative.slug, shot_id: `lang:${l.code}`, provider: 'localize', seconds: estL.lipsyncSec, cost_usd: 0, estimated_usd: estL.totalUsd, status: 'dry', detail: `${l.label} dub` });
      continue;
    }

    const d = checkBudget(ctx.runId, estL.totalUsd, { slug: ctx.creative.slug, shotId: `lang:${l.code}`, provider: 'localize' });
    if (!d.allowed) {
      console.error(`[localize] BUDGET REFUSED for ${l.label} — ${d.reason}. Stopping localization.`);
      return;
    }

    try {
      // 1. translate ($0 — routed through the existing brain() CLI router)
      const script: LocalizedScript = await translateCreative(ctx.creative, l);
      console.log(`[localize]   translated ${Object.keys(script.lines).length} lines into ${l.nativeName}`);

      // 2. dub each shot with Sarvam, and lip-sync the presenter shots
      const dubbed: string[] = [];
      let langCost = 0;
      for (const p of ctx.prepared) {
        const line = script.lines[p.shot.id];
        const clipOut = resolve(work, `${p.shot.id}.mp4`);
        if (!line?.trim()) {
          await normalizeClip(p.path, clipOut, p.seconds, null, false);
          dubbed.push(clipOut);
          continue;
        }
        const wav = resolve(work, `${p.shot.id}.wav`);
        // MALE voice, per the same owner law that governs the English reel — a dubbed variant
        // must not hand the brand a different-gendered narrator in another language.
        const tts = await sarvamTts(line, l, l.voiceMale, wav);
        langCost += tts.costUsd;
        recordSpend({ run_id: ctx.runId, slug: ctx.creative.slug, shot_id: `${p.shot.id}:${l.code}`, provider: 'sarvam_bulbul_v3', model: 'bulbul:v3', seconds: 0, cost_usd: tts.costUsd, estimated_usd: tts.costUsd, status: 'ok', detail: `${tts.chars} chars` });

        let source = p.path;
        if (lipsync && LIPSYNC_ROLES.includes(p.shot.role)) {
          try {
            const ls = await syncLipsync(p.path, wav, resolve(work, `${p.shot.id}.lip.mp4`), (m) => console.log(`[localize]     ${m}`));
            source = ls.path;
            langCost += ls.costUsd;
            recordSpend({ run_id: ctx.runId, slug: ctx.creative.slug, shot_id: `${p.shot.id}:${l.code}`, provider: 'sync_lipsync2', model: LOCALIZE_PRICING.syncModel, seconds: ls.seconds, cost_usd: ls.costUsd, estimated_usd: syncCostFor(p.seconds), status: 'ok' });
          } catch (e: any) {
            console.warn(`[localize]   lip-sync failed for ${p.shot.id} (${String(e?.message ?? e).slice(0, 90)}) — using dub-over instead`);
            recordSpend({ run_id: ctx.runId, slug: ctx.creative.slug, shot_id: `${p.shot.id}:${l.code}`, provider: 'sync_lipsync2', seconds: 0, cost_usd: 0, estimated_usd: syncCostFor(p.seconds), status: 'error', detail: String(e?.message ?? e).slice(0, 200) });
          }
        }
        // The dubbed line may be a different length than the original — keep the shot's slot.
        await normalizeClip(source, clipOut, p.seconds, wav, false);
        dubbed.push(clipOut);
      }

      // 3. reassemble — including the same branded end card the English cut ends on. The tag is a
      //    brand name and a domain, so it needs no translation and no second synthesis.
      const stitched = resolve(work, 'stitched.mp4');
      await concatClips([...dubbed, ctx.endCard.path], work, stitched);

      // 4. captions via Chromium (libass cannot shape Indic — see src/render/localize.ts)
      // Planned against the STORY, not the reel: the end card is not a caption surface.
      const plan = planPlates(script, ctx.prepared.map((p) => ({ shot: p.shot, startSec: p.startSec, seconds: p.seconds })), ctx.totalSec - ctx.endCard.seconds);
      const plates = await renderCaptionPlates(plan, resolve(work, 'plates'));
      console.log(`[localize]   ${plates.length} caption plates rendered in Chromium (${l.nativeName} shaping)`);

      const finalPath = resolve(langDir, 'final.mp4');
      await finish({
        stitched, work, outPath: finalPath, creative: ctx.creative, segments: [], totalSec: ctx.totalSec,
        music: ctx.music, plates: plateOverlayGraph(plates, 'pbase', 'v'), endCardSec: ctx.endCard.seconds,
        shotWindows: ctx.prepared.map((p) => ({ id: p.shot.id, start: p.startSec, end: p.startSec + p.seconds })),
      });

      // 5. verify visually
      const v = await verifyOutput(finalPath, ctx.totalSec, resolve(langDir, 'frames'), 4, { dry: ctx.dry });
      console.log(`[localize]   verify ${l.label}: ${v.ok ? 'PASS' : 'PROBLEMS — ' + v.problems.join('; ')} (${v.probe.width}x${v.probe.height})`);

      // 6. per-language publish pack
      const pack = buildPublishPack(ctx.creative, finalPath, v.probe.durationSec, langCost, { dry: ctx.dry, verified: v.ok });
      pack.youtubeTitle = script.youtubeTitle;
      pack.description = `${script.description}\n\n${pack.description}`;
      if (script.hashtags.length) pack.hashtags = script.hashtags;
      pack.caption = `${script.hook}\n\n${Object.values(script.lines).join(' ').slice(0, 320)}\n\n${pack.hashtags.join(' ')}`;
      writeFileSync(resolve(langDir, 'publish.json'), JSON.stringify({ ...pack, language: l.code, lipsync, verification: { ok: v.ok, problems: v.problems, probe: v.probe } }, null, 2));
      writePublishMd(langDir, pack, ctx.est,
        `${v.ok ? 'PASS' : 'PROBLEMS: ' + v.problems.join('; ')} — ${l.label} dub, ${lipsync ? 'lip-synced via sync.so' : 'dubbed WITHOUT lip-sync (no SYNC_API_KEY)'}. Localization cost $${langCost.toFixed(3)}.`);

      console.log(`[localize] ${l.label} -> ${finalPath}  ($${langCost.toFixed(3)})`);
    } catch (e: any) {
      console.error(`[localize] ${l.label} failed: ${String(e?.message ?? e).slice(0, 200)}`);
      recordSpend({ run_id: ctx.runId, slug: ctx.creative.slug, shot_id: `lang:${l.code}`, provider: 'localize', seconds: 0, cost_usd: 0, estimated_usd: estL.totalUsd, status: 'error', detail: String(e?.message ?? e).slice(0, 200) });
    }
  }
}

function syncCostFor(seconds: number): number {
  return Math.round(seconds * LOCALIZE_PRICING.syncUsdPerSecond * 10000) / 10000;
}

/**
 * Compose the Veo prompt for a presenter shot.
 *
 * fal's guidance for Veo 3.1: put the spoken line in QUOTES to get lip-synced dialogue, and keep
 * the whole prompt roughly 150-300 characters (under ~100 goes generic, over ~400 starts dropping
 * elements). The dialogue must be Roman/Latin-script Hinglish — validateCreative() enforces that.
 */
export function presenterPrompt(shot: Shot): string {
  const look = shot.prompt ?? 'Medium close-up of a warm, natural Indian presenter in their late 20s, soft window light, calm modern interior, shallow depth of field, vertical 9:16 framing, speaking directly to camera';
  return `${look}. They say: "${shot.dialogue}". Natural lip-sync, relaxed conversational delivery, no on-screen text.`;
}

/** `npm run render:budget` — what the guard currently thinks. */
export function printBudgetStatus(): void {
  const c = caps();
  const s = spendSnapshot('n/a');
  console.log('Video render budget');
  console.log(`  per-run   cap $${c.perRunUsd.toFixed(2)}   (env VIDEO_BUDGET_RUN_USD)`);
  console.log(`  per-day   cap $${c.perDayUsd.toFixed(2)}   spent (rolling 24h) $${s.dayUsd.toFixed(2)}   (env VIDEO_BUDGET_DAY_USD)`);
  console.log(`  per-week  cap $${c.perWeekUsd.toFixed(2)}  spent (rolling 7d)  $${s.weekUsd.toFixed(2)}  (env VIDEO_BUDGET_WEEK_USD)`);
  console.log(`\nFAL_KEY: ${hasFalKey() ? 'set — live generation enabled' : 'NOT set — loop runs in dry mode'}`);
  console.log(`SARVAM_API_KEY: ${hasSarvamKey() ? 'set' : 'NOT set — live narration / end-card tag will refuse'}`);
  console.log('\nPrice table (fal.ai, verified July 2026):');
  for (const spec of Object.values(PRICE_TABLE)) {
    if (!spec.costPerSecond) continue;
    console.log(`  ${spec.key.padEnd(16)} $${spec.costPerSecond.toFixed(4)}/s  ${spec.endpoint}${spec.priceVerified ? '' : '   (INFERRED — budgeted high)'}`);
  }
}
