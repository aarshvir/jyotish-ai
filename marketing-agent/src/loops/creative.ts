import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain, type Tier } from '../brain/index';
import { lint, jargonHits } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { lessonBlock } from '../lessons';
import { BRAND, BRAND_BRIEF, utm } from '../brand';
import { resolveCapture } from '../render/capture-policy';
import { AD_VO_VOICE, NATIVE_VOICE } from '../render/sarvam';
import { NARRATION_MAX_WORDS, WORDS_PER_SECOND, SPOKEN_SITE } from '../render/types';
import { comboKey, normalizeTags, taxonomyPromptSpec, taxonomyPromptSpecCompact, type CreativeTags } from '../taxonomy';
import { aggregatePerformance, exploreTargets, renderBrief, type ComboCoverage, type PerformanceSnapshot } from '../performance';
import { senseDigest } from './sense';
import { playbookBlock } from '../playbook';
import { craftBlock } from '../craft';
import {
  LITERALISM_BAN_BLOCK,
  HUMAN_EYE_FLOOR,
  degradedHumanEye,
  humanEyePrompt,
  literalismHits,
  parseHumanEye,
  propBanHits,
  type HumanEyeReel,
  type HumanEyeVerdict,
} from '../audit/human-eye';

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

/**
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * THE FORMAT SPEC — "cold open, proof early, intercut". Owner ruling 2026-08-16.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The reel that was rejected ("this reel is shit... this should look like a real advert that a
 * $1B saas platform will launch") was measured afterwards: 5 shots, 29s, and THIRTEEN SECONDS of
 * talking head before the product appeared. A reel loses its viewer by second three. The most
 * interesting thing this company owns — a real 18-slot day grid with scores and plain-English
 * guidance — arrived at second 13, to an audience that had already gone.
 *
 * So the shape is inverted. The presenter no longer INTRODUCES the product; he answers a question
 * that the product is already on screen answering. Concretely:
 *
 *   s1  presenter  <=3s   COLD OPEN, mid-sentence. Hook burned in from frame 0.
 *   s2  product    ~3s    the real report — proof is on screen before second 3.
 *   s3  presenter  <=6s   the one long beat: the turn.
 *   s4  product    ~3s    a single hour card and its plain-English line.
 *   s5  presenter  ~4s    (optional middle beat)
 *   s6  product    ~3s    proof again
 *   s7  presenter  ~4s    close, names vedichour.com out loud.
 *
 * Why these numbers and not others:
 *  - PRODUCT SHOTS ARE FREE (real screen recordings) and GENERATED SHOTS ARE NOT. So the format
 *    that retains best is also the cheapest: ~$2.40 of Veo for four presenter beats, versus $3.02
 *    for the rejected reel, and every extra product beat costs nothing.
 *  - B-ROLL IS THE SLOP VECTOR. Generic atmosphere footage is where "expensive" dies and where
 *    the metaphor-as-prop defect lives (see audit/human-eye.ts). One b-roll shot maximum, and it
 *    must show the real human subject of the sentence, never an illustration of it.
 *
 * ONE CONCESSION TO THE RENDER CONTRACT: src/render/types.ts hard-requires shots[0].role ===
 * 'presenter' (platform policy — faceless AI reels are deprioritised), so the product cannot
 * literally be frame 1. The cold open is the compliant equivalent: a face, mid-sentence, for at
 * most FIRST_SHOT_MAX_SEC, with the product on screen the instant he stops. No greeting, no
 * setup, no "kya aapko pata hai" — he is already answering.
 */
const SHOTS_MIN = 5;
const SHOTS_MAX = 8;
const REEL_SEC_MIN = 20;
const REEL_SEC_MAX = 28;
/** The cold open. Long enough for one sentence, short enough that proof lands inside 3 seconds. */
const FIRST_SHOT_MAX_SEC = 3;
/** Every other shot, except the single long presenter beat below. */
const SHOT_MAX_SEC = 4;
/** Exactly one presenter beat may run to this — the reel's only pause for breath. */
const LONG_BEAT_MAX_SEC = 6;
/** The product must be on screen by here. Shot 2 being a product shot enforces it structurally. */
const PROOF_BY_SEC = 3;
const MIN_PRODUCT_SHOTS = 2;
const MIN_PRODUCT_SEC = 5;
const MIN_PRESENTER_SHOTS = 3;
const MAX_BROLL_SHOTS = 1;
/** Spoken words for a 20-28s reel at 2.3 words/s, with room for silence under the captions. */
const SCRIPT_WORDS_MIN = 30;
const SCRIPT_WORDS_MAX = 64;
/**
 * NO SHOT MAY PLAY SILENT. src/render/assemble.ts fails a finished reel on a single silence longer
 * than 1.2s (MAX_SILENCE_GAP_SEC) or more than 25% silence overall — the gate the owner's "half the
 * video has no audio" produced. The first run of this format answered that by writing FOUR silent
 * product shots, 13 of 26 seconds: a reel that would have burned ~$2.70 of Veo and then failed
 * verification. Caught here instead, for $0, which is CLAUDE.md §1.
 *
 * The connective line is capped well below the renderer's 12-word ceiling because every one of
 * those words is synthesized rather than spoken on camera: short enough that the timbre change
 * reads as a beat, never as a second narrator taking over.
 */
const CONNECTIVE_MAX_WORDS = 6;
/**
 * A shot this short reads as a CUT, not as dead air — it stays under the renderer's 1.2s ceiling
 * with rounding to spare. This is the escape valve that keeps the reel in one voice: a product
 * beat that would otherwise need narration can instead be a fast silent cutaway.
 */
const SILENT_SHOT_MAX_SEC = 1;
/**
 * THE VOICE-SWITCH BUDGET — the correction to my own first fix.
 *
 * Forbidding silent shots (dead air fails the render) made the writer narrate every product beat,
 * and the second attempt came back with three narrated shots alternating with four presenter
 * shots: SIX audible timbre changes in 23 seconds, between the video model's in-shot voice and the
 * synthesized one. That is the defect the owner has already rejected twice ("the second voice,
 * when it comes, looks very AI-generated"), reintroduced by the cure for a different defect.
 *
 * So both are bounded: at most two shots may be narrated, everything else is either spoken on
 * camera or a sub-second silent cutaway, and at least this share of the words must be on camera.
 */
const MAX_NARRATED_SHOTS = 2;
const NATIVE_RATIO_FLOOR = 0.72;
/**
 * EXPLORE/EXPLOIT. Roughly this share of the ideas that advance to scripting is RESERVED for
 * under-tested tag combinations, whatever the performance evidence currently favours.
 *
 * Without a floor, the first hook family to get lucky on a handful of posts becomes the only
 * family the engine ever writes again — the evidence that would have overturned it never gets
 * generated. The reservation is enforced deterministically in selectForScripting(), on OUR count
 * of what has actually been written and posted, never on the model's self-declared label.
 */
const EXPLORE_SHARE = 0.3;
/**
 * Per-stage wall-clock deadline. MUST stay comfortably longer than TWO CLI timeouts from
 * routing.json, or a slow first CLI eats the whole budget and brain()'s fallback to the next
 * tier never gets a turn — the stage just dies. That is exactly what happened on 2026-07-26:
 * the CLI timeouts were raised 180s -> 300s for 10-frame vision review, which silently made
 * them equal to this deadline, and the script stage then failed every run for a day (08:21,
 * 10:19, 12:20, 14:21) producing zero variants. 660s = codex 300 + claude 300 + overhead.
 * Still bounded, so an unattended 2-hourly loop can never wedge forever.
 */
const STAGE_DEADLINE_MS = 660_000;

/**
 * Weighted total. The hook still carries the most single weight — the first second is the whole
 * game — but HUMAN EYE is now the second heaviest and, unlike the other five, it can reject on
 * its own. The five original axes are all COMPLIANCE axes; the rejected reel scored well on every
 * one of them and the owner still hated it, so a scoreboard made only of them cannot see quality.
 * brandSafety's weight is small because it is not really a score: anything under BRAND_SAFETY_FLOOR
 * is a hard reject regardless of the total.
 */
const WEIGHTS = { hookStrength: 0.24, specificity: 0.12, credibility: 0.12, brandSafety: 0.08, producibility: 0.12, humanEye: 0.32 };

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
  /** Hook taxonomy (src/taxonomy.ts) — the join key between a creative's shape and its results. */
  tags: CreativeTags;
  /** True when this idea occupied a reserved EXPLORE slot (an under-tested tag combination). */
  explore: boolean;
}

interface Shot {
  kind: 'presenter' | 'broll' | 'screencap';
  seconds: number;
  visualPrompt: string;
  /**
   * PRESENTER shots: the line said ON CAMERA. The video model performs it natively (lip-synced,
   * free, and the quality bar the owner praised), so this is where the substance belongs.
   */
  dialogue?: string;
  /** NON-presenter shots: a short connective line, <= NARRATION_MAX_WORDS words, or nothing. */
  narration?: string;
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
  /** Tagged at CREATION — carried to creative_variants, the render contract and marketing_assets. */
  tags: CreativeTags;
  explore: boolean;
}

interface Scores {
  hookStrength: number;
  specificity: number;
  credibility: number;
  brandSafety: number;
  producibility: number;
  /** The taste axis — src/audit/human-eye.ts. Not a compliance score, and it can reject alone. */
  humanEye: number;
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

/**
 * Everything the engine has LEARNED, gathered once per run and threaded into the prompts.
 * All three are $0 and all three degrade to an empty string rather than failing the run.
 */
interface LearnedContext {
  /** What posted reels actually did, aggregated by tag — src/performance.ts. */
  performance: string;
  /** Which tag combinations are under-tested, and therefore reserved for exploration. */
  explore: ComboCoverage[];
  /** Live public questions and search trends — src/loops/sense.ts. */
  sense: string;
  /** Craft principles, as editable data with sources — config/playbook.json. */
  playbook: string;
  /** Visual/audio/storyboard law — config/reel-craft.json (wins over playbook on look/sound). */
  craft: string;
  snapshot: PerformanceSnapshot | null;
}

async function gatherLearned(count: number): Promise<LearnedContext> {
  let snapshot: PerformanceSnapshot | null = null;
  let performance = '';
  try {
    snapshot = await aggregatePerformance();
    performance = renderBrief(snapshot);
  } catch (e: any) {
    console.warn(`[creative] performance evidence unavailable — ${String(e?.message ?? e).slice(0, 100)}`);
  }
  // Ask for a couple more explore targets than slots, so the model has room to pick the ones it
  // can actually write a good idea for rather than being forced into one awkward combination.
  const explore = exploreTargets(snapshot, Math.max(2, Math.ceil(count * EXPLORE_SHARE) + 2));
  return {
    performance,
    explore,
    sense: senseDigest(),
    playbook: playbookBlock(),
    craft: craftBlock(),
    snapshot,
  };
}

function exploreBlock(targets: ComboCoverage[], reserved: number): string {
  if (!targets.length || reserved <= 0) return '';
  return `EXPLORATION QUOTA — at least ${reserved} of your ideas MUST come from the UNDER-TESTED combinations below, and you must mark each of those with "explore": true.
This is not a stylistic request. Whatever the evidence above currently favours was measured on a
small sample; if the engine only ever writes the currently-winning shape, the evidence that would
overturn it is never generated and one lucky early result becomes permanent. These are the
combinations the engine has written and posted least:
${targets.map((t) => `- ${t.hookFamily} x ${t.decisionDomain}  (written ${t.generated}, posted ${t.posted})`).join('\n')}
An explore idea still has to be GOOD. Do not submit a weak idea just to fill the quota — pick the
combination from this list you can write the strongest concrete moment for.
`;
}

function ideatePrompt(s: Seeds, count: number, recent: string[], learned: LearnedContext, reserved: number): string {
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

WHERE THE EMOTIONAL WEIGHT ACTUALLY IS — bias hard toward this, it is the biggest correction available to you.
We harvest the real questions this audience asks in public, and today's are almost entirely about ONE PERSON AND ANOTHER PERSON, or about a life that has stalled: "are there any chances of reconciliation?", "when will my relationship start?", "any big career breakthroughs coming?", "should I stay an engineer or switch?", "any chance of moving abroad again?". Nobody is lying awake about scheduling a meeting or when to study.
Our recent hooks were about meetings, study slots and posting times. That is the SAFE end of the product and it is the LOW-STAKES end. It is why the reels are forgettable.
So write ideas that sit inside the conversations people actually lose sleep over — the message to an ex you have drafted and not sent, the conversation with your parents about the person you are seeing, the resignation you keep rewriting, the "we need to talk" that has been pending for three weeks, the call home you have been putting off.
AND THEN STAY INSIDE BRAND LAW, which is not negotiable and is what makes this defensible rather than exploitative:
- We sell TIMING AND REFLECTION, never outcomes. The idea is "WHEN to have the conversation", never "will he come back". Never "kya wo wapas aayega" — always "wo baat karni hai, aaj ya Sunday?".
- Never predict, never promise, never reassure. We do not know what happens. We know which windows of a day run clearer or heavier for HAVING the conversation, on this person's own chart.
- No fear, no urgency, no doom, no "before it's too late". The register is calm and adult: a friend who says "not tonight, tomorrow morning" — not a fortune-teller.
- The person in the idea is never a victim and never desperate. They are someone sensible who has already decided WHAT to do and is only unsure WHEN.
An idea that fails any of those four is worthless to us even if it would go viral. Write the high-stakes MOMENT, keep the low-stakes CLAIM.

${learned.playbook}
${learned.craft}
${learned.performance}

${exploreBlock(learned.explore, reserved)}
${taxonomyPromptSpec()}

${learned.sense}
NON-NEGOTIABLE RULES:
${s.hardRules.map((r) => `- ${r}`).join('\n')}

${lessonBlock(['script', 'voice'])}
PLAIN ENGLISH ONLY — the owner's ruling, verbatim: "some jargon like Swiss Ephemeris, Lahiri... No one gives a shit. I don't even know what this is." Never put an engine or technical term in an ad: no Swiss Ephemeris, no Lahiri, no ayanamsa, no sidereal, no whole-sign, no vimshottari. When an idea needs credibility, the phrase is "real astronomical data, the same math a careful astrologer uses".
${recent.length ? `\nDO NOT repeat these angles, we already used them recently:\n${recent.slice(0, 25).map((a) => `- ${a}`).join('\n')}` : ''}

Return exactly ${count} ideas as STRICT JSON — an array, nothing before or after it, no markdown fences:
[{"id":"kebab-case-slug","family":"decision_moment|cost_time_anchor|respectful_contrarian","angle":"<the creative angle in one line>","decisionMoment":"<the concrete moment; Hinglish in Latin letters if it is a spoken line>","whyItStops":"<why a scrolling viewer stops inside the first second, max 20 words>","hookFamily":"<one of the six>","decisionDomain":"<one of the seven>","emotionalRegister":"<one of the four>","durationTargetSec":22,"explore":false}]`;
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
        // The legacy config family maps onto a hook family; the rest fall back to the declared
        // defaults rather than being guessed, so a fallback batch never fakes its own evidence.
        tags: normalizeTags({ hookFamily: f.key }),
        explore: false,
      });
    }
  }
  return out.slice(0, count);
}

async function ideate(s: Seeds, tier: Tier, count: number, learned: LearnedContext, reserved: number): Promise<{ ideas: Idea[]; fallback: boolean }> {
  const raw = await tryBrain(ideatePrompt(s, count, recentAngles(), learned, reserved), tier, 'ideate');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  const ideas = (Array.isArray(parsed) ? parsed : [])
    .map((x, i) => ({
      id: slugify(String(x?.id ?? x?.angle ?? `idea-${i}`)),
      family: String(x?.family ?? 'decision_moment'),
      angle: String(x?.angle ?? '').trim(),
      decisionMoment: String(x?.decisionMoment ?? '').trim(),
      whyItStops: String(x?.whyItStops ?? '').trim(),
      // Defensive: an omitted or invented tag falls back to the legacy family / declared default
      // rather than to something plausible-sounding, because a wrong tag corrupts the evidence.
      tags: normalizeTags(x, { hookFamily: normalizeTags({ hookFamily: x?.family }).hookFamily }),
      explore: x?.explore === true,
    }))
    .filter((x) => x.angle.length > 4);

  if (!ideas.length) {
    console.warn('[creative] ideate produced nothing usable — falling back to config seeds.');
    return { ideas: seedFallbackIdeas(s, count), fallback: true };
  }
  return { ideas, fallback: false };
}

/**
 * How many of `count` scripting slots are RESERVED for under-tested tag combinations.
 *
 * The floor of one used to apply at every size, which meant a single-idea run was 100% explore —
 * a share of 0.3 turning into all of it. That is not exploration, it is a different policy, and it
 * had a visible cost: two consecutive `--count 1` runs on 2026-08-16 were steered into the
 * least-tested combination (money_timing, then study) while the ideation stage was deliberately
 * biased toward the relationship and career questions the audience actually asks. The bandit floor
 * exists to stop one lucky early winner monopolising a BATCH; with one slot there is no batch to
 * protect, so the model's own best idea is the honest pick.
 */
function reservedSlots(count: number): number {
  if (count <= 1) return 0;
  return Math.min(count, Math.max(1, Math.round(count * EXPLORE_SHARE)));
}

/**
 * THE EXPLORE/EXPLOIT SPLIT, enforced here rather than trusted to the model.
 *
 * `count` slots advance to the (expensive) scripting stage. `reserved` of them are held for ideas
 * whose (hookFamily x decisionDomain) combination is genuinely under-tested — under-tested
 * according to OUR counts of what has been written and posted, not according to the model's
 * self-declared "explore": true, which it can hand out to everything or nothing.
 *
 * Exploit slots are filled in the model's own order (it ranked them). Explore slots are then
 * filled from the least-tested combinations. If no candidate idea occupies an under-tested
 * combination, the quota simply cannot be met this batch — we say so and move on rather than
 * mislabelling an exploit idea as exploration, which would poison the coverage counts.
 */
function selectForScripting(
  ideas: Idea[],
  count: number,
  targets: ComboCoverage[],
): { chosen: Idea[]; exploreChosen: number; reserved: number } {
  const reserved = reservedSlots(count);
  const targetKeys = new Set(targets.map((t) => t.key));
  const isExplore = (i: Idea) => targetKeys.has(comboKey(i.tags.hookFamily, i.tags.decisionDomain));

  const exploreCandidates = ideas.filter(isExplore);
  const rest = ideas.filter((i) => !isExplore(i));

  // Prefer the LEAST-tested combination first among the explore candidates.
  const rank = new Map(targets.map((t, i) => [t.key, i]));
  exploreCandidates.sort((a, b) => (rank.get(comboKey(a.tags.hookFamily, a.tags.decisionDomain)) ?? 99) - (rank.get(comboKey(b.tags.hookFamily, b.tags.decisionDomain)) ?? 99));

  const picked = exploreCandidates.slice(0, reserved);
  for (const i of picked) i.explore = true;
  for (const i of rest) i.explore = false;

  const chosen = [...picked, ...rest, ...exploreCandidates.slice(reserved)].slice(0, count);
  return { chosen, exploreChosen: chosen.filter((i) => i.explore).length, reserved };
}

// ---------------------------------------------------------------- 2. script

/**
 * THE FORMAT SPEC, as the writer sees it. Every number here is asserted mechanically in
 * preflight(), so this block and that function must be changed together.
 */
function formatSpecBlock(): string {
  return `THE FORMAT — this is the shape of the reel, and it is not a suggestion. Read it before you write a word.

WHAT WENT WRONG LAST TIME, measured: the reel we shipped ran 29 seconds in 5 shots, and the first THIRTEEN SECONDS were a man talking before anything happened. The product — a real day broken into hour slots, each scored, each with a plain-English line about what that window suits — did not appear until second 13. A viewer decides in second three. The single most interesting thing this company owns arrived eight seconds after the audience left. The founder's verdict was "this reel is shit" and he was right.

So the reel no longer INTRODUCES the product. It opens in the middle of the answer, with the product already arriving.

THE SPINE — ${SHOTS_MIN} to ${SHOTS_MAX} shots, ${REEL_SEC_MIN}-${REEL_SEC_MAX} seconds total:
  1. presenter, at most ${FIRST_SHOT_MAX_SEC}s — THE COLD OPEN. He is already mid-thought, answering the question the hook asks. NO greeting, NO "kya aapko pata hai", NO "aaj main baat karunga", NO setup of any kind. If the line would work as the SECOND sentence of a conversation, it is right; if it would work as the first, it is warm-up and you must delete it.
     THE COLD OPEN IS ABOUT THE MOMENT, NOT ABOUT US. It may not name the product, the site, an app, a chart, a report or a score — those words in the first three seconds are a company clearing its throat, and the viewer is gone. It is the sentence the VIEWER has said in their own head: "Teen hafte se yeh message draft mein pada hai." / "Main jaanta hoon kya bolna hai — kab bolna hai, wo nahi." Say the human thing first; the product answers it at second three, on screen, where it is far more convincing than a claim.
  2. screencap — THE PROOF, and it lands before second ${PROOF_BY_SEC}. The real report: hour slots down the day, clearer windows lit, heavier ones dim.
  3. presenter, up to ${LONG_BEAT_MAX_SEC}s — the ONE long beat in the reel, where the idea turns. Only one shot may be this long.
  4. screencap — closer in: one hour slot and the plain-English line under it.
  5-6. presenter and screencap again, short, alternating.
  last. presenter — closes, and says vedichour.com out loud.

THE RULES THAT ARE CHECKED MECHANICALLY (a variant that breaks one is rejected before it costs anything):
- ${SHOTS_MIN}-${SHOTS_MAX} shots. ${REEL_SEC_MIN}-${REEL_SEC_MAX}s total. Not 4 long shots — ${SHOTS_MIN}+ short ones.
- Shot 1 is a presenter shot of at most ${FIRST_SHOT_MAX_SEC}s. Shot 2 is a screencap. The last shot is a presenter shot.
- No shot may run longer than ${SHOT_MAX_SEC}s, except exactly ONE presenter beat which may reach ${LONG_BEAT_MAX_SEC}s.
- At least ${MIN_PRODUCT_SHOTS} screencap shots, at least ${MIN_PRODUCT_SEC}s of product on screen in total. The product is the proof AND it is free to film, so it should be the most-seen thing in the reel.
- At least ${MIN_PRESENTER_SHOTS} presenter shots.
- At most ${MAX_BROLL_SHOTS} broll shot in the whole reel, and it is optional — prefer zero.
- NO SHOT PLAYS SILENT for longer than ${SILENT_SHOT_MAX_SEC}s — the renderer discards any reel with a silence longer than that, as dead air.
- BUT AT MOST ${MAX_NARRATED_SHOTS} SHOTS MAY BE NARRATED OFF CAMERA, and at least ${Math.round(NATIVE_RATIO_FLOOR * 100)}% of the spoken words must be said on camera. Every off-camera line is an audible change of voice, and the owner has already rejected two ads for exactly that.
  These two rules together give you one technique, and it happens to be good filmmaking: a product beat is EITHER a longer shot carrying ${CONNECTIVE_MAX_WORDS} words of narration, OR a fast silent CUTAWAY of ${SILENT_SHOT_MAX_SEC}s or less. Quick cutaways cost no voice change, cost no money, and read as confident editing. Use one narrated product shot and one or two flash cutaways, not three narrated ones.

WHY SO LITTLE B-ROLL. Generic atmosphere footage is what makes an ad look cheap: it is the visual equivalent of clearing your throat, and it is where a generated shot quietly turns your words into props. A face and a real screen, cut tightly against each other, is what a funded company's ad looks like. If you use your one b-roll shot, it must show the ACTUAL human moment of the script — the same man, same clothes, same light, doing the real thing the words describe — never an illustration of the idea.

EVERY SPOKEN LINE MUST BE A SENTENCE A PERSON WOULD SAY OUT LOUD. This is where the last four drafts died, so read this twice. Lines a viewer-reviewer actually threw out, with what he said about them:
- "Farq personal birth chart fit ka." and "Real data, simple what-to-do line." — product bullets with the punctuation of speech.
- "…birth chart se rate hote hain" — "that is the product deck talking, not him."
- "real astronomical data, wahi math jo careful astrologer use karta hai" — "a press release, not a person." THAT PHRASE IS FOR CAPTIONS AND THE DESCRIPTION, NEVER FOR A PRESENTER'S MOUTH. If he needs credibility on camera he says it his own way, in five words, or he does not say it at all — the product on screen is the credibility.
- "yahaan clearer, wahaan heavier" recited as a feature — "the fourth reel making the same point."
Test: read the line aloud. If it is a noun phrase, a feature, or something that could only appear on a landing page, rewrite it as what a friend would actually say. Not "Farq personal birth chart fit ka" but "Tera chart alag hai, mera alag." Not "Real data, simple what-to-do line" but "Yahaan likha hai kis ghante mein kya karna hai."

PUT ONE CONCRETE CONSEQUENCE IN THE SCRIPT — the single most useful note we have received. Somewhere in the middle, one line must name a REAL THING THAT HAPPENED when this person guessed the timing before: the message sent at 1am that got a one-word reply, the appraisal he opened right after his boss's worst meeting, the call he made from the car park because he could not wait. One specific past detail is worth more than every adjective in the script, and it is the difference between a reel about a product and a reel about a person.

DO NOT WRITE THE SAME REEL SIX TIMES. The reviewer's exact complaint on the last batch: "same amber-room-presenter-then-screen pattern; I've already seen this reel." The MAN is fixed — same face, same clothes, that is brand law and it does not change. Everything else must not be: each variant picks its own room and hour (kitchen at night, balcony at first light, parked car, empty office at 8pm, stairwell), its own physical action (not sitting and talking — pouring tea and stopping, standing up mid-thought, putting the phone face-down), and its own shot sizes. Within one reel, three identical medium close-ups of a man in a booth is a slideshow of one shot.

THE TEST TO APPLY TO YOUR OWN DRAFT, honestly: play it in your head at 11pm, muted, thumb ready. At second 1, is anything happening? At second 3, has a real product shown you something specific? If the answer to either is no, the draft is dead and you should write a different one.`;
}

function scriptPrompt(s: Seeds, idea: Idea, n: number, link: string, learned: LearnedContext): string {
  return `${BRAND_BRIEF}

You are writing short-form video scripts for VedicHour. Write ${n} DIFFERENT variants of ONE idea. The variants must genuinely differ — different opening move, different structure, different emotional temperature — not the same script reworded.

THE IDEA
family: ${idea.family}
angle: ${idea.angle}
decision moment: ${idea.decisionMoment}
why it stops the scroll: ${idea.whyItStops}
tags: hookFamily=${idea.tags.hookFamily} · decisionDomain=${idea.tags.decisionDomain} · emotionalRegister=${idea.tags.emotionalRegister} · durationTargetSec=${idea.tags.durationTargetSec}${idea.explore ? '\nTHIS IS AN EXPLORATION IDEA — it occupies a deliberately under-tested combination. Stay inside those tags; the point is to generate evidence for a shape the engine has not tried, so do not drift back toward the familiar format.' : ''}

WHAT THE PRODUCT DOES (never invent a feature):
${s.valueProp}

AUDIENCE: ${s.audience}
REGISTER: ${s.register}

${learned.playbook}
${learned.craft}
${learned.performance}

HOW THE AUDIO WORKS — this drives the whole structure, read it twice:
The PRESENTER shots are generated by a video model that also performs the dialogue ON CAMERA, lip-synced, in a real human voice, at no extra cost. That in-shot voice is the quality bar. Any line NOT spoken by the presenter has to be synthesized by a text-to-speech engine afterwards, and a viewer hears the change instantly — the owner rejected the first two ads for exactly this ("the second voice, when it comes, looks very AI-generated... the first 6 seconds are good").
So: PUT THE MESSAGE IN THE PRESENTER'S MOUTH.
- Use ${MIN_PRESENTER_SHOTS} OR MORE presenter shots, spread through the reel — never two long ones bookending a silent middle. Short beats, cut against the product.
- THE PRESENTER IS A RECURRING BRAND FACE, not a fresh casting each time: always a warm, natural young Indian MAN in his late twenties, softly lit, at home or in a cafe. Describe him that way in every presenter and person-carrying b-roll shot. Two reasons, both hard: a viewer who meets the same face across reels starts recognising VedicHour, and the one synthesized voice we own is pitch-matched to a man of that age (~114 Hz), so a female presenter would force a timbre switch the owner has already rejected once.
- The middle shots (broll / screencap) are VISUAL, but they are NOT SILENT. Each carries a short connective line of ${CONNECTIVE_MAX_WORDS} words maximum — never zero. A shot that plays with no audio for more than ${SILENT_SHOT_MAX_SEC}s makes the renderer throw the whole reel away as dead air, and a viewer with the sound on hears a broken file.
- If a middle shot needs to say more than ${CONNECTIVE_MAX_WORDS} words, that content belongs in presenter dialogue instead. Move it. Do not lengthen the narration.

${formatSpecBlock()}

${LITERALISM_BAN_BLOCK}

PER-FIELD SPEC — follow exactly (the WHY behind these lives in the playbook above, which is versioned and dated; what follows is the mechanical contract):
- hookText: the burned-in on-screen text of the FIRST frame. Maximum ${HOOK_MAX_WORDS} words — see the 1-second hook window in the playbook. Make it a moment or a question, not a slogan.
- spokenScript: every spoken word in the reel, in order (presenter dialogue + any connective narration), as one paragraph. Hinglish in Latin letters. ${REEL_SEC_MIN}-${REEL_SEC_MAX} seconds read aloud — that is ${SCRIPT_WORDS_MIN} to ${SCRIPT_WORDS_MAX} words. Conversational, like a friend texting you back, not an ad. Fewer words than you think: the product on screen is doing half the talking.
- shotList: ${SHOTS_MIN} to ${SHOTS_MAX} shots, following the FORMAT SPEC above exactly. Each: kind = "presenter" | "broll" | "screencap"; seconds (number); visualPrompt; PLUS the line for that shot:
  - presenter shots MUST carry "dialogue" — the exact words said on camera, Hinglish in Latin letters.
  - broll / screencap shots MUST carry "narration" — between 2 and ${CONNECTIVE_MAX_WORDS} words. Never "" and never omitted: a silent shot longer than ${SILENT_SHOT_MAX_SEC}s is rejected as dead air.
  - HARD ARITHMETIC: spoken Hinglish runs ~${WORDS_PER_SECOND} words/second, so any shot's line must be at most (seconds x ${WORDS_PER_SECOND}) words, rounded DOWN. A 2s shot holds 4 words. A 3s shot holds 6. A 4s shot holds 9. A 5s shot holds 11. A 6s shot holds 13. Over that, the renderer cuts the line off mid-sentence and the reel is thrown away. Count the words in every single line before you return it.
  - presenter / broll → visualPrompt is a concrete cinematic prompt for a text-to-video model: SUBJECT, ACTION, CAMERA MOVE, LIGHTING, MOOD. It must be physically renderable — one clear subject, one clear action. Apply the playbook's "no legible screens" and "subject continuity" principles literally: no text-in-video, no logos, no crowds of faces, no readable UI; any screen in shot is described as "heavily out of focus, glowing softly, no legible characters"; and any person in a b-roll shot is described as "the same man as the presenter shot: young Indian man in his late twenties, same clothing, same time of day", matching the presenter shot's outfit and lighting exactly.
  - screencap → this is a REAL screen recording of the live product, so visualPrompt is simply WHAT TO CAPTURE, chosen from: ${s.screencapLibrary.map((x) => `"${x}"`).join('; ')}
  - SCREENCAP HARD RULE (owner, verbatim): "when it shows the platform scrolling, it should show the REPORT and not the payment section... how all slots are coming and tell you what to do at what time of day." Never ask to capture pricing, plans, checkout, payment or the signup/onboarding form. The screen we show is the report and its hour-slots.
  - SHOT 1 MUST BE kind "presenter", at most ${FIRST_SHOT_MAX_SEC} seconds, and it is a COLD OPEN — see the FORMAT SPEC above. SHOT 2 MUST BE kind "screencap". Both are hard rejects.
  - The LAST shot MUST be a presenter shot, so the reel closes on a face saying the closing line rather than on synthesized narration over a scroll.
  - THE CLOSING PRESENTER LINE MUST SAY "VedicHour.com" OUT LOUD. This is a hard reject, not a preference. The owner, verbatim: "at the end there should be a call to action: Try VedicHour.com... because people who are listening to the reel will figure out, Oh, I found this new platform, VedicHour." Half this audience is LISTENING with their eyes somewhere else, so a CTA that only exists on screen reaches nobody. Put it in the final presenter shot's \`dialogue\`, in his own words, e.g. "…VedicHour.com pe dekh lo." or "…VedicHour.com — free hai." Budget the words: the site name costs 1-2 of that shot's word allowance, so keep the rest of the closing line short. The renderer already ends every reel on a branded card showing vedichour.com — your job is the SPOKEN half, which only the presenter can deliver.
  - Every variant needs at least ${MIN_PRODUCT_SHOTS} screencap shots totalling at least ${MIN_PRODUCT_SEC}s. Shot seconds must sum to ${REEL_SEC_MIN}-${REEL_SEC_MAX}s.
- onScreenCaptions: 3-6 short burned-in caption lines that track the script. Punchy, Latin letters.
- cta: one short line, and it names vedichour.com. Invite, never promise.
- hashtags: 10-15, mixed romanised-Hindi and English, targeted at India. Lowercase, with the # prefix.
- youtubeTitle: under 70 characters.
- youtubeDescription: 2-3 sentences, and it MUST contain this link exactly once, verbatim: ${link}
- language: "hinglish"

${taxonomyPromptSpecCompact()}
Tag EVERY variant. Default to the idea's tags above; change one only when this particular variant genuinely lands somewhere else (e.g. you wrote a playful take on an anxious idea). Do NOT change a tag to make the variant look better.

NON-NEGOTIABLE RULES:
${s.hardRules.map((r) => `- ${r}`).join('\n')}
- The brand line "${BRAND.taglineClose}" belongs in the written \`cta\` field ONLY. Never put it in a presenter's spoken dialogue: said out loud it turns the last thing the viewer hears into an ad read, and it spends words the closing shot needs for saying the site.

${lessonBlock(['script', 'voice'])}
PLAIN ENGLISH ONLY — the owner's ruling, verbatim: "some jargon like Swiss Ephemeris, Lahiri... No one gives a shit. I don't even know what this is." A script containing Swiss Ephemeris, Lahiri, ayanamsa, sidereal, whole-sign or vimshottari is rejected automatically and never renders. Where the script needs credibility, the approved phrasing is "real astronomical data, the same math a careful astrologer uses".

Return STRICT JSON — an array of exactly ${n} objects, nothing before or after it, no markdown fences:
[{"hookText":"...","spokenScript":"...","shotList":[{"kind":"presenter","seconds":3,"visualPrompt":"...","dialogue":"<cold open, max 6 words>"},{"kind":"screencap","seconds":3,"visualPrompt":"...","narration":"<max 6 words, or empty>"},{"kind":"presenter","seconds":6,"visualPrompt":"...","dialogue":"..."},{"kind":"screencap","seconds":3,"visualPrompt":"...","narration":""},{"kind":"presenter","seconds":4,"visualPrompt":"...","dialogue":"...vedichour.com..."}],"onScreenCaptions":["..."],"cta":"...","hashtags":["#..."],"youtubeTitle":"...","youtubeDescription":"...","language":"hinglish","hookFamily":"${idea.tags.hookFamily}","decisionDomain":"${idea.tags.decisionDomain}","emotionalRegister":"${idea.tags.emotionalRegister}","durationTargetSec":${idea.tags.durationTargetSec}}]`;
}

function normalizeVariant(raw: any, idea: Idea, index: number, link: string): Variant {
  const shots: Shot[] = (Array.isArray(raw?.shotList) ? raw.shotList : []).map((sh: any) => ({
    kind: (['presenter', 'broll', 'screencap'].includes(String(sh?.kind)) ? String(sh.kind) : 'broll') as Shot['kind'],
    seconds: Number(sh?.seconds) || 0,
    visualPrompt: String(sh?.visualPrompt ?? '').trim(),
    dialogue: String(sh?.dialogue ?? '').trim() || undefined,
    narration: String(sh?.narration ?? sh?.vo ?? '').trim() || undefined,
  }));
  let desc = String(raw?.youtubeDescription ?? '').trim();
  if (desc && !desc.includes(link)) desc = `${desc}\n\n${link}`;
  return {
    ideaId: idea.id,
    family: idea.family,
    angle: idea.angle,
    variantIndex: index,
    hookText: String(raw?.hookText ?? '').trim(),
    // Per-shot lines are authoritative now; spokenScript is the concatenation used for word
    // counts, the publish caption and the linter. Derive it when the model only wrote the shots.
    spokenScript: String(raw?.spokenScript ?? '').trim() || shotLines(shots).join(' '),
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
    // Tags default to the idea's, so an omission inherits a real value instead of a guess. The
    // shot total is the honest floor for durationTargetSec when the model leaves it out.
    tags: normalizeTags(raw, idea.tags, shots.reduce((n, sh) => n + (sh.seconds || 0), 0)),
    explore: idea.explore,
  };
}

async function scriptIdea(s: Seeds, idea: Idea, tier: Tier, n: number, learned: LearnedContext): Promise<Variant[]> {
  const link = utm(BRAND.links.pricing, 'youtube', 'short', 'creative_engine', idea.id);
  const raw = await tryBrain(scriptPrompt(s, idea, n, link, learned), tier, 'script');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  if (!Array.isArray(parsed)) {
    console.warn(`[creative] script: no parsable variants for "${idea.id}" — skipping the idea.`);
    return [];
  }
  return parsed.map((v, i) => normalizeVariant(v, idea, i + 1, link)).filter((v) => v.hookText && v.spokenScript);
}

// ---------------------------------------------------------------- 3. audit

/** Share of spoken words that the presenter says ON CAMERA (Veo native audio). 1 = no TTS at all. */
function nativeDialogueRatio(v: Variant): number {
  const lines = speechFor(v);
  let native = 0;
  let total = 0;
  v.shotList.forEach((sh, i) => {
    const n = words(lines[i] ?? '');
    total += n;
    if (sh.kind === 'presenter') native += n;
  });
  return total ? native / total : 1;
}

/**
 * THE FORMAT SPEC, enforced. Every rule the writer was given in formatSpecBlock() is asserted
 * here, on plain text, for $0. Returns the first violation as a sentence, or null.
 *
 * These are hard rejects rather than warnings on purpose: the reel the owner threw out broke no
 * rule we had, because we had no rule about SHAPE. A gate that only warns about shape produces
 * exactly the reel we already shipped.
 */
function formatSpecViolation(v: Variant): string | null {
  const shots = v.shotList;
  if (shots.length < SHOTS_MIN || shots.length > SHOTS_MAX)
    return `${shots.length} shots — the format is ${SHOTS_MIN}-${SHOTS_MAX} short shots, not a few long ones`;

  const total = shots.reduce((n, sh) => n + (sh.seconds || 0), 0);
  if (total < REEL_SEC_MIN || total > REEL_SEC_MAX)
    return `${total}s total — the format is ${REEL_SEC_MIN}-${REEL_SEC_MAX}s`;

  // House rule from src/render/types.ts: a visible human must open the reel (platforms
  // deprioritise fully AI reels with no human layer). The COLD OPEN is how that coexists with
  // getting the product on screen inside three seconds — the face gets one sentence, not a warm-up.
  if (shots[0].kind !== 'presenter') return `opens on a ${shots[0].kind} shot — a reel must open on a presenter`;
  if ((shots[0].seconds || 0) > FIRST_SHOT_MAX_SEC)
    return `opening presenter shot is ${shots[0].seconds}s — the cold open is ${FIRST_SHOT_MAX_SEC}s at most, or the product cannot land by second ${PROOF_BY_SEC} (the rejected reel spent 13s here)`;
  if (shots[1]?.kind !== 'screencap')
    return `shot 2 is a ${shots[1]?.kind ?? 'missing'} shot — it must be the product, so proof is on screen before second ${PROOF_BY_SEC}`;
  if (shots[shots.length - 1].kind !== 'presenter')
    return `closes on a ${shots[shots.length - 1].kind} shot — the reel must end on a face saying the site out loud`;

  // At most one shot may pause for breath, and only a presenter beat may do it.
  const long = shots.filter((sh) => (sh.seconds || 0) > SHOT_MAX_SEC);
  if (long.length > 1)
    return `${long.length} shots run longer than ${SHOT_MAX_SEC}s — exactly one presenter beat may reach ${LONG_BEAT_MAX_SEC}s, everything else is ${SHOT_MAX_SEC}s or under`;
  if (long.length === 1 && long[0].kind !== 'presenter')
    return `a ${long[0].kind} shot runs ${long[0].seconds}s — only a presenter beat may exceed ${SHOT_MAX_SEC}s`;
  if (long.length === 1 && (long[0].seconds || 0) > LONG_BEAT_MAX_SEC)
    return `the long presenter beat is ${long[0].seconds}s — the ceiling is ${LONG_BEAT_MAX_SEC}s`;

  const product = shots.filter((sh) => sh.kind === 'screencap');
  const productSec = product.reduce((n, sh) => n + (sh.seconds || 0), 0);
  if (product.length < MIN_PRODUCT_SHOTS)
    return `${product.length} product shot(s) — the proof must return at least ${MIN_PRODUCT_SHOTS} times; screencaps are free and they are the most interesting thing we own`;
  if (productSec < MIN_PRODUCT_SEC) return `only ${productSec}s of product on screen — the floor is ${MIN_PRODUCT_SEC}s`;

  const presenters = shots.filter((sh) => sh.kind === 'presenter').length;
  if (presenters < MIN_PRESENTER_SHOTS)
    return `${presenters} presenter shot(s) — the format needs ${MIN_PRESENTER_SHOTS}+ short beats cut against the product, not two long ones bookending a silent middle`;

  const broll = shots.filter((sh) => sh.kind === 'broll').length;
  if (broll > MAX_BROLL_SHOTS)
    return `${broll} b-roll shots — at most ${MAX_BROLL_SHOTS}; generic atmosphere footage is what makes an ad look cheap`;

  return null;
}

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
  if (w < SCRIPT_WORDS_MIN || w > SCRIPT_WORDS_MAX)
    return `spoken script is ${w} words — outside the ${REEL_SEC_MIN}-${REEL_SEC_MAX}s read (${SCRIPT_WORDS_MIN}-${SCRIPT_WORDS_MAX} words)`;
  if (v.shotList.some((sh) => !sh.visualPrompt)) return 'a shot has no visualPrompt';

  const structural = formatSpecViolation(v);
  if (structural) return structural;

  // Owner law 2026-07-26 — jargon is a hard reject in ad copy, not a note for later.
  const jargon = jargonHits([v.hookText, v.spokenScript, v.onScreenCaptions.join(' '), v.cta, v.youtubeTitle].join('\n'));
  if (jargon.length) return `ad-copy jargon (${jargon.join(', ')}) — the owner ruled it meaningless; say "real astronomical data" instead`;

  // Owner law 2026-08-16, verbatim: "window shares an image of window while we are talking of time
  // window." The generator renders figures of speech as props. Both checks are plain-text and free.
  const props = propBanHits(v.shotList);
  if (props.length)
    return `shot ${props[0].shotIndex} generates a "${props[0].prop}" — a metaphor prop, the visual vocabulary of a stock timing ad; show the real subject instead`;
  const literal = literalismHits([v.hookText, v.spokenScript, v.onScreenCaptions.join(' '), v.cta].join('\n'), v.shotList);
  if (literal.length) {
    const h = literal[0];
    return `LITERALISM: the copy says "${h.word}" as a figure of speech and shot ${h.shotIndex} renders a literal one ("${h.excerpt}") — the owner rejected exactly this ("window shares an image of window while we are talking of time window"); show the actual subject of the sentence`;
  }

  // Voice law: the message rides on camera, narration is a short connective line at most, and
  // no line may outrun its shot (the renderer would cut it mid-sentence).
  const lines = speechFor(v);
  for (let i = 0; i < v.shotList.length; i++) {
    const sh = v.shotList[i];
    const n = words(lines[i] ?? '');
    if (!n) {
      if ((sh.seconds || 0) > SILENT_SHOT_MAX_SEC)
        return `shot ${i + 1} (${sh.kind}, ${sh.seconds}s) plays silent — the renderer fails any reel with a silence longer than ${SILENT_SHOT_MAX_SEC}s; give it a connective line of ${CONNECTIVE_MAX_WORDS} words or fewer`;
      continue;
    }
    if (sh.kind !== 'presenter' && n > CONNECTIVE_MAX_WORDS)
      return `shot ${i + 1} (${sh.kind}) carries ${n} words off camera — the connective cap is ${CONNECTIVE_MAX_WORDS}; that line belongs in presenter dialogue`;
    if (sh.kind !== 'presenter' && n > NARRATION_MAX_WORDS)
      return `shot ${i + 1} (${sh.kind}) carries ${n} words of synthesized narration — the cap is ${NARRATION_MAX_WORDS}; that line belongs in presenter dialogue`;
    if (n > capacity(sh))
      return `shot ${i + 1} (${sh.kind}) says ${n} words in ${sh.seconds}s — budget is ${capacity(sh)} at ${WORDS_PER_SECOND} words/s, the tail would be cut off`;
  }
  if (!v.shotList.some((sh) => sh.kind === 'presenter' && words((sh.dialogue ?? lines[v.shotList.indexOf(sh)]) ?? '')))
    return 'no presenter shot actually speaks — the message must be delivered on camera';

  // ONE REEL, ONE VOICE, as close as the format allows.
  const narrated = v.shotList.filter((sh, i) => sh.kind !== 'presenter' && words(lines[i] ?? '') > 0).length;
  if (narrated > MAX_NARRATED_SHOTS)
    return `${narrated} shots are narrated off camera — the cap is ${MAX_NARRATED_SHOTS}. Every one is an audible switch between the on-camera voice and the synthesized one, which is the defect the owner rejected twice; make the extra product beats silent cutaways of ${SILENT_SHOT_MAX_SEC}s instead`;
  const ratio = nativeDialogueRatio(v);
  if (ratio < NATIVE_RATIO_FLOOR)
    return `only ${Math.round(ratio * 100)}% of the spoken words are said on camera (floor ${Math.round(NATIVE_RATIO_FLOOR * 100)}%) — move the rest into presenter dialogue`;

  // Owner law 2026-07-26 — the reel must NAME THE SITE OUT LOUD, in the presenter's own mouth.
  // The renderer always appends a branded end card carrying vedichour.com, but a card is only
  // seen; half this audience is listening. Veo performs the presenter's line, so the spoken CTA
  // is free and stays in the reel's single voice. Mirrored by preflight() in src/loops/render.ts,
  // which refuses to spend on a creative that fails this.
  const closing = closingPresenterLine(v);
  if (!SPOKEN_SITE.test(closing))
    return `the closing presenter line never says the site out loud ("${closing.slice(0, 60)}") — the owner's ruling is that a listener must hear "VedicHour.com"; end on e.g. "…VedicHour.com pe dekh lo."`;
  return null;
}

/** The line the LAST presenter shot says on camera — the reel's only spoken CTA surface. */
function closingPresenterLine(v: Variant): string {
  const lines = speechFor(v);
  for (let i = v.shotList.length - 1; i >= 0; i--) {
    if (v.shotList[i].kind === 'presenter') return (lines[i] ?? '').trim();
  }
  return '';
}

function auditPrompt(idea: Idea, variants: Variant[]): string {
  const blocks = variants
    .map((v) => {
      const lines = speechFor(v);
      return `--- VARIANT ${v.variantIndex} ---
hook: ${v.hookText}
spoken: ${v.spokenScript}
captions: ${v.onScreenCaptions.join(' | ')}
cta: ${v.cta}
shots: ${v.shotList.map((s, i) => `[${s.kind} ${s.seconds}s${lines[i] ? `, ${s.kind === 'presenter' ? 'ON CAMERA' : 'SYNTHESIZED NARRATION'}: "${lines[i]}"` : ', silent'}] ${s.visualPrompt}`).join(' || ')}
on-camera share of spoken words: ${Math.round(nativeDialogueRatio(v) * 100)}%
closing line says the site out loud: ${SPOKEN_SITE.test(closingPresenterLine(v)) ? 'YES' : 'NO'}`;
    })
    .join('\n\n');

  return `You are a HOSTILE creative reviewer. You are not here to be encouraging. Your job is to REJECT weak short-form video scripts before they cost money to render, and you are judged on how much slop you catch. Assume each script is mediocre until it proves otherwise. Scores above 85 must be earned, not given.

The product: VedicHour scores all 18 planetary hours of a day against a person's birth chart and says which windows run clearer or heavier for a given task. Audience: urban Indian and diaspora viewers, aged 24-40, who grew up around Jyotish and will cringe hard at anything that sounds like a WhatsApp-forward astrologer.

THE FORMAT THESE WERE WRITTEN TO — judge them INSIDE it, do not object to it. Every reel opens on a presenter COLD OPEN of ${FIRST_SHOT_MAX_SEC}s or less (the render pipeline requires a human opener; platforms deprioritise faceless AI reels), cuts straight to the real product by second ${PROOF_BY_SEC}, and then alternates short presenter beats with product shots across ${SHOTS_MIN}-${SHOTS_MAX} shots in ${REEL_SEC_MIN}-${REEL_SEC_MAX}s. A brief opening face is therefore CORRECT and must not be marked down as "the presenter should be secondary" or "open on the product instead" — that shape is impossible here. What you SHOULD punish is a cold open that warms up instead of answering, that names the product in the first three seconds, or a reel that fails to keep returning to the proof.

IDEA UNDER REVIEW: ${idea.angle}

${blocks}

Score EVERY variant 0-100 on each axis:
- hookStrength: does the FIRST on-screen line stop a thumb inside one second? Generic slogans, "unlock/discover your...", or anything a viewer has read a thousand times scores under 40.
- specificity: a named, concrete decision moment scores high. An abstraction about "cosmic energy" or "your timing" scores under 30.
- credibility: would an Indian viewer who actually knows some astrology find this embarrassing to be seen watching? Cringe, guru-voice, over-claiming, or fake-deep = low. ENGINE JARGON IS A CREDIBILITY FAILURE, not a credential: "Swiss Ephemeris", "Lahiri", "ayanamsa", "sidereal", "whole-sign", "vimshottari" mean nothing to this viewer and read as a nerd flex — the owner's words: "No one gives a shit. I don't even know what this is." Any variant using one scores under 35 here. The credible version of the same claim is "real astronomical data, the same math a careful astrologer uses".
- brandSafety: score 0-100, and be ruthless. Score BELOW 60 if there is ANY of: a guarantee or certainty claim; "100%" or miracle framing; a health, money, legal, or relationship OUTCOME promise; fear-mongering; a deterministic "THE best hour / worst hour" stated as fact; invented social proof (fake testimonials, made-up user numbers, star ratings); competitor bashing or mockery of astrology or astrologers; any rupee or dollar figure. Calibrate carefully: a script with NO violation at all should score 90-100, and anything you score under ${BRAND_SAFETY_FLOOR} is automatically rejected and never rendered.
- producibility: can a text-to-video model actually render the presenter/broll shots, AND does the reel sound like one human? Readable on-screen text, logos, specific real places, crowds of faces, complex hand interactions, or multi-subject choreography = low. Screencap shots are free (they are real recordings) — judge only what a model must generate. VOICE STRUCTURE IS PART OF THIS SCORE: the presenter's on-camera dialogue is performed by the video model itself in a real voice, while every other line has to be synthesized afterwards and a viewer hears the switch. Judge this on a GRADED scale, not a cliff: 85-100% on camera is excellent; 60-85% is perfectly acceptable PROVIDED every off-camera line is a short connective (the 12-word cap already enforced elsewhere) — do not penalise a variant merely for landing in that band; below 50%, or any single off-camera paragraph, scores under 40 however pretty the visuals are. The "on-camera share" figure is given for each variant above — use it, but weigh the LENGTH of the off-camera lines more than the raw percentage.

HARD RULE, ABOVE ALL FIVE AXES — THE SPOKEN CTA. The last presenter shot's on-camera dialogue must NAME THE SITE OUT LOUD ("…VedicHour.com pe dekh lo"). The owner's ruling, verbatim: "at the end there should be a call to action: Try VedicHour.com... because people who are listening to the reel will figure out, Oh, I found this new platform, VedicHour." Each variant above is annotated with "closing line says the site out loud: YES/NO". Any variant marked NO is verdict "reject" — no exceptions, however good the hook is — and score its hookStrength no higher than 45, because a reel nobody can act on is not doing the job a hook exists to start.

${lessonBlock(['script', 'voice', 'caption'], 'LESSONS THE OWNER HAS ALREADY RULED ON — a variant that violates one is a reject, not a note')}
Return STRICT JSON — an array, one object per variant, nothing before or after it, no fences:
[{"variantIndex":1,"hookStrength":0,"specificity":0,"credibility":0,"brandSafety":0,"producibility":0,"verdict":"reject|keep","notes":"<your single harshest objection, max 20 words>"}]`;
}

function degradedScores(v: Variant, lintVerdict: string, humanEye: number): Scores {
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
    producibility * WEIGHTS.producibility +
    humanEye * WEIGHTS.humanEye;
  return { hookStrength, specificity, credibility, brandSafety, producibility, humanEye, total: Math.round(total), notes: 'heuristic fallback — hostile reviewer unavailable', degraded: true };
}

/**
 * Flat deduction from the weighted total when the closing line does not name the site out loud.
 *
 * Deliberately NOT folded into one of the five axes: none of them means "did the ad ask for the
 * business". Distorting `credibility` or `producibility` to carry it would make both scores lie,
 * and the tournament ranks on the total anyway. 20 points is enough that a CTA-less variant can
 * never out-rank an equivalent one that closes properly.
 */
const MISSING_SPOKEN_CTA_PENALTY = 20;

/**
 * Deterministic enforcement of the owner's scoring laws, applied AFTER the model scores so a
 * generous reviewer cannot score them away:
 *   credibility  <- engine jargon is a credibility failure, not a credential.
 *   producibility <- a reel whose words are spoken ON CAMERA needs no TTS and sounds like one
 *                    human; a narration-heavy variant is the defect the owner rejected.
 *   total        <- a closing line that never says "VedicHour.com" out loud is penalised, because
 *                    a listener with their eyes elsewhere never learns where to go.
 */
function applyOwnerLaws(v: Variant, s: Scores): Scores {
  const jargon = jargonHits([v.hookText, v.spokenScript, v.onScreenCaptions.join(' '), v.cta, v.youtubeTitle, v.youtubeDescription].join('\n'));
  const ratio = nativeDialogueRatio(v);
  const noSpokenCta = !SPOKEN_SITE.test(closingPresenterLine(v));

  const credibility = jargon.length ? Math.min(s.credibility, 30) : s.credibility;
  const producibility =
    ratio >= 0.85 ? clamp(s.producibility + 8) : ratio < 0.5 ? Math.min(s.producibility, 40) : ratio < 0.7 ? Math.min(s.producibility, 65) : s.producibility;

  const notes = [
    s.notes,
    jargon.length ? `credibility capped at 30 — ad-copy jargon: ${jargon.join(', ')}` : '',
    ratio < 0.7 ? `producibility capped — only ${Math.round(ratio * 100)}% of the words are spoken on camera` : '',
    noSpokenCta ? `total −${MISSING_SPOKEN_CTA_PENALTY} — the closing line never says "VedicHour.com" out loud (owner law)` : '',
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 260);

  const total = clamp(
    Math.round(
      s.hookStrength * WEIGHTS.hookStrength +
        s.specificity * WEIGHTS.specificity +
        credibility * WEIGHTS.credibility +
        s.brandSafety * WEIGHTS.brandSafety +
        producibility * WEIGHTS.producibility +
        s.humanEye * WEIGHTS.humanEye,
    ) - (noSpokenCta ? MISSING_SPOKEN_CTA_PENALTY : 0),
  );
  return { ...s, credibility, producibility, total, notes };
}

/**
 * THE HUMAN-EYE PASS — src/audit/human-eye.ts. Runs alongside the hostile compliance reviewer and
 * answers a different question: would a bored person at 11pm stop, and does this look like an ad a
 * funded company paid for. It is allowed to reject a script that breaks no rule, which is the
 * whole point — every rule we own passed the reel the owner threw out.
 */
async function humanEyeReview(variants: Variant[], tier: Tier): Promise<Map<number, HumanEyeVerdict>> {
  const reels: HumanEyeReel[] = variants.map((v) => {
    const lines = speechFor(v);
    return {
      index: v.variantIndex,
      hookText: v.hookText,
      spokenScript: v.spokenScript,
      captions: v.onScreenCaptions,
      shots: v.shotList.map((sh, i) => ({ kind: sh.kind, seconds: sh.seconds, visualPrompt: sh.visualPrompt, line: lines[i] ?? '' })),
    };
  });
  const raw = await tryBrain(humanEyePrompt(reels), tier, 'human-eye');
  const eye = parseHumanEye(raw ? extractJson<unknown>(raw) : null, reels.map((r) => r.index));
  if (raw && !eye.size) console.warn(`[creative] human-eye: answered ${raw.length} chars but no verdict parsed — every variant will be treated as unreviewed.`);
  return eye;
}

async function auditIdea(idea: Idea, variants: Variant[], tier: Tier): Promise<Map<number, any>> {
  const raw = await tryBrain(auditPrompt(idea, variants), tier, 'audit');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  const map = new Map<number, any>();
  if (Array.isArray(parsed)) for (const r of parsed) map.set(Number(r?.variantIndex), r);
  return map;
}

/** lint() + hostile audit + human-eye lens + deterministic gates → a judged variant. Never throws. */
async function judge(idea: Idea, variants: Variant[], tier: Tier): Promise<Judged[]> {
  const audit = await auditIdea(idea, variants, tier);
  // The taste pass only looks at variants whose SHAPE is already legal — asking a viewer whether
  // they would stop watching a reel that can never be rendered is wasted reasoning.
  const preByIndex = new Map(variants.map((v) => [v.variantIndex, preflight(v)]));
  const showable = variants.filter((v) => !preByIndex.get(v.variantIndex));
  const eye = showable.length ? await humanEyeReview(showable, tier) : new Map<number, HumanEyeVerdict>();
  const out: Judged[] = [];

  for (const v of variants) {
    const pre = preByIndex.get(v.variantIndex) ?? null;
    const he = eye.get(v.variantIndex) ?? degradedHumanEye(v.variantIndex);

    let lintVerdict = 'pass';
    let lintReason = 'skipped (failed deterministic preflight)';
    if (!pre) {
      const text = [v.hookText, v.spokenScript, v.onScreenCaptions.join(' '), v.cta, v.youtubeTitle, v.youtubeDescription].join('\n');
      try {
        // These variants become PAID ads — the ad ruleset (viewer-pain framing, jargon) applies.
        const r = await lint(text, { context: 'ad' });
        lintVerdict = r.verdict;
        lintReason = r.reason;
      } catch (e: any) {
        lintVerdict = 'flag';
        lintReason = `linter unavailable: ${String(e?.message ?? e).slice(0, 80)}`;
      }
    }

    const a = audit.get(v.variantIndex);
    const rawScores: Scores = a
      ? (() => {
          const s = {
            hookStrength: clamp(Number(a.hookStrength) || 0),
            specificity: clamp(Number(a.specificity) || 0),
            credibility: clamp(Number(a.credibility) || 0),
            brandSafety: clamp(Number(a.brandSafety) || 0),
            producibility: clamp(Number(a.producibility) || 0),
            humanEye: he.overall,
          };
          const total = Math.round(
            s.hookStrength * WEIGHTS.hookStrength +
              s.specificity * WEIGHTS.specificity +
              s.credibility * WEIGHTS.credibility +
              s.brandSafety * WEIGHTS.brandSafety +
              s.producibility * WEIGHTS.producibility +
              s.humanEye * WEIGHTS.humanEye,
          );
          const eyeNote = he.degraded ? 'human eye: UNAVAILABLE (neutral score)' : `human eye ${he.overall}: ${he.diesAt || 'watched it through'}`;
          return { ...s, total, notes: [String(a.notes ?? '').slice(0, 160), eyeNote].filter(Boolean).join(' · '), degraded: false };
        })()
      : degradedScores(v, lintVerdict, he.overall);
    const scores = applyOwnerLaws(v, rawScores);

    // Hard rejects, in order of authority.
    let rejection: string | null = null;
    if (pre) rejection = pre;
    else if (lintVerdict === 'block') rejection = `policy-linter BLOCK: ${lintReason}`;
    else if (scores.brandSafety < BRAND_SAFETY_FLOOR) rejection = `brand-safety ${scores.brandSafety}/100 (floor ${BRAND_SAFETY_FLOOR}): ${scores.notes}`;
    else if (String(a?.verdict ?? '').toLowerCase() === 'reject') rejection = `hostile reviewer rejected: ${scores.notes}`;
    // The taste veto. Deliberately AFTER the compliance rejects so the log names the cheapest
    // reason first, and deliberately absolute: a reel that breaks no rule and that a bored viewer
    // would scroll past is exactly the reel the owner threw out, and it must not reach him again.
    else if (!he.degraded && he.verdict === 'reject')
      rejection = `HUMAN EYE rejected — dies at ${he.diesAt || 'the first second'}${he.oneFix ? ` · fix: ${he.oneFix}` : ''}`;
    else if (!he.degraded && he.overall < HUMAN_EYE_FLOOR)
      rejection = `HUMAN EYE ${he.overall}/100 (floor ${HUMAN_EYE_FLOOR}) — ${he.diesAt || 'nothing here would stop a thumb'}`;

    out.push({
      variant: v,
      scores,
      lintVerdict,
      lintReason,
      // A script the human-eye lens never saw is not cleared, it is unreviewed — it goes to the
      // owner's queue rather than straight to the machine that spends money.
      status: rejection ? 'rejected' : lintVerdict === 'flag' || he.degraded ? 'needs_review' : 'ready_to_render',
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
  /** Explicit, so the $0 pre-flight gate can read the voice plan straight off the JSON. */
  voice?: string;
  capture?: { url: string; libraryKey?: string; waitForSelector?: string; scrollPx?: number; panToPx?: number };
}

/** The line each shot speaks, as written by the model (empty string when silent). */
function shotLines(shots: Shot[]): string[] {
  return shots.map((sh) => ((sh.kind === 'presenter' ? sh.dialogue : sh.narration) ?? '').trim());
}

/** How many words a shot can hold at conversational Hinglish pace. */
const capacity = (sh: Shot) => Math.floor((sh.seconds || 0) * WORDS_PER_SECOND);

/**
 * PRESENTER-FIRST speech plan, used when the model wrote a flat `spokenScript` instead of
 * per-shot lines.
 *
 * The old allocator spread the script across ALL shots proportionally by duration, which is
 * precisely how a 26-word paragraph of synthesized narration ended up on a b-roll shot in the
 * first two ads. The message belongs on camera: presenter shots are filled to their spoken
 * capacity first, and non-presenter shots get at most one short connective line
 * (<= NARRATION_MAX_WORDS words) — anything that doesn't fit that rule stays with the presenter.
 */
function planSpeech(script: string, shots: Shot[]): string[] {
  const sentences = script.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = shots.map(() => '');
  const presenterIdx = shots.map((sh, i) => (sh.kind === 'presenter' ? i : -1)).filter((i) => i >= 0);
  if (!presenterIdx.length) return out;

  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const queue = [...sentences];
  const used = out.map(() => 0);

  // 1. fill the presenter shots, in order, up to their spoken capacity
  for (const i of presenterIdx) {
    const cap = capacity(shots[i]);
    while (queue.length && used[i] + words(queue[0]) <= cap) {
      const s = queue.shift()!;
      out[i] = out[i] ? `${out[i]} ${s}` : s;
      used[i] += words(s);
    }
  }

  // 2. leftovers may become SHORT connective lines on non-presenter shots
  for (let i = 0; i < shots.length && queue.length; i++) {
    if (shots[i].kind === 'presenter') continue;
    const cap = Math.min(NARRATION_MAX_WORDS, capacity(shots[i]));
    if (queue.length && words(queue[0]) <= cap) {
      out[i] = queue.shift()!;
    }
  }

  // 3. anything still unplaced goes back to the presenter with the most headroom. If it
  //    overruns, preflight() rejects the variant rather than letting the renderer cut a line.
  if (queue.length) {
    const target = presenterIdx.reduce((best, i) => (capacity(shots[i]) - used[i] > capacity(shots[best]) - used[best] ? i : best), presenterIdx[0]);
    out[target] = `${out[target]} ${queue.join(' ')}`.trim();
  }
  return out;
}

/** The final per-shot lines: what the model wrote, or a presenter-first plan of the paragraph. */
function speechFor(v: Variant): string[] {
  const explicit = shotLines(v.shotList);
  return explicit.some(Boolean) ? explicit : planSpeech(v.spokenScript, v.shotList);
}

function toRenderShots(v: Variant): RenderShot[] {
  const speech = speechFor(v);
  let heroUsed = false;
  return v.shotList.map((sh, i) => {
    const line = speech[i] ?? '';
    if (sh.kind === 'screencap') {
      // resolveCapture() is the single source of truth for what a product shot may scroll —
      // it can only ever return a report/chart target, never pricing or checkout.
      const c = resolveCapture(sh.visualPrompt);
      return {
        id: `s${i + 1}`,
        role: 'product' as const,
        seconds: sh.seconds,
        vo: line,
        voice: line ? AD_VO_VOICE : undefined,
        capture: { url: c.url, libraryKey: c.libraryKey, waitForSelector: c.waitForSelector, scrollPx: c.scrollPx, panToPx: c.panToPx },
      };
    }
    if (sh.kind === 'presenter') {
      const role = i === 0 ? ('presenter' as const) : ('presenter_close' as const);
      return { id: `s${i + 1}`, role, seconds: sh.seconds, prompt: sh.visualPrompt, dialogue: line, voice: NATIVE_VOICE };
    }
    const role = heroUsed ? ('broll' as const) : ((heroUsed = true), 'broll_hero' as const);
    return { id: `s${i + 1}`, role, seconds: sh.seconds, prompt: sh.visualPrompt, vo: line, voice: line ? AD_VO_VOICE : undefined };
  });
}

/** The voice plan, emitted so a pre-flight gate never has to re-derive it from roles. */
function voicePlanFor(shots: RenderShot[]) {
  const narrated = shots.filter((s) => (s.vo ?? '').trim());
  return {
    adVoice: AD_VO_VOICE,
    nativeShots: shots.filter((s) => s.voice === NATIVE_VOICE).map((s) => s.id),
    narratedShots: narrated.map((s) => s.id),
    maxNarrationWords: narrated.reduce((m, s) => Math.max(m, words(s.vo ?? '')), 0),
  };
}

function renderContract(j: Judged, slug: string) {
  const v = j.variant;
  const shots = toRenderShots(v);
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
    // The hook taxonomy travels with the contract so loop:sync can mirror it into
    // marketing_assets — that is the join that lets performance be attributed to a SHAPE.
    tags: v.tags,
    explore: v.explore,
    voice: AD_VO_VOICE,
    voicePlan: voicePlanFor(shots),
    shots,
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

**Tags** — hook family \`${v.tags.hookFamily}\` · domain \`${v.tags.decisionDomain}\` · register \`${v.tags.emotionalRegister}\` · target ${v.tags.durationTargetSec}s${v.explore ? ' · **EXPLORE** (reserved slot, under-tested combination)' : ''}

## Scores
| axis | score |
| --- | --- |
| hook strength | ${s.hookStrength} |
| specificity | ${s.specificity} |
| credibility | ${s.credibility} |
| brand safety | ${s.brandSafety} |
| producibility | ${s.producibility} |
| human eye (taste, can reject alone) | ${s.humanEye} |
| **weighted total** | **${s.total}** |

Policy-linter: **${j.lintVerdict}** — ${j.lintReason}
Hostile reviewer: ${s.notes || 'no objection recorded'}${s.degraded ? '\n\n> Scored by the heuristic fallback — the hostile reviewer was unreachable.' : ''}

## Hook (first frame, under 1.0s)
**${v.hookText}**  _(${words(v.hookText)} words)_

## Spoken script _(${words(v.spokenScript)} words, ~${Math.round(words(v.spokenScript) / 2.6)}s)_
${v.spokenScript}

## Shot list
_On-camera share of the spoken words: **${Math.round(nativeDialogueRatio(v) * 100)}%** — the rest is synthesized with the Sarvam voice \`${AD_VO_VOICE}\`._

${v.shotList
  .map((sh, i) => {
    const line = speechFor(v)[i] ?? '';
    const voice = !line ? 'silent' : sh.kind === 'presenter' ? 'ON CAMERA (Veo native)' : `narration · ${AD_VO_VOICE}`;
    return `${i + 1}. **${sh.kind}** · ${sh.seconds}s · ${voice}\n   ${sh.visualPrompt}${line ? `\n   > ${line}` : ''}`;
  })
  .join('\n')}

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
        total_score, tournament_rank, rejection_reason, payload, asset_path,
        hook_family, decision_domain, emotional_register, duration_target_sec, explore)
     VALUES (@batch_id, @idea_id, @family, @angle, @variant_index, @hook_text, @spoken_script, @language, @status,
        @lint_verdict, @lint_reason, @hook_strength, @specificity, @credibility, @brand_safety, @producibility,
        @total_score, @tournament_rank, @rejection_reason, @payload, @asset_path,
        @hook_family, @decision_domain, @emotional_register, @duration_target_sec, @explore)`,
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
        hook_family: j.variant.tags.hookFamily,
        decision_domain: j.variant.tags.decisionDomain,
        emotional_register: j.variant.tags.emotionalRegister,
        duration_target_sec: j.variant.tags.durationTargetSec,
        explore: j.variant.explore ? 1 : 0,
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

    // 0. LEARN — what results, live questions and the playbook say, before a word is written.
    const learned = await gatherLearned(count);
    console.log(`[creative] evidence → ${learned.snapshot?.assets.length ?? 0} posted asset(s) with stats · ${learned.sense ? 'sense digest present' : 'no sense digest (run loop:sense)'}`);
    console.log(`             ${learned.performance.split('\n')[0]}`);

    // 1. IDEATE
    const reservedAsk = reservedSlots(count);
    const { ideas, fallback } = await ideate(seeds, tier, IDEAS_REQUESTED, learned, reservedAsk);
    console.log(`[creative] ideate → ${ideas.length} candidate hooks${fallback ? ' (SEED FALLBACK — brain was unreachable)' : ''}`);

    // 1b. EXPLORE/EXPLOIT — enforced on OUR coverage counts, not on the model's self-label.
    const { chosen, exploreChosen, reserved } = selectForScripting(ideas, count, learned.explore);
    console.log(
      `[creative] explore/exploit → ${exploreChosen}/${reserved} reserved explore slot(s) filled, ${chosen.length - exploreChosen} exploit` +
        (exploreChosen < reserved ? ' — QUOTA UNMET: no candidate idea landed in an under-tested combination this batch (not faked)' : ''),
    );
    for (const i of chosen) console.log(`             · ${i.explore ? '[EXPLORE] ' : ''}[${i.tags.hookFamily}/${i.tags.decisionDomain}/${i.tags.emotionalRegister}] ${i.angle}`);

    // 2. SCRIPT
    const scripted: { idea: Idea; variants: Variant[] }[] = [];
    for (const idea of chosen) {
      if (isKilled()) {
        console.log('[creative] kill-switch tripped mid-run — stopping.');
        break;
      }
      const variants = await scriptIdea(seeds, idea, tier, VARIANTS_PER_IDEA, learned);
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
      console.log(`  #${w.rank} [${w.scores.total}] "${w.variant.hookText}"  → ${w.status}  {${w.variant.tags.hookFamily}/${w.variant.tags.decisionDomain}/${w.variant.tags.emotionalRegister}/${w.variant.tags.durationTargetSec}s${w.variant.explore ? ' EXPLORE' : ''}}`);
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
