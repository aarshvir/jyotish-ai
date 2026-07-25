import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain, type Tier } from '../brain/index';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, BRAND_BRIEF, utm } from '../brand';

const OUT_DIR = resolve(ROOT, 'output', 'creative');
const SEEDS_FILE = resolve(ROOT, 'config', 'creative-seeds.json');

const IDEAS_REQUESTED = 10; // ideation asks for 8-12; 10 is the ask
const IDEAS_SCRIPTED = 3; // how many ideas advance to scripting (--count)
const VARIANTS_PER_IDEA = 6;
const WINNERS_KEPT = 3;
const BRAND_SAFETY_FLOOR = 80; // ANY brand-safety failure is a hard reject
const HOOK_MAX_WORDS = 8; // spec; 10 is the hard reject line
const HOOK_REJECT_WORDS = 10;
const BRACKET_SIZE = 4;
const TTS_VOICE = 'en-IN-NeerjaNeural'; // matches config/reel-scripts.json
/** Per-stage wall-clock deadline. Longer than any single CLI timeout in routing.json,
 *  short enough that an unattended 2-hourly loop can never wedge on a stuck child. */
const STAGE_DEADLINE_MS = 300_000;

/** Weighted total. Hook carries the most weight — the first second is the whole game. */
const WEIGHTS = { hookStrength: 0.3, specificity: 0.2, credibility: 0.2, brandSafety: 0.15, producibility: 0.15 };

// ---------------------------------------------------------------- types

interface Seeds {
  valueProp: string;
  audience: string;
  register: string;
  families: { key: string; brief: string; provenSeeds?: string[]; hardConstraint?: string }[];
  screencapLibrary: string[];
  shotKinds: Record<string, string>;
  hardRules: string[];
}

interface Idea {
  id: string;
  family: string;
  angle: string;
  decisionMoment: string;
  whyItStops: string;
}

interface Shot {
  kind: 'presenter' | 'broll' | 'screencap';
  seconds: number;
  visualPrompt: string;
}

interface Variant {
  ideaId: string;
  family: string;
  angle: string;
  variantIndex: number;
  hookText: string;
  spokenScript: string;
  shotList: Shot[];
  onScreenCaptions: string[];
  cta: string;
  hashtags: string[];
  youtubeTitle: string;
  youtubeDescription: string;
  language: string;
}

interface Scores {
  hookStrength: number;
  specificity: number;
  credibility: number;
  brandSafety: number;
  producibility: number;
  total: number;
  notes: string;
  degraded: boolean;
}

interface Judged {
  variant: Variant;
  scores: Scores;
  lintVerdict: string;
  lintReason: string;
  status: 'ready_to_render' | 'needs_review' | 'rejected';
  rejectionReason: string | null;
  rank: number | null;
  assetPath: string | null;
}

export interface CreativeOpts {
  tier?: Tier;
  count?: number;
  dry?: boolean;
}

// ---------------------------------------------------------------- utils

const todayISO = () => new Date().toISOString().slice(0, 10);
const words = (s: string) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function slugify(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled';
}

/** Letters that are not Latin — a hard gate, because video/caption models reject non-Latin script. */
function nonLatinLetters(s: string): string[] {
  return [...(s ?? '')].filter((ch) => /\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch));
}

function stripFences(s: string): string {
  return (s ?? '')
    .replace(/^﻿/, '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .trim();
}

/** Scan from the first `open` for its balanced partner, ignoring braces inside strings. */
function sliceBalanced(s: string, open: '{' | '['): string | null {
  const close = open === '{' ? '}' : ']';
  const start = s.indexOf(open);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return s.slice(start, i + 1);
  }
  return null;
}

/**
 * Defensive JSON extraction. LLMs wrap output in fences, prepend prose, and leave
 * trailing commas — try the whole string, then the first balanced object/array,
 * then the same with trailing commas repaired. Returns null instead of throwing.
 */
export function extractJson<T = any>(raw: string): T | null {
  const s = stripFences(raw);
  if (!s) return null;
  const iObj = s.indexOf('{');
  const iArr = s.indexOf('[');
  const first: ('{' | '[')[] =
    iArr >= 0 && (iObj < 0 || iArr < iObj) ? ['[', '{'] : ['{', '['];
  const candidates = [s, ...first.map((c) => sliceBalanced(s, c))].filter(Boolean) as string[];
  for (const c of candidates) {
    for (const attempt of [c, c.replace(/,\s*([}\]])/g, '$1')]) {
      try {
        return JSON.parse(attempt) as T;
      } catch {
        /* next */
      }
    }
  }
  return null;
}

function loadSeeds(): Seeds {
  return JSON.parse(readFileSync(SEEDS_FILE, 'utf8')) as Seeds;
}

/** Angles used in recent batches, so a loop running every 2 hours stops repeating itself. */
function recentAngles(limit = 40): string[] {
  try {
    return db()
      .prepare(`SELECT DISTINCT angle FROM creative_variants WHERE angle IS NOT NULL ORDER BY id DESC LIMIT ?`)
      .all(limit)
      .map((r: any) => String(r.angle))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * brain() that never throws AND never hangs — the loop degrades instead of dying.
 *
 * The hang guard is not paranoia: on Windows the CLIs are spawned with `shell: true`,
 * so the per-CLI timeout kills the shell but not the grandchild holding the stdio
 * pipes, and `'close'` can then never fire. An unattended loop must not wedge on that,
 * so every stage carries its own deadline and moves on.
 *
 * Known tradeoff: the abandoned call is not cancellable through the CLI adapter, so it
 * keeps walking its tier list in the background and still writes its own runs_log rows.
 * It costs a little daily-cap quota; it cannot block or corrupt the stage that moved on.
 */
async function brainOnce(prompt: string, tier: Tier, stage: string): Promise<string | null> {
  const t0 = Date.now();
  try {
    const res = await Promise.race([
      brain(prompt, { tier, loop: `creative:${stage}` }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`stage deadline ${STAGE_DEADLINE_MS}ms exceeded`)), STAGE_DEADLINE_MS).unref()),
    ]);
    return res.text;
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 200);
    console.warn(`[creative] ${stage} (tier ${tier}): unavailable after ${((Date.now() - t0) / 1000).toFixed(0)}s — ${msg}`);
    logRun({ loop: 'creative', tier, status: 'error', detail: `${stage}: ${msg}`, duration_ms: Date.now() - t0 });
    return null;
  }
}

/**
 * A wedged CLI rejects the whole brain() call, so brain()'s own next-CLI fallback
 * never gets a turn. One retry on a different tier gives the stage a second engine.
 */
async function tryBrain(prompt: string, tier: Tier, stage: string): Promise<string | null> {
  const first = await brainOnce(prompt, tier, stage);
  if (first !== null) return first;
  const alt: Tier = tier === 'code' ? 'bulk' : 'code';
  console.warn(`[creative] ${stage}: retrying on tier "${alt}".`);
  return brainOnce(prompt, alt, stage);
}

// ---------------------------------------------------------------- 1. ideate

function ideatePrompt(s: Seeds, count: number, recent: string[]): string {
  const families = s.families
    .map(
      (f, i) =>
        `${i + 1}. ${f.key} — ${f.brief}` +
        (f.provenSeeds?.length
          ? `\n   PROVEN examples (do NOT reuse verbatim — write NEW moments in this same family): ${f.provenSeeds.map((x) => `"${x}"`).join(', ')}`
          : '') +
        (f.hardConstraint ? `\n   HARD CONSTRAINT: ${f.hardConstraint}` : ''),
    )
    .join('\n');

  return `${BRAND_BRIEF}

You are the head of short-form video creative at VedicHour. Generate scroll-stopping ideas for Instagram Reels and YouTube Shorts.

WHAT THE PRODUCT ACTUALLY DOES (ground every idea in this — never invent a feature):
${s.valueProp}

AUDIENCE: ${s.audience}

REGISTER: ${s.register}

IDEA FAMILIES — weight most ideas toward decision_moment:
${families}

WHAT MAKES AN IDEA GOOD: a specific named moment beats an abstraction. "kal 11 baje meeting rakhun ya 4 baje?" is a good idea. "discover your cosmic timing" is a worthless idea. If the idea could be about any astrology app, throw it away.

NON-NEGOTIABLE RULES:
${s.hardRules.map((r) => `- ${r}`).join('\n')}
${recent.length ? `\nDO NOT repeat these angles, we already used them recently:\n${recent.slice(0, 25).map((a) => `- ${a}`).join('\n')}` : ''}

Return exactly ${count} ideas as STRICT JSON — an array, nothing before or after it, no markdown fences:
[{"id":"kebab-case-slug","family":"decision_moment|cost_time_anchor|respectful_contrarian","angle":"<the creative angle in one line>","decisionMoment":"<the concrete moment; Hinglish in Latin letters if it is a spoken line>","whyItStops":"<why a scrolling viewer stops inside the first second, max 20 words>"}]`;
}

function seedFallbackIdeas(s: Seeds, count: number): Idea[] {
  const out: Idea[] = [];
  for (const f of s.families) {
    for (const seed of f.provenSeeds ?? [f.brief]) {
      out.push({
        id: slugify(seed),
        family: f.key,
        angle: seed,
        decisionMoment: seed,
        whyItStops: 'a named, ordinary decision the viewer had this week',
      });
    }
  }
  return out.slice(0, count);
}

async function ideate(s: Seeds, tier: Tier, count: number): Promise<{ ideas: Idea[]; fallback: boolean }> {
  const raw = await tryBrain(ideatePrompt(s, count, recentAngles()), tier, 'ideate');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  const ideas = (Array.isArray(parsed) ? parsed : [])
    .map((x, i) => ({
      id: slugify(String(x?.id ?? x?.angle ?? `idea-${i}`)),
      family: String(x?.family ?? 'decision_moment'),
      angle: String(x?.angle ?? '').trim(),
      decisionMoment: String(x?.decisionMoment ?? '').trim(),
      whyItStops: String(x?.whyItStops ?? '').trim(),
    }))
    .filter((x) => x.angle.length > 4);

  if (!ideas.length) {
    console.warn('[creative] ideate produced nothing usable — falling back to config seeds.');
    return { ideas: seedFallbackIdeas(s, count), fallback: true };
  }
  return { ideas, fallback: false };
}

// ---------------------------------------------------------------- 2. script

function scriptPrompt(s: Seeds, idea: Idea, n: number, link: string): string {
  return `${BRAND_BRIEF}

You are writing short-form video scripts for VedicHour. Write ${n} DIFFERENT variants of ONE idea. The variants must genuinely differ — different opening move, different structure, different emotional temperature — not the same script reworded.

THE IDEA
family: ${idea.family}
angle: ${idea.angle}
decision moment: ${idea.decisionMoment}
why it stops the scroll: ${idea.whyItStops}

WHAT THE PRODUCT DOES (never invent a feature):
${s.valueProp}

AUDIENCE: ${s.audience}
REGISTER: ${s.register}

PER-FIELD SPEC — follow exactly:
- hookText: the burned-in on-screen text of the FIRST frame. It must be readable in under 1.0 second, because Meta scores early retention at the 1-second mark. Maximum ${HOOK_MAX_WORDS} words. Make it a moment or a question, not a slogan.
- spokenScript: what the voice actually says. Hinglish in Latin letters. 22-32 seconds read aloud — that is 55 to 80 words. Conversational, like a friend texting you back, not an ad.
- shotList: 3 to 5 shots. Each: kind = "presenter" | "broll" | "screencap"; seconds (number); visualPrompt.
  - presenter / broll → visualPrompt is a concrete cinematic prompt for a text-to-video model: SUBJECT, ACTION, CAMERA MOVE, LIGHTING, MOOD. It must be physically renderable — one clear subject, one clear action. No text-in-video, no logos, no crowds of faces, no readable UI.
  - screencap → this is a REAL screen recording of the live product, so visualPrompt is simply WHAT TO CAPTURE, chosen from: ${s.screencapLibrary.map((x) => `"${x}"`).join('; ')}
  - SHOT 1 MUST BE kind "presenter" — a visible human opens every reel. Platforms deprioritise fully AI-generated reels with no human layer, and the render pipeline rejects any reel that does not open on a presenter.
  - Every variant must include at least one screencap shot. Shot seconds should sum to roughly the spoken length.
- onScreenCaptions: 3-6 short burned-in caption lines that track the script. Punchy, Latin letters.
- cta: one short line. Invite, never promise.
- hashtags: 10-15, mixed romanised-Hindi and English, targeted at India. Lowercase, with the # prefix.
- youtubeTitle: under 70 characters.
- youtubeDescription: 2-3 sentences, and it MUST contain this link exactly once, verbatim: ${link}
- language: "hinglish"

NON-NEGOTIABLE RULES:
${s.hardRules.map((r) => `- ${r}`).join('\n')}
- Close the spoken script or the CTA on the brand line "${BRAND.taglineClose}" when it fits naturally.

Return STRICT JSON — an array of exactly ${n} objects, nothing before or after it, no markdown fences:
[{"hookText":"...","spokenScript":"...","shotList":[{"kind":"presenter","seconds":4,"visualPrompt":"..."}],"onScreenCaptions":["..."],"cta":"...","hashtags":["#..."],"youtubeTitle":"...","youtubeDescription":"...","language":"hinglish"}]`;
}

function normalizeVariant(raw: any, idea: Idea, index: number, link: string): Variant {
  const shots: Shot[] = (Array.isArray(raw?.shotList) ? raw.shotList : []).map((sh: any) => ({
    kind: (['presenter', 'broll', 'screencap'].includes(String(sh?.kind)) ? String(sh.kind) : 'broll') as Shot['kind'],
    seconds: Number(sh?.seconds) || 0,
    visualPrompt: String(sh?.visualPrompt ?? '').trim(),
  }));
  let desc = String(raw?.youtubeDescription ?? '').trim();
  if (desc && !desc.includes(link)) desc = `${desc}\n\n${link}`;
  return {
    ideaId: idea.id,
    family: idea.family,
    angle: idea.angle,
    variantIndex: index,
    hookText: String(raw?.hookText ?? '').trim(),
    spokenScript: String(raw?.spokenScript ?? '').trim(),
    shotList: shots,
    onScreenCaptions: (Array.isArray(raw?.onScreenCaptions) ? raw.onScreenCaptions : []).map((c: any) => String(c).trim()).filter(Boolean),
    cta: String(raw?.cta ?? '').trim(),
    // Models occasionally emit "#kab bheju" — a space silently ends the tag on every platform.
    hashtags: (Array.isArray(raw?.hashtags) ? raw.hashtags : [])
      .map((h: any) => String(h).trim().replace(/\s+/g, ''))
      .filter((h: string) => h.length > 1),
    youtubeTitle: String(raw?.youtubeTitle ?? '').trim().slice(0, 70),
    youtubeDescription: desc,
    language: String(raw?.language ?? 'hinglish'),
  };
}

async function scriptIdea(s: Seeds, idea: Idea, tier: Tier, n: number): Promise<Variant[]> {
  const link = utm(BRAND.links.pricing, 'youtube', 'short', 'creative_engine', idea.id);
  const raw = await tryBrain(scriptPrompt(s, idea, n, link), tier, 'script');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  if (!Array.isArray(parsed)) {
    console.warn(`[creative] script: no parsable variants for "${idea.id}" — skipping the idea.`);
    return [];
  }
  return parsed.map((v, i) => normalizeVariant(v, idea, i + 1, link)).filter((v) => v.hookText && v.spokenScript);
}

// ---------------------------------------------------------------- 3. audit

/** Deterministic gates that need no model: script, length, shape. Cheap and unarguable. */
function preflight(v: Variant): string | null {
  const bad = [
    ...nonLatinLetters(v.hookText),
    ...nonLatinLetters(v.spokenScript),
    ...nonLatinLetters(v.cta),
    ...v.onScreenCaptions.flatMap(nonLatinLetters),
  ];
  if (bad.length) return `non-Latin script (${[...new Set(bad)].slice(0, 6).join('')}) — video models reject it`;
  if (words(v.hookText) > HOOK_REJECT_WORDS) return `hook is ${words(v.hookText)} words — cannot land in under 1.0s`;
  const w = words(v.spokenScript);
  if (w < 40 || w > 110) return `spoken script is ${w} words — outside the 22-32s read`;
  if (v.shotList.length < 3 || v.shotList.length > 5) return `${v.shotList.length} shots — spec is 3-5`;
  if (v.shotList.some((sh) => !sh.visualPrompt)) return 'a shot has no visualPrompt';
  if (!v.shotList.some((sh) => sh.kind === 'screencap')) return 'no screencap shot — nothing shows the real product';
  // House rule from src/render/types.ts: a visible human must open the reel, or the
  // render pipeline rejects it (platforms deprioritise fully AI reels with no human layer).
  if (v.shotList[0]?.kind !== 'presenter') return `opens on a ${v.shotList[0]?.kind} shot — a reel must open on a presenter`;
  return null;
}

function auditPrompt(idea: Idea, variants: Variant[]): string {
  const blocks = variants
    .map(
      (v) => `--- VARIANT ${v.variantIndex} ---
hook: ${v.hookText}
spoken: ${v.spokenScript}
captions: ${v.onScreenCaptions.join(' | ')}
cta: ${v.cta}
shots: ${v.shotList.map((s) => `[${s.kind} ${s.seconds}s] ${s.visualPrompt}`).join(' || ')}`,
    )
    .join('\n\n');

  return `You are a HOSTILE creative reviewer. You are not here to be encouraging. Your job is to REJECT weak short-form video scripts before they cost money to render, and you are judged on how much slop you catch. Assume each script is mediocre until it proves otherwise. Scores above 85 must be earned, not given.

The product: VedicHour scores all 18 planetary hours of a day against a person's birth chart and says which windows run clearer or heavier for a given task. Audience: urban Indian and diaspora viewers, aged 24-40, who grew up around Jyotish and will cringe hard at anything that sounds like a WhatsApp-forward astrologer.

IDEA UNDER REVIEW: ${idea.angle}

${blocks}

Score EVERY variant 0-100 on each axis:
- hookStrength: does the FIRST on-screen line stop a thumb inside one second? Generic slogans, "unlock/discover your...", or anything a viewer has read a thousand times scores under 40.
- specificity: a named, concrete decision moment scores high. An abstraction about "cosmic energy" or "your timing" scores under 30.
- credibility: would an Indian viewer who actually knows some astrology find this embarrassing to be seen watching? Cringe, guru-voice, over-claiming, or fake-deep = low.
- brandSafety: score 0-100, and be ruthless. Score BELOW 60 if there is ANY of: a guarantee or certainty claim; "100%" or miracle framing; a health, money, legal, or relationship OUTCOME promise; fear-mongering; a deterministic "THE best hour / worst hour" stated as fact; invented social proof (fake testimonials, made-up user numbers, star ratings); competitor bashing or mockery of astrology or astrologers; any rupee or dollar figure. Calibrate carefully: a script with NO violation at all should score 90-100, and anything you score under ${BRAND_SAFETY_FLOOR} is automatically rejected and never rendered.
- producibility: can a text-to-video model actually render the presenter/broll shots? Readable on-screen text, logos, specific real places, crowds of faces, complex hand interactions, or multi-subject choreography = low. Screencap shots are free (they are real recordings) — judge only what a model must generate.

Return STRICT JSON — an array, one object per variant, nothing before or after it, no fences:
[{"variantIndex":1,"hookStrength":0,"specificity":0,"credibility":0,"brandSafety":0,"producibility":0,"verdict":"reject|keep","notes":"<your single harshest objection, max 20 words>"}]`;
}

function degradedScores(v: Variant, lintVerdict: string): Scores {
  // Heuristic backstop when the hostile reviewer is unreachable. Deliberately
  // conservative — nothing reaches a winner slot on heuristics alone by luck.
  const hookWords = words(v.hookText);
  const hookStrength = clamp(70 - Math.max(0, hookWords - HOOK_MAX_WORDS) * 12 - (/^(discover|unlock|find out)/i.test(v.hookText) ? 25 : 0));
  const specificity = clamp(/\d|kal|aaj|meeting|baje|interview|promotion|parents|padhai|launch/i.test(`${v.hookText} ${v.spokenScript}`) ? 70 : 40);
  const credibility = 60;
  const brandSafety = lintVerdict === 'pass' ? 85 : lintVerdict === 'flag' ? 55 : 0;
  const producibility = clamp(70 - v.shotList.filter((s) => s.kind !== 'screencap' && /text|logo|sign|crowd/i.test(s.visualPrompt)).length * 20);
  const total =
    hookStrength * WEIGHTS.hookStrength +
    specificity * WEIGHTS.specificity +
    credibility * WEIGHTS.credibility +
    brandSafety * WEIGHTS.brandSafety +
    producibility * WEIGHTS.producibility;
  return { hookStrength, specificity, credibility, brandSafety, producibility, total: Math.round(total), notes: 'heuristic fallback — hostile reviewer unavailable', degraded: true };
}

async function auditIdea(idea: Idea, variants: Variant[], tier: Tier): Promise<Map<number, any>> {
  const raw = await tryBrain(auditPrompt(idea, variants), tier, 'audit');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  const map = new Map<number, any>();
  if (Array.isArray(parsed)) for (const r of parsed) map.set(Number(r?.variantIndex), r);
  return map;
}

/** lint() + hostile audit + deterministic gates → a judged variant. Never throws. */
async function judge(idea: Idea, variants: Variant[], tier: Tier): Promise<Judged[]> {
  const audit = await auditIdea(idea, variants, tier);
  const out: Judged[] = [];

  for (const v of variants) {
    const pre = preflight(v);

    let lintVerdict = 'pass';
    let lintReason = 'skipped (failed deterministic preflight)';
    if (!pre) {
      const text = [v.hookText, v.spokenScript, v.onScreenCaptions.join(' '), v.cta, v.youtubeTitle, v.youtubeDescription].join('\n');
      try {
        const r = await lint(text);
        lintVerdict = r.verdict;
        lintReason = r.reason;
      } catch (e: any) {
        lintVerdict = 'flag';
        lintReason = `linter unavailable: ${String(e?.message ?? e).slice(0, 80)}`;
      }
    }

    const a = audit.get(v.variantIndex);
    const scores: Scores = a
      ? (() => {
          const s = {
            hookStrength: clamp(Number(a.hookStrength) || 0),
            specificity: clamp(Number(a.specificity) || 0),
            credibility: clamp(Number(a.credibility) || 0),
            brandSafety: clamp(Number(a.brandSafety) || 0),
            producibility: clamp(Number(a.producibility) || 0),
          };
          const total = Math.round(
            s.hookStrength * WEIGHTS.hookStrength +
              s.specificity * WEIGHTS.specificity +
              s.credibility * WEIGHTS.credibility +
              s.brandSafety * WEIGHTS.brandSafety +
              s.producibility * WEIGHTS.producibility,
          );
          return { ...s, total, notes: String(a.notes ?? '').slice(0, 160), degraded: false };
        })()
      : degradedScores(v, lintVerdict);

    // Hard rejects, in order of authority.
    let rejection: string | null = null;
    if (pre) rejection = pre;
    else if (lintVerdict === 'block') rejection = `policy-linter BLOCK: ${lintReason}`;
    else if (scores.brandSafety < BRAND_SAFETY_FLOOR) rejection = `brand-safety ${scores.brandSafety}/100 (floor ${BRAND_SAFETY_FLOOR}): ${scores.notes}`;
    else if (String(a?.verdict ?? '').toLowerCase() === 'reject') rejection = `hostile reviewer rejected: ${scores.notes}`;

    out.push({
      variant: v,
      scores,
      lintVerdict,
      lintReason,
      status: rejection ? 'rejected' : lintVerdict === 'flag' ? 'needs_review' : 'ready_to_render',
      rejectionReason: rejection,
      rank: null,
      assetPath: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------- 4. tournament

function tournamentPrompt(entries: { key: string; v: Variant }[]): string {
  const blocks = entries
    .map((e) => `[${e.key}]\nhook: ${e.v.hookText}\nspoken: ${e.v.spokenScript}\ncta: ${e.v.cta}`)
    .join('\n\n');
  return `Judge these short-form video scripts head to head on ONE question only: which would an Indian viewer, scrolling fast on their phone, actually watch to the END?

Not which is the most tasteful. Not which is the most informative. Which one holds a thumb for 25 seconds. Reward a concrete opening moment, a reason to keep watching past second three, and a payoff that arrives. Punish anything that front-loads explanation, sounds like an ad read, or takes more than one second to understand.

${blocks}

Return STRICT JSON — the keys ranked best first, nothing before or after it, no fences:
{"ranked":["<key>","<key>"],"why":"<why the winner wins, max 25 words>"}`;
}

/** Small brackets, then a final among the bracket winners. Ties break on audit total. */
async function tournament(survivors: Judged[], tier: Tier): Promise<Judged[]> {
  const byScore = [...survivors].sort((a, b) => b.scores.total - a.scores.total);
  if (byScore.length <= 1) return byScore;

  const keyOf = (j: Judged) => `${j.variant.ideaId}#${j.variant.variantIndex}`;
  const lookup = new Map(byScore.map((j) => [keyOf(j), j]));

  const rankGroup = async (group: Judged[]): Promise<Judged[]> => {
    if (group.length <= 1) return group;
    const raw = await tryBrain(tournamentPrompt(group.map((v) => ({ key: keyOf(v), v: v.variant }))), tier, 'tournament');
    const parsed = raw ? extractJson<{ ranked?: string[] }>(raw) : null;
    const ranked = (parsed?.ranked ?? []).map((k) => lookup.get(String(k))).filter(Boolean) as Judged[];
    // Anything the judge dropped falls in behind, ordered by audit score.
    const seen = new Set(ranked.map(keyOf));
    return [...ranked, ...group.filter((g) => !seen.has(keyOf(g)))];
  };

  const brackets: Judged[][] = [];
  for (let i = 0; i < byScore.length; i += BRACKET_SIZE) brackets.push(byScore.slice(i, i + BRACKET_SIZE));

  const finalists: Judged[] = [];
  const alsoRans: Judged[] = [];
  for (const b of brackets) {
    const ranked = await rankGroup(b);
    finalists.push(...ranked.slice(0, 2));
    alsoRans.push(...ranked.slice(2));
  }

  const podium = finalists.length > 1 ? await rankGroup(finalists) : finalists;
  const ordered = [...podium, ...alsoRans];
  ordered.forEach((j, i) => (j.rank = i + 1));
  return ordered;
}

// ------------------------------------------------- render-pipeline contract

/**
 * src/render/types.ts declares the contract this loop's output must satisfy:
 * `output/creative/<slug>.json` is read by the render pipeline and passed to
 * validateCreative(). So each winner file carries BOTH shapes at its root — the
 * creative fields (hookText/spokenScript/shotList/…) and the render fields
 * (slug/title/hook/cta/shots/…). One file, two readers, no adapter in between.
 */
interface RenderShot {
  id: string;
  role: 'presenter' | 'broll_hero' | 'broll' | 'product' | 'presenter_close';
  seconds: number;
  prompt?: string;
  dialogue?: string;
  vo?: string;
  capture?: { url: string };
}

/** Which live page a screencap shot should record, inferred from what it asks to capture. */
function captureUrl(visualPrompt: string): string {
  const p = visualPrompt.toLowerCase();
  if (/kundli|chart wheel|birth chart/.test(p)) return BRAND.domain + BRAND.links.freeKundli;
  if (/onboard|birth date|birth time|birth city|entering/.test(p)) return BRAND.domain + BRAND.links.onboard;
  return BRAND.domain + BRAND.links.pricing;
}

/**
 * Split the spoken script across shots, weighted by shot seconds, on sentence
 * boundaries. Falls back to word chunks when there are fewer sentences than shots —
 * a presenter shot with empty dialogue is rejected by the render pipeline.
 */
function allocateSpeech(script: string, shots: Shot[]): string[] {
  let sentences = script.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length < shots.length) {
    const w = script.split(/\s+/).filter(Boolean);
    const per = Math.ceil(w.length / shots.length) || 1;
    sentences = [];
    for (let i = 0; i < w.length; i += per) sentences.push(w.slice(i, i + per).join(' '));
  }
  const totalSecs = shots.reduce((a, s) => a + (s.seconds || 0), 0) || shots.length;
  const out: string[] = [];
  let cursor = 0;
  shots.forEach((sh, i) => {
    const share = (sh.seconds || 1) / totalSecs;
    const take = i === shots.length - 1 ? sentences.length - cursor : Math.max(1, Math.round(sentences.length * share));
    out.push(sentences.slice(cursor, cursor + take).join(' '));
    cursor += take;
  });
  if (cursor < sentences.length && out.length) out[out.length - 1] = `${out[out.length - 1]} ${sentences.slice(cursor).join(' ')}`.trim();
  return out;
}

function toRenderShots(v: Variant): RenderShot[] {
  const speech = allocateSpeech(v.spokenScript, v.shotList);
  let heroUsed = false;
  return v.shotList.map((sh, i) => {
    const line = speech[i] ?? '';
    if (sh.kind === 'screencap') {
      return { id: `s${i + 1}`, role: 'product' as const, seconds: sh.seconds, vo: line, capture: { url: captureUrl(sh.visualPrompt) } };
    }
    if (sh.kind === 'presenter') {
      const role = i === 0 ? ('presenter' as const) : ('presenter_close' as const);
      return { id: `s${i + 1}`, role, seconds: sh.seconds, prompt: sh.visualPrompt, dialogue: line };
    }
    const role = heroUsed ? ('broll' as const) : ((heroUsed = true), 'broll_hero' as const);
    return { id: `s${i + 1}`, role, seconds: sh.seconds, prompt: sh.visualPrompt, vo: line };
  });
}

function renderContract(j: Judged, slug: string) {
  const v = j.variant;
  return {
    slug,
    title: v.youtubeTitle || v.hookText,
    product: 'forecast',
    status: j.status === 'ready_to_render' ? 'ready_to_render' : 'draft',
    // The render pipeline renders the HIGHEST rank first, so this is a 0-1 quality
    // score, not the integer placement (which lives in creative_variants.tournament_rank).
    rank: Number((j.scores.total / 100).toFixed(2)),
    hook: v.hookText,
    cta: v.cta,
    voice: TTS_VOICE,
    shots: toRenderShots(v),
    publish: {
      youtubeTitle: v.youtubeTitle,
      description: v.youtubeDescription,
      hashtags: v.hashtags,
      caption: v.onScreenCaptions.join(' '),
    },
  };
}

/** Validate against the render pipeline's own validator, if that module is loadable. */
async function renderIssues(contract: any): Promise<{ ok: boolean; issues: any[] } | null> {
  try {
    const mod: any = await import('../render/types');
    if (typeof mod.validateCreative !== 'function') return null;
    const r = mod.validateCreative(contract);
    return { ok: r.ok, issues: r.issues };
  } catch {
    return null; // render pipeline not present (or mid-edit) — creative still ships
  }
}

// ---------------------------------------------------------------- 5. persist

function variantMarkdown(j: Judged, batchId: string): string {
  const v = j.variant;
  const s = j.scores;
  return `# ${v.hookText}

**Rank ${j.rank} of batch \`${batchId}\`** · idea \`${v.ideaId}\` · variant ${v.variantIndex} · family \`${v.family}\` · language \`${v.language}\`

> Angle: ${v.angle}

## Scores
| axis | score |
| --- | --- |
| hook strength | ${s.hookStrength} |
| specificity | ${s.specificity} |
| credibility | ${s.credibility} |
| brand safety | ${s.brandSafety} |
| producibility | ${s.producibility} |
| **weighted total** | **${s.total}** |

Policy-linter: **${j.lintVerdict}** — ${j.lintReason}
Hostile reviewer: ${s.notes || 'no objection recorded'}${s.degraded ? '\n\n> Scored by the heuristic fallback — the hostile reviewer was unreachable.' : ''}

## Hook (first frame, under 1.0s)
**${v.hookText}**  _(${words(v.hookText)} words)_

## Spoken script _(${words(v.spokenScript)} words, ~${Math.round(words(v.spokenScript) / 2.6)}s)_
${v.spokenScript}

## Shot list
${v.shotList.map((sh, i) => `${i + 1}. **${sh.kind}** · ${sh.seconds}s\n   ${sh.visualPrompt}`).join('\n')}

## On-screen captions
${v.onScreenCaptions.map((c) => `- ${c}`).join('\n')}

## CTA
${v.cta}

## YouTube
**${v.youtubeTitle}**

${v.youtubeDescription}

## Hashtags
${v.hashtags.join(' ')}
`;
}

async function persist(judged: Judged[], winners: Judged[], batchId: string): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const date = todayISO();

  // Files for the winners only — the losers live in SQLite so we can learn from them.
  const used = new Set<string>();
  for (const w of winners) {
    let slug = `${date}-${slugify(w.variant.hookText)}`;
    let n = 2;
    while (used.has(slug)) slug = `${date}-${slugify(w.variant.hookText)}-${n++}`;
    used.add(slug);
    const jsonPath = resolve(OUT_DIR, `${slug}.json`);
    const contract = renderContract(w, slug);
    const validation = await renderIssues(contract);
    if (validation && !validation.ok) {
      console.warn(`[creative] ${slug}: render-contract errors — ${validation.issues.filter((i: any) => i.level === 'error').map((i: any) => `${i.where}: ${i.message}`).join('; ')}`);
    }
    writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          ...contract, // render pipeline reads these (src/render/types.ts CreativeScript)
          batchId,
          scores: w.scores,
          linter: { verdict: w.lintVerdict, reason: w.lintReason },
          renderValidation: validation,
          ...w.variant, // creative engine's own fields
        },
        null,
        2,
      ),
    );
    writeFileSync(resolve(OUT_DIR, `${slug}.md`), variantMarkdown(w, batchId));
    w.assetPath = jsonPath;
  }

  const insertVariant = db().prepare(
    `INSERT INTO creative_variants
       (batch_id, idea_id, family, angle, variant_index, hook_text, spoken_script, language, status,
        lint_verdict, lint_reason, hook_strength, specificity, credibility, brand_safety, producibility,
        total_score, tournament_rank, rejection_reason, payload, asset_path)
     VALUES (@batch_id, @idea_id, @family, @angle, @variant_index, @hook_text, @spoken_script, @language, @status,
        @lint_verdict, @lint_reason, @hook_strength, @specificity, @credibility, @brand_safety, @producibility,
        @total_score, @tournament_rank, @rejection_reason, @payload, @asset_path)`,
  );
  const insertContent = db().prepare(
    `INSERT INTO content_library (asset, type, product, script_source, status, perf_score, meta)
     VALUES (@asset, 'script', 'forecast', @src, @status, @perf, @meta)`,
  );

  db().transaction(() => {
    for (const j of judged) {
      insertVariant.run({
        batch_id: batchId,
        idea_id: j.variant.ideaId,
        family: j.variant.family,
        angle: j.variant.angle,
        variant_index: j.variant.variantIndex,
        hook_text: j.variant.hookText,
        spoken_script: j.variant.spokenScript,
        language: j.variant.language,
        status: j.status,
        lint_verdict: j.lintVerdict,
        lint_reason: j.lintReason,
        hook_strength: j.scores.hookStrength,
        specificity: j.scores.specificity,
        credibility: j.scores.credibility,
        brand_safety: j.scores.brandSafety,
        producibility: j.scores.producibility,
        total_score: j.scores.total,
        tournament_rank: j.rank,
        rejection_reason: j.rejectionReason,
        payload: JSON.stringify(j.variant),
        asset_path: j.assetPath,
      });
    }
    for (const w of winners) {
      insertContent.run({
        asset: w.assetPath ?? `${w.variant.ideaId}#${w.variant.variantIndex}`,
        src: `creative-engine:${batchId}:${w.variant.ideaId}`,
        status: w.status, // ready_to_render | needs_review
        perf: w.scores.total,
        meta: JSON.stringify({ batchId, rank: w.rank, hookText: w.variant.hookText, scores: w.scores, linter: { verdict: w.lintVerdict, reason: w.lintReason } }),
      });
    }
  })();

  writeFileSync(
    resolve(OUT_DIR, `_batch-${batchId}.json`),
    JSON.stringify(
      {
        batchId,
        date,
        winners: winners.map((w) => ({ rank: w.rank, hookText: w.variant.hookText, total: w.scores.total, status: w.status, file: w.assetPath })),
        rejected: judged
          .filter((j) => j.status === 'rejected')
          .map((j) => ({ ideaId: j.variant.ideaId, variantIndex: j.variant.variantIndex, hookText: j.variant.hookText, reason: j.rejectionReason })),
      },
      null,
      2,
    ),
  );
}

// ---------------------------------------------------------------- the loop

/**
 * L4 — the creative engine. Ideate → 5-6 scripted variants per idea → adversarial
 * audit (policy-linter + a hostile reviewer paid to reject) → head-to-head
 * tournament → the top 3 land as 'ready_to_render' for the expensive video stage.
 * Every brain() call is $0 (CLI subscriptions, not APIs) and every stage degrades
 * rather than throwing, so one bad model response never kills the run.
 */
export async function runCreativeLoop(opts: CreativeOpts = {}): Promise<void> {
  const loop = 'creative';
  if (isKilled()) {
    console.log(`[creative] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });

  const tier: Tier = opts.tier ?? 'smart';
  const count = Math.max(1, Math.min(8, opts.count ?? IDEAS_SCRIPTED));
  const dry = opts.dry === true;
  const batchId = `${todayISO()}-${Date.now().toString(36)}`;
  const t0 = Date.now();

  try {
    const seeds = loadSeeds();

    // 1. IDEATE
    const { ideas, fallback } = await ideate(seeds, tier, IDEAS_REQUESTED);
    console.log(`[creative] ideate → ${ideas.length} candidate hooks${fallback ? ' (SEED FALLBACK — brain was unreachable)' : ''}`);
    for (const i of ideas.slice(0, count)) console.log(`             · [${i.family}] ${i.angle}`);

    // 2. SCRIPT
    const scripted: { idea: Idea; variants: Variant[] }[] = [];
    for (const idea of ideas.slice(0, count)) {
      if (isKilled()) {
        console.log('[creative] kill-switch tripped mid-run — stopping.');
        break;
      }
      const variants = await scriptIdea(seeds, idea, tier, VARIANTS_PER_IDEA);
      if (variants.length) scripted.push({ idea, variants });
      console.log(`[creative] script → "${idea.id}": ${variants.length} variants`);
    }
    const totalVariants = scripted.reduce((n, s) => n + s.variants.length, 0);
    if (!totalVariants) {
      console.log('[creative] no variants survived scripting — nothing to audit.');
      logRun({ loop, status: 'skipped', detail: 'no variants scripted' });
      writeHeartbeat(loop, 'no variants scripted');
      return;
    }

    // 3. AUDIT
    const judged: Judged[] = [];
    for (const s of scripted) judged.push(...(await judge(s.idea, s.variants, tier)));
    const survivors = judged.filter((j) => j.status !== 'rejected');
    console.log(`[creative] audit → ${survivors.length}/${judged.length} survived (${judged.length - survivors.length} rejected)`);
    for (const j of judged.filter((x) => x.status === 'rejected')) {
      console.log(`             ✗ "${j.variant.hookText}" — ${j.rejectionReason}`);
    }

    // 4. TOURNAMENT
    const ordered = survivors.length ? await tournament(survivors, tier) : [];
    const winners = ordered.slice(0, WINNERS_KEPT);
    for (const j of ordered.slice(WINNERS_KEPT)) {
      j.status = 'rejected';
      j.rejectionReason = `lost the tournament (rank ${j.rank})`;
    }

    // 5. PERSIST
    if (dry) {
      console.log('[creative] --dry: skipping SQLite + output/creative writes.');
    } else {
      await persist(judged, winners, batchId);
      for (const w of winners.filter((x) => x.status === 'needs_review')) {
        enqueueApproval({ item: `Creative: ${w.variant.hookText}`, lane: 'B', linter_verdict: w.lintVerdict, linter_reason: w.lintReason, channel: 'creative' });
      }
    }

    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`\n[creative] === batch ${batchId} — top ${winners.length} ===`);
    for (const w of winners) {
      console.log(`  #${w.rank} [${w.scores.total}] "${w.variant.hookText}"  → ${w.status}`);
      console.log(`      ${w.variant.spokenScript.slice(0, 110)}${w.variant.spokenScript.length > 110 ? '…' : ''}`);
      if (w.assetPath) console.log(`      ${w.assetPath}`);
    }
    console.log(`[creative] done in ${secs}s · ${judged.length} variants judged · reasoning cost $0 (CLI subscriptions)`);
    logRun({ loop, tier, status: 'ok', detail: `${winners.length} winners / ${judged.length} variants`, duration_ms: Date.now() - t0 });
    writeHeartbeat(loop, `${winners.length} winners of ${judged.length} variants`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`[creative] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
