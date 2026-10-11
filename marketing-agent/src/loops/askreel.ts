/**
 * L2c — ASK-REEL. A 16-second, silent, $0 reel in the shape that is working for a competitor:
 *
 *   hook card -> the questions on a black card -> brand reveal -> the real product screen -> end card
 *
 * Learned 2026-10-12 from a competitor's 15-second reel (an AI Vedic Q&A app). We copy the
 * STRUCTURE only. The copy is ours, the proof shot is OUR real report, and the one decision that
 * makes it ours: the competitor answers "should I?" (a verdict about a boyfriend or a job);
 * VedicHour answers "WHEN?" (which hour). So every question on the card must be a timing
 * question. That is also what keeps it inside the owner's safety rules: no reading of another
 * person's feelings, no health, death, pregnancy or money-win questions, no yes/no life verdicts.
 *
 * Law (CLAUDE.md): §1 a $0 pre-flight on the INPUTS that hard-blocks before a browser or ffmpeg
 * starts; §2 no synthetic voice (this reel has none); §5 nothing publishes without the owner.
 * This loop only writes files into output/askreels/<slug>/. It never posts.
 *
 * Output: reel.mp4 (1080x1920), caption.md (paste as-is), askreel.json, verify/*.png (frames to LOOK at).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, utm } from '../brand';
import { jargonHits, lint } from '../policy/linter';
import { assertCaptureAllowed, resolveCapture, resolveLiveCapture } from '../render/capture-policy';
import { captureProductShot } from '../render/screencap';
import { computeProofWindow, measureReportPage } from '../render/reportMeasure';
import { probeVideo, resolveTools, runTool } from '../render/ffmpeg';
import { MAX_REEL_SECONDS, TIMELINE, composeAskReel, renderAskReelFrames, totalSeconds, type CardCopy } from '../render/askreel';

export const ASKREEL_OUT = resolve(ROOT, 'output', 'askreels');

export interface AskReelSpec {
  slug: string;
  hook: string;
  questions: [string, string];
  hashtags: string[];
}

export interface AskReelConfig {
  /** Which hour card the real-report scroll lands on. The pixels are measured live at render time. */
  proof: { focus: string; cardsBefore: number; note?: string };
  reveal: { kicker: string; brand: string; ask: string };
  proofLine: string;
  sampleTag: string;
  endCard: { headline: string; sub: string };
  reels: AskReelSpec[];
}

export function loadAskReelConfig(path = resolve(ROOT, 'config', 'ask-reels.json')): AskReelConfig {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  return {
    proof: j.proof,
    reveal: j.reveal,
    proofLine: j.proofLine,
    sampleTag: j.sampleTag,
    endCard: j.endCard,
    reels: Array.isArray(j.reels) ? j.reels : [],
  };
}

// ── The $0 gate ─────────────────────────────────────────────────────────────────────────────

/** Only a "when / which hour" question may be asked: that is the product, and it is the safe lane. */
export const TIMING_QUESTION = /^(when|which (hour|day|time|window|week|month)|what (hour|time|day))\b.*\?$/i;

/** Topics a timing reel must never touch (third-party feelings, health, death, pregnancy, wagers). */
export const UNSAFE_TOPIC =
  /\b(cheat\w*|unfaithful|loyal\w*|love[sd]? me|boyfriend|girlfriend|husband|wife|divorc\w*|\bex\b|die|dying|death|dead|cancer|pregnan\w*|baby|boy or girl|illness|disease|surgery|diagnos\w*|suicide|abort\w*|lottery|jackpot|invest\w*|stocks?|crypto|gambl\w*)\b/i;

/** Competitors are never named in our own ad. */
export const COMPETITOR_NAME = /melooha|astrotalk|astroyogi|astrosage|ganeshaspeaks|prokerala|clickastro|indastro|co-?star|the pattern|nebula/i;

/** No prices, promo codes or the retired free-report / free-question promises on a reel. */
export const OFFER_CLAIM = /₹|\$\s?\d|\bAED\b|\d+\s?%|NEWUSER|discount|coupon|promo|free (report|question|reading|forecast)/i;

/** An hour-card label as the sample report prints it, e.g. "5 - 6 pm" or "10 – 11 am". */
export const HOUR_LABEL = /^\d{1,2}\s*[–-]\s*\d{1,2}\s*(am|pm)$/i;

const LIMITS = { hook: 60, question: 44, proofLine: 36, headline: 36, sub: 24, sampleTag: 20 } as const;

export function caption(cfg: AskReelConfig, spec: AskReelSpec): { text: string; link: string } {
  const link = utm('/lagna-calculator', 'instagram', 'reel', 'ask_reel', spec.slug);
  const tags = spec.hashtags.filter((h) => h.startsWith('#')).slice(0, 12);
  const text = [
    spec.hook,
    '',
    'Ask when, not just whether. VedicHour scores 18 hourly windows of your day against your own birth chart: clearer windows and heavier ones, in plain English.',
    '',
    `Find your rising sign free (link in bio): ${link}`,
    BRAND.taglineClose,
    '',
    BRAND.disclaimer,
    tags.length ? `\n${tags.join(' ')}` : '',
  ]
    .join('\n')
    .trim();
  return { text, link };
}

/** Everything a stranger will read on the reel or in the caption. */
export function visibleCopy(cfg: AskReelConfig, spec: AskReelSpec, captionText: string): string {
  return [
    spec.hook,
    ...spec.questions,
    cfg.reveal.kicker,
    cfg.reveal.brand,
    cfg.reveal.ask,
    cfg.proofLine,
    cfg.sampleTag,
    cfg.endCard.headline,
    cfg.endCard.sub,
    BRAND.disclaimer,
    captionText,
  ].join('\n');
}

/**
 * Deterministic pre-flight on the INPUTS. Returns the list of problems; an empty list means clean.
 * Pure and browser-free so every rule is unit-tested and runs before a single pixel is drawn.
 */
export function preflightAskReel(cfg: AskReelConfig, spec: AskReelSpec): string[] {
  const p: string[] = [];
  const { text: cap } = caption(cfg, spec);
  const all = visibleCopy(cfg, spec, cap);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(spec.slug ?? '')) p.push(`slug "${spec.slug}" must be lowercase words joined by hyphens`);
  if (!Array.isArray(spec.questions) || spec.questions.length !== 2) p.push('exactly two questions are required');
  const qs = Array.isArray(spec.questions) ? spec.questions : [];

  const lenCheck = (label: string, s: string, max: number) => {
    if (typeof s !== 'string' || !s.trim()) p.push(`${label} is empty`);
    else if (s.length > max) p.push(`${label} is ${s.length} characters (max ${max}): it will not fit on one card`);
  };
  lenCheck('hook', spec.hook, LIMITS.hook);
  qs.forEach((q, i) => lenCheck(`question ${i + 1}`, q, LIMITS.question));
  lenCheck('proofLine', cfg.proofLine, LIMITS.proofLine);
  lenCheck('sampleTag', cfg.sampleTag, LIMITS.sampleTag);
  lenCheck('endCard.headline', cfg.endCard?.headline, LIMITS.headline);
  lenCheck('endCard.sub', cfg.endCard?.sub, LIMITS.sub);

  for (const q of qs) {
    if (!TIMING_QUESTION.test((q ?? '').trim())) {
      p.push(`question "${q}" is not a timing question (it must start "When…" or "Which hour/day/time…" and end with "?"). VedicHour answers WHEN, not whether.`);
    }
  }

  const unsafe = UNSAFE_TOPIC.exec(all);
  if (unsafe) p.push(`copy touches a topic the brand never speculates about ("${unsafe[0]}"): another person's feelings, health, death, pregnancy, wagers or investing`);
  const rival = COMPETITOR_NAME.exec(all);
  if (rival) p.push(`copy names a competitor ("${rival[0]}"). We never name them in our own content.`);
  const offer = OFFER_CLAIM.exec(all);
  if (offer) p.push(`copy contains a price, promo or retired offer ("${offer[0]}"). Prices live on the site; the reel sells the free calculator.`);
  const jargon = jargonHits(all);
  if (jargon.length) p.push(`ad-copy jargon: ${jargon.join(', ')} (say "real astronomical data")`);
  const pr = cfg.proof;
  if (!pr || typeof pr.focus !== 'string' || !HOUR_LABEL.test(pr.focus.trim())) {
    p.push('proof.focus must name an hour card like "5 - 6 pm" (config/ask-reels.json)');
  } else if (!Number.isInteger(pr.cardsBefore) || pr.cardsBefore < 0 || pr.cardsBefore > 4) {
    p.push('proof.cardsBefore must be a whole number from 0 to 4');
  }
  if (!cap.includes(BRAND.disclaimer)) p.push('caption is missing the reflection-and-planning disclaimer');
  if (totalSeconds() > MAX_REEL_SECONDS) p.push(`timeline is ${totalSeconds()}s (max ${MAX_REEL_SECONDS}s)`);
  return p;
}

function cardCopy(cfg: AskReelConfig, spec: AskReelSpec): CardCopy {
  return {
    hook: spec.hook,
    questions: spec.questions,
    reveal: cfg.reveal,
    endCard: cfg.endCard,
    disclaimer: BRAND.disclaimer,
  };
}

export interface AskReelResult {
  slug: string;
  dir: string;
  video: string;
  seconds: number;
  caption: string;
  link: string;
  captureUrl: string;
  verifyFrames: string[];
  linter: { verdict: string; reason: string };
}

/** Pull six frames out of the finished file so a person (or a model) can LOOK at it (CLAUDE.md §7). */
async function extractVerifyFrames(video: string, dir: string, seconds: number): Promise<string[]> {
  const { ffmpeg } = resolveTools();
  mkdirSync(dir, { recursive: true });
  const marks = [0.9, 3.6, 5.3, 7.6, 9.1, 12.4, seconds - 0.9];
  const out: string[] = [];
  for (let i = 0; i < marks.length; i++) {
    const png = resolve(dir, `v${i + 1}-${marks[i].toFixed(1)}s.png`);
    await runTool(ffmpeg, ['-y', '-ss', marks[i].toFixed(2), '-i', video, '-frames:v', '1', '-vf', 'scale=540:-2', png], undefined, 60000);
    out.push(png);
  }
  return out;
}

export async function renderAskReel(cfg: AskReelConfig, spec: AskReelSpec): Promise<AskReelResult> {
  // 1. The $0 gate: nothing below this line runs on a bad plan.
  const problems = preflightAskReel(cfg, spec);
  if (problems.length) {
    throw new Error(`ask-reel "${spec.slug}" failed pre-flight, nothing was rendered:\n  - ${problems.join('\n  - ')}`);
  }
  const { text, link } = caption(cfg, spec);
  const lintRes = await lint(text, { classify: false, context: 'ad' });
  if (lintRes.verdict !== 'pass') {
    throw new Error(`ask-reel "${spec.slug}" caption was ${lintRes.verdict} by the policy linter: ${lintRes.reason}. Nothing was rendered.`);
  }

  // 2. The proof shot is the real report, never pricing or checkout.
  const planned = resolveCapture('hour slot report window');
  const target = await resolveLiveCapture(planned, (m) => console.log(`[askreel]   ${m}`));
  assertCaptureAllowed(target.url, 'ask-reel proof shot');

  const dir = resolve(ASKREEL_OUT, spec.slug);
  const work = resolve(dir, 'work');
  mkdirSync(work, { recursive: true });

  // Measure the page we are about to film, and refuse to film anything near the pricing block.
  const measured = await measureReportPage(target.url);
  const win = computeProofWindow(measured, cfg.proof.focus, cfg.proof.cardsBefore);
  console.log(
    `[askreel]   report measured: ${measured.cards.length} hour cards, window ${win.startPx}->${win.endPx}px ending on "${win.focusLabel}"` +
      (win.dangerTopPx !== null ? `, pricing block at ${win.dangerTopPx}px (last frame reaches ${win.endPx + 1920}px)` : ''),
  );

  const frames = await renderAskReelFrames(cardCopy(cfg, spec), cfg.proofLine, cfg.sampleTag, resolve(dir, 'frames'));
  const proofClip = await captureProductShot({
    url: target.url,
    seconds: TIMELINE.proof,
    outPath: resolve(work, 'proof.mp4'),
    waitForSelector: target.waitForSelector,
    offsetPx: win.startPx,
    panToPx: win.endPx,
    onProgress: (m) => console.log(`[askreel]   ${m}`),
  });
  const video = await composeAskReel({ frames, proofClip, outPath: resolve(dir, 'reel.mp4'), workDir: work });

  // 3. Verify the file we made, not the plan we had.
  const { ffprobe } = resolveTools();
  const probe = await probeVideo(ffprobe, video);
  if (probe.width !== 1080 || probe.height !== 1920) throw new Error(`reel is ${probe.width}x${probe.height}, expected 1080x1920`);
  if (probe.durationSec > MAX_REEL_SECONDS + 0.5) throw new Error(`reel is ${probe.durationSec.toFixed(1)}s, over the ${MAX_REEL_SECONDS}s limit`);
  const verifyFrames = await extractVerifyFrames(video, resolve(dir, 'verify'), probe.durationSec);

  const result: AskReelResult = {
    slug: spec.slug,
    dir,
    video,
    seconds: Math.round(probe.durationSec * 10) / 10,
    caption: text,
    link,
    captureUrl: target.url,
    verifyFrames,
    linter: { verdict: lintRes.verdict, reason: lintRes.reason },
  };
  writeFileSync(resolve(dir, 'askreel.json'), JSON.stringify({ ...result, spec, probe }, null, 2));
  writeFileSync(
    resolve(dir, 'caption.md'),
    [
      `# Instagram reel — ${spec.slug}`,
      '',
      `**NOT POSTED.** Preview for owner approval. ${result.seconds}s, 1080x1920, silent (add trending audio inside Instagram when you post). Cost: $0.`,
      '',
      '## Caption (paste as-is)',
      '',
      text,
      '',
      `_linter: ${lintRes.verdict} — ${lintRes.reason}_`,
      '',
      `_proof shot: ${target.url} (sample chart; the report, never pricing)_`,
      '',
    ].join('\n'),
  );
  return result;
}

export async function runAskReelLoop(opts: { slug?: string } = {}): Promise<void> {
  const loop = 'askreel';
  if (isKilled()) {
    console.log(`[askreel] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  const cfg = loadAskReelConfig();
  if (opts.slug === 'all') {
    // One slug at a time on purpose: each render drives a browser and a long ffmpeg job.
    for (const r of cfg.reels) await runAskReelLoop({ slug: r.slug });
    return;
  }
  const spec = opts.slug ? cfg.reels.find((r) => r.slug === opts.slug) : cfg.reels[0];
  if (!spec) {
    console.log(`[askreel] no spec${opts.slug ? ` named "${opts.slug}"` : ''}. Available: ${cfg.reels.map((r) => r.slug).join(', ')}`);
    logRun({ loop, status: 'skipped', detail: 'no spec' });
    return;
  }
  logRun({ loop, status: 'started' });
  const t0 = Date.now();
  try {
    const r = await renderAskReel(cfg, spec);
    console.log(`[askreel] ${r.slug} → ${r.video} (${r.seconds}s, $0.00)`);
    console.log(`[askreel] look at these frames before approving:\n  ${r.verifyFrames.join('\n  ')}`);
    console.log(`[askreel] linter: ${r.linter.verdict} — ${r.linter.reason}`);
    logRun({ loop, status: 'ok', detail: `${r.slug} ${r.seconds}s`, duration_ms: Date.now() - t0 });
    writeHeartbeat(loop, `${r.slug} rendered`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[askreel] ${spec.slug} FAILED: ${msg}`);
    logRun({ loop, status: 'error', detail: `${spec.slug}: ${msg.slice(0, 180)}` });
    process.exitCode = 1;
  }
}

/** Convenience for the unit tests and the CLI listing. */
export function listAskReels(): string[] {
  const p = resolve(ROOT, 'config', 'ask-reels.json');
  return existsSync(p) ? loadAskReelConfig(p).reels.map((r) => r.slug) : [];
}
