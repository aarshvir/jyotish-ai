import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { ROOT, logRun } from '../db/index';
import { lint } from '../policy/linter';
import { validateCreative } from '../render/types';
import { PRICE_TABLE, ROLE_ROUTING, estimateCost } from '../render/providers';
import {
  ALLOWED_CAPTURE, APPROVED_VOICES, BANNED_CAPTURE, BANNED_VOICE, FEMALE_VOICES,
  WORDS_PER_SECOND, genderOf, jargonHits, voiceGender, wordCount,
} from './policy';
import { activeLessons, lessonMatcher, SCOPES_ENFORCED_BY_RULE } from './lessons-bridge';
import { recordPreflight } from './store';
import { cheapTropeHits } from './cheap-tropes';

/**
 * STAGE 0 — THE PRE-FLIGHT GATE.  ($0, runs BEFORE any render.)
 *
 * Project law (../../CLAUDE.md §1): "any pipeline that spends money must have a $0 pre-flight
 * gate on its INPUTS that is strictly stronger than its post-hoc gate on outputs."
 *
 * Root cause it exists for: on 2026-07-26 all three defects the owner found — a synthetic
 * female narrator, a product shot scrolling the PRICING page, and "Swiss Ephemeris" jargon —
 * were plain TEXT in the creative JSON. Every gate we had ran on rendered frames, i.e. after
 * ~$3 of video generation. Every one of them is caught here, for free, before the spend.
 *
 * Hard-blocks (never warns) on: voice plan, capture targets, jargon, narration fit, brand
 * safety, and any mechanically-checkable active lesson.
 */

export interface PreflightIssue {
  /** Stable rule id — 'voice-plan' | 'capture-target' | 'jargon' | 'narration-fit' | ... */
  rule: string;
  /** Which law it comes from, for the owner-facing report. */
  law: string;
  /** JSON path into the creative, e.g. shots[2].capture.url */
  where: string;
  /** 1-based line in the creative file, when we can locate it. */
  line?: number;
  detail: string;
  fix: string;
}

export interface PlannedShot {
  id: string;
  role: string;
  provider: string;
  seconds: number;
  billedSec: number;
  usd: number;
  nativeAudio: boolean;
  narrated: boolean;
}

export interface PreflightResult {
  ok: boolean;
  slug: string;
  file: string | null;
  blocks: PreflightIssue[];
  warnings: PreflightIssue[];
  plan: PlannedShot[];
  estimatedUsd: number;
  checkedAt: string;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const CREATIVE_DIR = resolve(ROOT, 'output', 'creative');

/** Resolve a slug, a bare filename, or a path to a creative JSON file. */
export function resolveCreativeFile(slugOrPath: string): string | null {
  const direct = isAbsolute(slugOrPath) ? slugOrPath : resolve(process.cwd(), slugOrPath);
  if (existsSync(direct) && direct.endsWith('.json')) return direct;
  const bySlug = resolve(CREATIVE_DIR, `${slugOrPath}.json`);
  if (existsSync(bySlug)) return bySlug;
  // A rendered reel may be a "-v2" re-assembly of a base creative.
  const base = slugOrPath.replace(/-v\d+$/, '');
  const byBase = resolve(CREATIVE_DIR, `${base}.json`);
  if (existsSync(byBase)) return byBase;
  if (!existsSync(CREATIVE_DIR)) return null;
  const hit = readdirSync(CREATIVE_DIR).find((f) => f === `${slugOrPath}.json` || f.startsWith(`${base}`) && f.endsWith('.json'));
  return hit ? resolve(CREATIVE_DIR, hit) : null;
}

/** 1-based line number of the first line containing `needle`. */
function lineOf(raw: string | null, needle: string): number | undefined {
  if (!raw || !needle) return undefined;
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.includes(needle));
  return idx >= 0 ? idx + 1 : undefined;
}

/**
 * validateCreative() enforces some of the same owner rules from the render side, so a dirty
 * plan can surface the same defect twice. Keep the copy that names the law and the fix.
 */
function dedupeIssues(issues: PreflightIssue[]): PreflightIssue[] {
  const family = (i: PreflightIssue): string => {
    if (i.rule !== 'structure') return i.rule;
    if (/pricing|checkout|payment|onboard/i.test(i.detail)) return 'capture-target';
    if (/word|narration is capped|budget/i.test(i.detail)) return 'narration-fit';
    if (/voice|timbre/i.test(i.detail)) return 'voice-plan';
    return 'structure';
  };
  const subject = (i: PreflightIssue): string => /shots\[?#?([\w]+)\]?/.exec(i.where)?.[1] ?? i.where;
  const ordered = [...issues.filter((i) => i.rule !== 'structure'), ...issues.filter((i) => i.rule === 'structure')];
  const seen = new Set<string>();
  const kept = ordered.filter((i) => {
    const k = `${family(i)}|${subject(i)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Restore the original order so the report reads top-to-bottom through the creative.
  return issues.filter((i) => kept.includes(i));
}

/**
 * Visible copy a viewer can actually read in the product shot.
 *
 * Head/meta/JSON-LD, site chrome (`nav`/`footer`), and scripts are not on the report
 * grid. Scanning them blocked every capture of vedichour.com because the global footer
 * says "Vimshottari Dasha" and the default meta description names Swiss Ephemeris.
 * Prefer `<main>` when present — that is the hour-slot canvas the ad is meant to show.
 */
export function visiblePageText(html: string): string {
  const withoutChrome = html
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  const main = withoutChrome.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? withoutChrome;
  return main
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch a capture target and return its visible text.
 *
 * The owner's third defect — "Swiss Ephemeris" on screen — was never in the script: it was in
 * the PAGE the product shot scrolled. A pre-flight that only reads the creative JSON cannot
 * see it, so we read the page too. Best-effort: a network failure downgrades to a warning,
 * never a false block.
 */
async function pageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'VedicHour-preflight/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return visiblePageText(await res.text());
  } catch {
    return null;
  }
}

/** Every piece of viewer-facing ad copy in a creative, with its JSON path. */
function adCopyFields(c: any): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const push = (where: string, v: unknown) => {
    const t = typeof v === 'string' ? v : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' · ') : '';
    if (t.trim()) out.push({ where, text: t });
  };
  push('title', c.title);
  push('hook', c.hook);
  push('cta', c.cta);
  push('spokenScript', c.spokenScript);
  (Array.isArray(c.shots) ? c.shots : []).forEach((s: any, i: number) => {
    push(`shots[${i}].dialogue`, s?.dialogue);
    push(`shots[${i}].vo`, s?.vo);
  });
  push('onScreenCaptions', c.onScreenCaptions);
  push('youtubeTitle', c.youtubeTitle);
  push('youtubeDescription', c.youtubeDescription);
  push('hashtags', c.hashtags);
  for (const k of ['youtubeTitle', 'description', 'caption', 'tags', 'hashtags']) push(`publish.${k}`, c?.publish?.[k]);
  return out;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * Run every $0 input check over a creative plan.
 *
 * The render loop must call this and REFUSE TO START when `ok` is false:
 *     const pf = await runPreflight(raw, { file, raw: fileText });
 *     if (!pf.ok) { printPreflight(pf); return; }   // never spend on a dirty plan
 */
export async function runPreflight(
  creative: any,
  opts: { file?: string | null; raw?: string | null } = {},
): Promise<PreflightResult> {
  const raw = opts.raw ?? null;
  const blocks: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];
  const slug = String(creative?.slug ?? 'unknown');
  const block = (i: PreflightIssue) => blocks.push(i);
  const warn = (i: PreflightIssue) => warnings.push(i);

  const shots: any[] = Array.isArray(creative?.shots) ? creative.shots : [];

  // -- 0. structure + house rules (presenter opener, latin-script dialogue, ...) ------------
  const v = validateCreative(creative);
  for (const issue of v.issues) {
    const item = {
      rule: 'structure',
      law: 'src/render/types.ts validateCreative',
      where: issue.where,
      line: lineOf(raw, issue.where.replace(/shots\[(\d+)\]/, '')),
      detail: issue.message,
      fix: 'Fix the creative JSON so the render contract validates.',
    };
    issue.level === 'error' ? block(item) : warn(item);
  }

  // -- 1. VOICE PLAN (LAW §1, §2) -----------------------------------------------------------
  // The presenter's Veo native in-shot voice is free AND the quality bar. Narration by a
  // second (synthetic) voice is what the owner rejected on 2026-07-26.
  const narrated = shots.filter((s) => typeof s?.vo === 'string' && s.vo.trim());
  const presenters = shots.filter((s) => s?.role === 'presenter' || s?.role === 'presenter_close');
  const voice = String(creative?.voice ?? '').trim();
  const presenterGender = genderOf(presenters.map((s) => `${s?.prompt ?? ''} ${s?.dialogue ?? ''}`).join(' '));

  if (narrated.length) {
    const where = narrated.map((s) => `shots[#${s.id}].vo`).join(', ');
    if (!voice) {
      block({
        rule: 'voice-plan', law: 'CLAUDE.md §1 (voice plan) / §2 (quality)',
        where: 'voice', line: lineOf(raw, '"voice"'),
        detail: `${narrated.length} narrated shot(s) (${where}) but no \`voice\` id — the renderer falls back to the edge-tts default, which is exactly the synthetic narrator the owner rejected.`,
        fix: 'Move the narration into presenter `dialogue` (Veo native voice, $0 and better), or set an approved Sarvam male voice.',
      });
    } else if (BANNED_VOICE.test(voice)) {
      block({
        rule: 'voice-plan', law: 'CLAUDE.md §2 ("Never edge-tts / en-IN-NeerjaNeural in an ad")',
        where: 'voice', line: lineOf(raw, voice),
        detail: `voice "${voice}" is an edge-tts/neural TTS voice — it reads as synthetic narration.`,
        fix: `Move the lines on-camera as presenter dialogue, or use an approved Sarvam Bulbul v3 voice (${APPROVED_VOICES.slice(0, 4).join(', ')}, ...).`,
      });
    } else if (![...APPROVED_VOICES, ...FEMALE_VOICES].some((a) => voice.toLowerCase().includes(a))) {
      block({
        rule: 'voice-plan', law: 'CLAUDE.md §1 ("any voice id not on the approved list")',
        where: 'voice', line: lineOf(raw, voice),
        detail: `voice "${voice}" is not on the approved list.`,
        fix: `Use one of: ${APPROVED_VOICES.join(', ')} (male) — see APPROVED_VOICES in src/audit/policy.ts.`,
      });
    } else {
      const vg = voiceGender(voice);
      if (presenterGender !== 'unknown' && vg !== 'unknown' && vg !== presenterGender) {
        block({
          rule: 'voice-plan', law: 'CLAUDE.md §1 ("any gender/timbre switch within one reel")',
          where: 'voice', line: lineOf(raw, voice),
          detail: `presenter reads as ${presenterGender} but the narration voice "${voice}" is ${vg} — a gender switch mid-reel.`,
          fix: `Match the narrator to the presenter, or put the lines on-camera.`,
        });
      }
    }
    // Even an approved, gender-matched narrator is a SECOND human voice arriving mid-reel.
    if (presenters.some((s) => s?.dialogue)) {
      block({
        rule: 'voice-plan', law: 'CLAUDE.md §1 ("any gender/timbre switch within one reel") + §2',
        where: `shots[#${narrated[0].id}].vo`, line: lineOf(raw, String(narrated[0].vo).slice(0, 40)),
        detail: `the reel opens on the presenter's Veo NATIVE voice (shot ${presenters[0]?.id}) and then switches to a separate narrator at shot ${narrated[0].id} — two different voices in one reel.`,
        fix: 'Rewrite so the presenter says these lines on camera (LAW §2: eliminating narration is both cheaper and better than buying better TTS).',
      });
    }
  }

  // -- 2. CAPTURE TARGETS (LAW §1) ----------------------------------------------------------
  shots.forEach((s, i) => {
    const url = s?.capture?.url;
    if (!url) return;
    if (BANNED_CAPTURE.test(url)) {
      block({
        rule: 'capture-target', law: 'CLAUDE.md §1 ("any URL matching /pricing|checkout|payment|onboard")',
        where: `shots[${i}].capture.url`, line: lineOf(raw, url),
        detail: `product shot captures a PAYMENT surface: ${url}`,
        fix: 'Point the capture at the REPORT (hour slots + what-to-do-when). The ad shows the product, never the checkout.',
      });
    } else if (!ALLOWED_CAPTURE.some((re) => re.test(url))) {
      block({
        rule: 'capture-target', law: 'CLAUDE.md §1 ("Product shots show THE REPORT ... only")',
        where: `shots[${i}].capture.url`, line: lineOf(raw, url),
        detail: `product shot captures ${url}, which is not a report surface.`,
        fix: 'Capture the report. If this page is legitimately part of the proof, add it to ALLOWED_CAPTURE in src/audit/policy.ts with the owner\'s agreement.',
      });
    }
  });

  // -- 2b. WHAT THE CAPTURED PAGE ACTUALLY SAYS ---------------------------------------------
  // Jargon the viewer reads on screen is still jargon, even when the script is clean.
  const captureUrls = [...new Set(shots.map((s) => s?.capture?.url).filter(Boolean) as string[])];
  const pages = await Promise.all(captureUrls.map(async (u) => ({ url: u, text: await pageText(u) })));
  for (const p of pages) {
    const i = shots.findIndex((s) => s?.capture?.url === p.url);
    if (p.text === null) {
      warn({
        rule: 'capture-content', law: 'CLAUDE.md §1 (jargon), checked on the page itself',
        where: `shots[${i}].capture.url`, line: lineOf(raw, p.url),
        detail: `could not fetch ${p.url} to check what the viewer would read on screen.`,
        fix: 'Re-run pre-flight with network access, or check the page by eye before rendering.',
      });
      continue;
    }
    const terms = [...new Set(jargonHits(p.text).map((h) => h.term))];
    if (terms.length) {
      block({
        rule: 'capture-content', law: 'CLAUDE.md §1 (jargon list)',
        where: `shots[${i}].capture.url`, line: lineOf(raw, p.url),
        detail: `the page ${p.url} shows banned jargon ON SCREEN: ${terms.map((t) => `"${t}"`).join(', ')}. The script is clean but the viewer still reads it.`,
        fix: 'Capture a page/section without the jargon (the report body), or scroll past that block, or reword the page.',
      });
    }
  }

  // -- 3. JARGON (LAW §1) -------------------------------------------------------------------
  for (const f of adCopyFields(creative)) {
    for (const hit of jargonHits(f.text)) {
      block({
        rule: 'jargon', law: 'CLAUDE.md §1 (jargon list)',
        where: f.where, line: lineOf(raw, f.text.slice(Math.max(0, hit.index - 12), hit.index + 24)),
        detail: `"${hit.term}" appears in ${f.where}: …${f.text.slice(Math.max(0, hit.index - 40), hit.index + 40).trim()}…`,
        fix: `Say it in plain English a non-astrologer understands. Delete "${hit.term}".`,
      });
    }
  }

  // -- 4. NARRATION FIT (LAW §1) ------------------------------------------------------------
  shots.forEach((s, i) => {
    const spoken = String(s?.dialogue ?? s?.vo ?? '').trim();
    const secs = Number(s?.seconds ?? 0);
    if (!spoken || !(secs > 0)) return;
    const words = wordCount(spoken);
    const allowed = Math.floor(secs * WORDS_PER_SECOND);
    if (words > allowed) {
      block({
        rule: 'narration-fit', law: `CLAUDE.md §1 (words ≤ seconds × ${WORDS_PER_SECOND})`,
        where: `shots[${i}].${s?.dialogue ? 'dialogue' : 'vo'}`, line: lineOf(raw, spoken.slice(0, 40)),
        detail: `${words} words in a ${secs}s shot — ${words - allowed} over the ${allowed}-word budget. It will be rushed or cut mid-sentence.`,
        fix: `Cut to ≤${allowed} words, or lengthen the shot to ${Math.ceil(words / WORDS_PER_SECOND)}s.`,
      });
    }
  });

  // -- 5. BRAND SAFETY (LAW §1 — the existing banned-claims list) ----------------------------
  // classify:false = the deterministic word list only: $0, instant, reproducible.
  for (const f of adCopyFields(creative)) {
    const r = await lint(f.text, { classify: false, context: 'ad' });
    if (r.verdict === 'block') {
      block({
        rule: 'brand-safety', law: 'config/banned-claims.json',
        where: f.where, line: lineOf(raw, f.text.slice(0, 40)),
        detail: `${r.reason} — in ${f.where}`,
        fix: 'Remove the banned claim. VedicHour sells timing awareness, never outcomes.',
      });
    } else if (r.verdict === 'flag') {
      warn({
        rule: 'brand-safety', law: 'config/banned-claims.json',
        where: f.where, line: lineOf(raw, f.text.slice(0, 40)),
        detail: `${r.reason} — in ${f.where}`,
        fix: 'Review the wording before spending on a render.',
      });
    }
  }

  // -- 5b. Cheap visual tropes — stock spiritual wallpaper / fake proof ----------
  const visualBlob = shots
    .map((s) => String((s as { prompt?: string; visualPrompt?: string })?.prompt ?? (s as { visualPrompt?: string })?.visualPrompt ?? ''))
    .join(' ');
  const copyBlob = adCopyFields(creative).map((f) => f.text).join(' ');
  for (const t of cheapTropeHits(visualBlob, copyBlob)) {
    block({
      rule: 'cheap-visual',
      law: 'config/reel-craft.json neverGenerateVisual',
      where: 'shots[].prompt / ad copy',
      detail: `cheap trope "${t}" — stock spiritual wallpaper or fake social proof.`,
      fix: 'Use a real presenter room + report screencap. Never mandala spam or invented proof.',
    });
  }

  // -- 6. LESSONS (LAW §4) ------------------------------------------------------------------
  const lessons = await activeLessons();
  const allCopy = adCopyFields(creative);
  const planForLessons = { ...(creative ?? {}) };
  delete planForLessons.blocked_reason;
  delete planForLessons.status;
  const planText = JSON.stringify(planForLessons);
  for (const l of lessons) {
    const m = lessonMatcher(l);
    if (!m) {
      // Scopes with a dedicated rule above are already asserted — re-warning buries the signal.
      if (l.scope && SCOPES_ENFORCED_BY_RULE[l.scope]) continue;
      warn({
        rule: 'lesson', law: 'lessons store (not checkable on the plan)',
        where: l.scope ?? 'creative',
        detail: `active lesson: ${l.rule}`,
        fix: 'Not provable from the plan — the post-render review lenses assert this one on the pixels.',
      });
      continue;
    }
    const inCopy = allCopy.find((f) => m.re.test(f.text));
    const hit = inCopy ? inCopy.where : m.re.test(planText) ? 'creative(plan)' : null;
    if (hit) {
      block({
        rule: 'lesson', law: `lessons store — ${l.severity ?? 'lesson'}`,
        where: hit, line: lineOf(raw, (inCopy?.text ?? '').slice(0, 40)),
        detail: `violates an active lesson (${m.label}): ${l.rule}`,
        fix: l.evidence ? `Previously rejected: ${l.evidence}` : 'Apply the lesson and re-run pre-flight.',
      });
    }
  }

  // -- render plan + cost -------------------------------------------------------------------
  const plan: PlannedShot[] = shots.map((s) => {
    const key = (s?.provider ?? (ROLE_ROUTING as any)[s?.role] ?? 'placeholder') as keyof typeof PRICE_TABLE;
    const spec = PRICE_TABLE[key];
    const est = spec ? estimateCost(key, Number(s?.seconds ?? 0)) : { seconds: 0, usd: 0 };
    return {
      id: String(s?.id ?? '?'), role: String(s?.role ?? '?'), provider: String(key),
      seconds: Number(s?.seconds ?? 0), billedSec: est.seconds, usd: est.usd,
      nativeAudio: Boolean(spec?.nativeAudio), narrated: Boolean(s?.vo),
    };
  });
  const estimatedUsd = Math.round(plan.reduce((a, p) => a + p.usd, 0) * 10000) / 10000;

  const finalBlocks = dedupeIssues(blocks);
  const result: PreflightResult = {
    ok: finalBlocks.length === 0,
    slug,
    file: opts.file ?? null,
    blocks: finalBlocks,
    warnings: dedupeIssues(warnings),
    plan,
    estimatedUsd,
    checkedAt: new Date().toISOString(),
  };
  recordPreflight(slug, result.ok, result.blocks.length, result.warnings.length, { blocks: result.blocks, warnings: result.warnings });
  logRun({
    loop: 'preflight',
    status: result.ok ? 'ok' : 'skipped',
    detail: `${slug}: ${result.blocks.length} block(s), ${result.warnings.length} warning(s), plan $${estimatedUsd.toFixed(2)}`,
  });
  return result;
}

/** Human-readable pre-flight report. Returns the text so callers can log it too. */
export function formatPreflight(r: PreflightResult): string {
  const L: string[] = [];
  const loc = (i: PreflightIssue) => `${i.where}${i.line ? `:${i.line}` : ''}`;
  L.push('');
  L.push(`PRE-FLIGHT — ${r.slug}${r.file ? `  (${r.file})` : ''}`);
  L.push(`plan: ${r.plan.length} shots · ${r.plan.reduce((a, p) => a + p.seconds, 0)}s · would spend $${r.estimatedUsd.toFixed(2)}`);
  for (const p of r.plan) {
    L.push(`   ${p.id.padEnd(4)} ${p.role.padEnd(16)} ${p.provider.padEnd(12)} ${String(p.seconds).padStart(4)}s  $${p.usd.toFixed(2)}${p.narrated ? '  [narrated]' : p.nativeAudio ? '  [native audio]' : ''}`);
  }
  L.push('');
  if (r.blocks.length) {
    L.push(`BLOCKED — ${r.blocks.length} hard rule violation(s). NOTHING may be rendered until these are fixed.`);
    r.blocks.forEach((i, n) => {
      L.push(`  ${n + 1}. [${i.rule}] ${loc(i)}`);
      L.push(`     ${i.detail}`);
      L.push(`     FIX: ${i.fix}`);
      L.push(`     law: ${i.law}`);
    });
  } else {
    L.push('CLEAN — no hard-rule violations. Safe to spend.');
  }
  if (r.warnings.length) {
    L.push('');
    L.push(`warnings (${r.warnings.length}, not blocking):`);
    r.warnings.forEach((i) => L.push(`   - [${i.rule}] ${loc(i)} — ${i.detail}`));
  }
  L.push('');
  return L.join('\n');
}

/** CLI entry: `npm run preflight -- <slug|path>`. Exit code 1 on any block. */
export async function preflightCli(slugOrPath: string): Promise<number> {
  if (!slugOrPath) {
    console.error('usage: npm run preflight -- <creative-slug|path/to/creative.json>');
    return 2;
  }
  const file = resolveCreativeFile(slugOrPath);
  if (!file) {
    console.error(`[preflight] no creative found for "${slugOrPath}" (looked in output/creative/)`);
    return 2;
  }
  const rawText = readFileSync(file, 'utf8');
  let creative: any;
  try {
    creative = JSON.parse(rawText);
  } catch (e: any) {
    console.error(`[preflight] ${file} is not valid JSON: ${String(e?.message ?? e)}`);
    return 2;
  }
  const r = await runPreflight(creative, { file, raw: rawText });
  console.log(formatPreflight(r));
  return r.ok ? 0 : 1;
}
