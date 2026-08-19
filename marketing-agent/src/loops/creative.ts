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
import { WORDS_PER_SECOND, SPOKEN_SITE } from '../render/types';
import { comboKey, normalizeTags, taxonomyPromptSpec, taxonomyPromptSpecCompact, type CreativeTags } from '../taxonomy';
import { aggregatePerformance, exploreTargets, renderBrief, type ComboCoverage, type PerformanceSnapshot } from '../performance';
import { senseDigest } from './sense';
import { playbookBlock } from '../playbook';
import { craftBlock } from '../craft';
import {
  LITERALISM_BAN_BLOCK,
  HUMAN_EYE_FLOOR,
  coldOpenDefect,
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
 *   s2  presenter  <=6s   the one long beat: the real, specific, human thing that happened.
 *   s3  presenter  ~4s    still him, no cut away — the turn.
 *   s4  product    5-6s   THE HOLD — the only screen in the reel, and nobody narrates it.
 *   s5  presenter  ~4s    close, says the brand name out loud, lands on where s1 opened.
 *
 * ...OR the writer spends a second product beat on an early <=2s INSERT, which is allowed and is
 * never required. See MIN_PRODUCT_SHOTS: requiring two beats cost 21 points of measured taste.
 *
 * Why these numbers and not others:
 *  - PRODUCT SHOTS ARE FREE (real screen recordings) and GENERATED SHOTS ARE NOT. So the format
 *    that retains best is also the cheapest: ~$2.40 of Veo for four presenter beats, versus $3.02
 *    for the rejected reel, and every extra product beat costs nothing.
 *  - B-ROLL IS THE SLOP VECTOR. Generic atmosphere footage is where "expensive" dies and where
 *    the metaphor-as-prop defect lives (see audit/human-eye.ts). One b-roll shot maximum, and it
 *    must show the real human subject of the sentence, never an illustration of it.
 *  - NOBODY NARRATES THE PRODUCT. A music bed runs under the whole reel (src/render/assemble.ts
 *    refuses to render without one), so a product beat with no words is a CUT, not dead air. Every
 *    spoken word in the reel is therefore said on camera, and the screen is left to answer for
 *    itself — which is both the one-voice fix the owner asked for twice and the taste fix, because
 *    a voiceover explaining what is visible on screen is what an infomercial sounds like.
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
/**
 * WHEN THE PROOF ARRIVES — an EARNED deadline, not a fixed slot. Changed 2026-08-17.
 *
 * The rule this replaces was "shot 2 is always the product", and it was the owner's own rule. It
 * came from a real measurement (the rejected reel showed the product at second 13) and it fixed
 * that. But it then fought the taste lens on EVERY subsequent batch, in the lens's own words:
 * "the grid cuts in before any question forms in my head", "product screen breaks emotional setup
 * before tension peaks", "product screen after stairwell scene feels like an ad pivot". The engine
 * threaded that needle roughly once in twelve variants. A constraint that the quality judge rejects
 * eleven times in twelve is not a quality constraint; it is a lottery.
 *
 * The owner's ruling, verbatim: "The rule is mine and it is wrong as an absolute."
 *
 * So the deadline is kept and the SLOT is not. The product may land at shot 2 or shot 3, and the
 * writer chooses on one question: has the cold open created a question worth answering yet? If the
 * first line already asks something, the screen answers it immediately and shot 2 is right. If the
 * first line needs one more beat before anyone cares, the screen waits for that beat — and the
 * reel opens on two presenter shots instead, which is the unbroken run of human thought the format
 * already wanted.
 *
 * What does NOT move, because these are the parts that survived every batch:
 *  - the product is still on screen for at least MIN_PRODUCT_SEC,
 *  - the HOLD is still the last product beat and still gets time to be read.
 * (AMENDED 2026-08-18 — see MIN_PRODUCT_SHOTS. The early insert this paragraph assumed is now
 * optional, and PROOF_BY_SHOT_MAX / PROOF_STARTS_BY_SEC bind only a reel that chooses to have one.)
 *
 * PROOF_STARTS_BY_SEC is the real floor here and it is what keeps this from drifting back to the
 * reel the owner threw out: 8s allows a 3s cold open plus one 5s beat, or a 2s open plus the 6s
 * long beat. It does not allow a 3s open plus a 6s beat, and it is nowhere near 13.
 */
const PROOF_BY_SHOT_MAX = 3;
/**
 * 9s = the cold open (3s) plus the long beat (6s) — i.e. exactly the two beats this format already
 * allows before the proof, and not one second more. It was 8s for one batch, which silently made
 * the canonical "3s open + 6s detail" spine illegal by a tenth of a second and would have rejected
 * the shape the prompt itself asks for. Still 30% earlier than the 13-second reel the owner threw
 * out, which is the failure this ceiling exists to prevent.
 */
const PROOF_STARTS_BY_SEC = 9;
/** Kept for the copy that still describes the immediate case, and for the cold-open ceiling. */
const PROOF_BY_SEC = 3;
/**
 * ONE PRODUCT BEAT IS ENOUGH. Owner ruling 2026-08-18, and it is worth ~21 points of taste.
 *
 * THE EXPERIMENT. The previous session ran a controlled A/B/C on ONE idea: identical words,
 * identical judge, one call, so the only variable was the shape.
 *   A  two product beats, wordless (the shape this file mandated)      -> human eye 55, reject
 *   B  the same, plus an L-cut across the picture cut                  -> human eye 62, reject
 *   C  ONE product beat, late, answering the question already asked    -> human eye 76, KEEP
 * 76 was the first `keep` in sixty-plus variants. The floor of two was not a quality rule; it was
 * the reason the reel had to cut to a screen before it had earned one, and the lens said so in
 * every batch ("the grid cuts in before any question forms in my head", "an ad pivot").
 *
 * SO THE FLOOR IS ONE, AND THE SECOND BEAT IS AN OPTION. A reel may still run insert-then-hold —
 * that shape is unchanged and still legal — but it must now EARN the extra cut instead of being
 * required to make it. What survives, because the evidence for these never wavered:
 *  - the product is still on screen for MIN_PRODUCT_SEC in total. Fewer beats does not mean less
 *    proof; it means the proof is one uninterrupted look instead of two glances.
 *  - a reel with no product beat at all is still nothing (see formatSpecViolation).
 *  - when there ARE two, the first is still an insert (<= FIRST_PRODUCT_MAX_SEC) and lands early.
 */
const MIN_PRODUCT_SHOTS = 1;
/**
 * AMENDED 2026-08-19 (5 -> 3). The floor of five, with PRODUCT_HOLD_MAX_SEC at six and every
 * non-presenter shot silent by voice law, MANDATED a five-to-six-second still, wordless screen.
 * The taste lens then rejected that exact block, in its own words, in six of the ten scripts it
 * killed on 2026-08-18: "six-second silent grid feels like the commercial finally starting", "the
 * long static product hold turns honest discomfort into an ad", "the silent demo feels scheduled,
 * not emotionally necessary". Its prescription never varied: "keep the screen under two seconds
 * and let his decision finish the story."
 *
 * One gate ordering the thing another gate kills is a closed valve, not quality control. The
 * legibility evidence that set the floor at five was about a SCROLL — "the payoff scrolls 18 tiny
 * windows", "an unreadable grid scroll" — and it was answered by making the hold STILL and
 * showing TWO cards, not by making it long. A still frame of two hour-slots is read in three
 * seconds; the extra three only ever bought the silence in which the reel stops being a story.
 */
const MIN_PRODUCT_SEC = 3;
/**
 * WHERE THE SOLE BEAT SITS, when a reel chooses one. "Late" is the whole point of variant C: the
 * screen is not shown, it is ANSWERED WITH. A single product shot parked at second three is just
 * the old insert with the hold deleted, which is strictly worse than either shape.
 *
 * 0.4 rather than 0.5 because a 6-shot reel's natural payoff slot (shot 5 of 6, ~second 13 of 23)
 * sits at 0.57 and its earliest defensible slot — after the cold open, the remembered detail and
 * the turn — is around 0.45. A floor at 0.4 rejects "product at shot 2" without prescribing which
 * of the two late slots the writer picks, and the taste lens adjudicates the rest.
 */
const SOLE_PRODUCT_MIN_START_FRAC = 0.4;
/**
 * ...and how late is too late. This is the ONE thing the 13-second reel the owner threw out still
 * governs. That reel put its product at second 13 of 29 — 45% in, with 16 seconds of reel left to
 * carry it. A single beat that starts at second 14 of a 20-28s reel is followed by the hold itself
 * plus the close, i.e. it owns the entire back third, which is the opposite failure. Past that and
 * the reel is a talking head with a screenshot stapled on.
 */
const SOLE_PRODUCT_STARTS_BY_SEC = 14;
const MIN_PRESENTER_SHOTS = 3;
const MAX_BROLL_SHOTS = 1;
/**
 * THE INSERT AND THE HOLD — the correction to this format's own first version.
 *
 * "Product by shot 2" was right and it is owner law. What it produced was wrong: shot 2 became a
 * FOUR-SECOND NARRATED DEMO parked at second three, and the taste lens killed draft after draft
 * for exactly that, in its own words — "product screen breaks emotional setup before tension
 * peaks" (3s), "product screen after stairwell scene feels like an ad pivot" (17s), "same
 * amber-room-presenter-then-screen pattern; I've already seen this reel". A commercial started
 * three seconds into a confession, and the viewer left.
 *
 * The distinction the format was missing is the one every real ad makes:
 *   INSERT — a flash of the thing, cut INSIDE the sentence, no words. It does not break the beat;
 *            it is part of it. When a reel has TWO product beats, the first is always this.
 *   HOLD   — the beat where the screen is the payoff and gets time to be read. It is the LAST
 *            product beat in the reel, and in a one-beat reel it is the only one.
 *
 * AMENDED 2026-08-18: the insert is now an OPTION, not a mandate. See MIN_PRODUCT_SHOTS — a reel
 * that opens the screen once, late, out-scored insert-then-hold by 21 points on the same words.
 * The distinction is kept because when a writer DOES take a second beat this is the only version
 * of it that has ever worked; what is gone is the requirement to take it.
 * Proof still lands before second three, as owner law requires, but as a glance rather than as an
 * interruption.
 */
const FIRST_PRODUCT_MAX_SEC = 2;
const PRODUCT_HOLD_MIN_SEC = 3;
/**
 * A HOLD MAY BREATHE. The sole product beat has to carry MIN_PRODUCT_SEC on its own and
 * SHOT_MAX_SEC is 4 — so without this the one-beat shape is arithmetically impossible and the
 * "floor of one" would be a lie the writer only discovers after a whole rejected batch.
 *
 * AMENDED 2026-08-19 (6 -> 4), with MIN_PRODUCT_SEC. The ceiling used to match the presenter's
 * long beat, on the reasoning that a screencap is free. It is free to FILM; it is not free to
 * WATCH. The presenter's six seconds are six seconds of someone talking to you, and the screen's
 * six were six seconds of nobody talking at all — which is what the taste lens kept naming as the
 * moment the reel turned into an advert. The hold is now 3-4s: long enough to read two still
 * cards, short enough to be a cut rather than a slot, and it hands the two reclaimed seconds back
 * to the face, where the writing is.
 */
const PRODUCT_HOLD_MAX_SEC = 4;
/**
 * ONE UNBROKEN RUN OF HUMAN THOUGHT — at least one pair of ADJACENT presenter shots.
 *
 * Alternating face/screen/face/screen in equal beats is the pattern the lens named as "I've
 * already seen this reel". It is also structurally hostile to the one thing these scripts do well:
 * the real, specific human detail needs more than one beat to land, and cutting to a product
 * screen in the middle of it is what turns a story into a demo. Two presenter shots back to back
 * give the reel ~10 unbroken seconds of face, in two different shot sizes, which is a cut rather
 * than a slideshow.
 */
const MIN_ADJACENT_PRESENTER_PAIRS = 1;
/**
 * Spoken words for a 20-28s reel at 2.3 words/s, with room for silence under the captions.
 *
 * The floor came down from 30 when narration was removed. The canonical spine now spends ~6 of its
 * 23 seconds on wordless product beats, which leaves about 37 words of on-camera capacity — a floor
 * of 30 left almost no room between "too thin" and "over budget" and would have rejected variants
 * for being sparse, which in this format is a virtue rather than a fault.
 */
const SCRIPT_WORDS_MIN = 26;
const SCRIPT_WORDS_MAX = 64;
/**
 * ONE REEL, ONE VOICE — and now that is literally true, because silence became free.
 *
 * HISTORY, because this constant has been wrong twice. The renderer used to throw away any reel
 * with a silence longer than MAX_SILENCE_GAP_SEC, so "no shot may play silent" was real, and the
 * writer answered it the only way it could: by narrating every product beat in the synthesized
 * Sarvam voice. That put an AI voice reciting a feature at second three of every single reel —
 * "Tumhara poora din yahan hai", "Har ghanta samjhaya hai" — which is simultaneously the defect
 * the owner has rejected twice ("the second voice, when it comes, looks very AI-generated") and
 * the "feature wearing a Hindi coat" the taste lens keeps killing drafts for.
 *
 * That constraint no longer exists. src/render/assemble.ts now mixes a MANDATORY music bed under
 * the whole reel and refuses to render without one; assertNoDeadAir() treats any surviving silence
 * as a MIX BUG in that file, not as a creative fault (silence.test.ts: "a bed under the gap makes
 * the reel pass — the fix, verified"). A wordless product beat is no longer dead air. It is a cut,
 * with the score still running.
 *
 * So the budget goes to zero. Every word in the reel is said by the presenter, on camera, in the
 * video model's own free and human voice. No TTS in an ad, ever again — which is CLAUDE.md §2
 * exactly: eliminating narration is both cheaper and better than buying a better narrator. It is
 * also the taste fix, because the product beat now has to EARN its silence instead of having a
 * voiceover explain what the viewer can already see.
 */
const MAX_NARRATED_SHOTS = 0;
const NATIVE_RATIO_FLOOR = 1;
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
 * 10:19, 12:20, 14:21) producing zero variants.
 *
 * Raised again on 2026-08-17 for the same class of reason, in the other direction: codex's own
 * timeout went 300s -> 480s because the script stage genuinely needs it, and 660s could no longer
 * hold claude(300) + codex(480). 840s = 300 + 480 + 60 overhead. Still bounded, so an unattended
 * 2-hourly loop can never wedge forever. THESE TWO NUMBERS MOVE TOGETHER — a per-CLI timeout that
 * sums past this deadline means the stage dies before the second CLI can finish, which is exactly
 * the failure documented above.
 */
const STAGE_DEADLINE_MS = 840_000;

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
  /** NON-presenter shots: always empty. This format has no narration — see MAX_NARRATED_SHOTS. */
  narration?: string;
}

export interface Variant {
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
  /** The CLI that produced `humanEye` — see stageCli. "unavailable" when the lens never answered. */
  judgedBy: string;
}

interface Judged {
  variant: Variant;
  scores: Scores;
  /** The taste lens's raw autopsy — kept whole because reviseTop() writes from `oneFix`. */
  eye: HumanEyeVerdict;
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
 * THE DEATH LOG — the autopsies the taste lens has already written, fed back to the writer.
 *
 * The lessons store (CLAUDE.md §4) captures what the OWNER rules on. Nothing captured what the
 * human-eye lens learns, and it learns constantly and precisely: "dies at 6.8s — 'saare 18
 * personal hours' sounds like marketing copy, not him", "13s — draft metaphor abandoned; feels
 * like a different ad took over". Twenty of those accumulated in SQLite across four batches while
 * the writer went on making the same mistakes, because nothing ever showed them to it.
 *
 * Hooks are included so the writer can see WHICH line drew the verdict, and the query is scoped to
 * taste rejections — a mechanical reject ("7 words in 3s") teaches nothing about writing.
 */
function recentDeaths(limit = 14): { hook: string; reason: string }[] {
  try {
    return db()
      .prepare(
        `SELECT hook_text, rejection_reason FROM creative_variants
          WHERE rejection_reason IS NOT NULL
            AND (rejection_reason LIKE '%human eye%' OR rejection_reason LIKE '%HUMAN EYE%' OR rejection_reason LIKE '%hostile reviewer%')
          ORDER BY id DESC LIMIT ?`,
      )
      .all(limit)
      .map((r: any) => ({ hook: String(r.hook_text ?? ''), reason: String(r.rejection_reason ?? '') }))
      .filter((r) => r.hook && r.reason);
  } catch {
    return [];
  }
}

function deathBlock(deaths: { hook: string; reason: string }[]): string {
  if (!deaths.length) return '';
  const rows = deaths
    .map((d) => `- "${d.hook}" → ${d.reason.replace(/\s+/g, ' ').slice(0, 200)}`)
    .join('\n');
  return `THE LAST DRAFTS THAT DIED, AND THE EXACT SECOND THEY DIED AT.
These are real verdicts from the viewer-reviewer and the hostile reviewer on scripts written to this same brief, in their own words. They are not style notes — every one of them is a reel that cost nothing because it was killed before it was made. Read them as a list of the specific ways this brief goes wrong, and do not hand back the same defect with different nouns.
${rows}

Notice what almost all of them have in common: the writing stopped being a person and started being the product, and the reviewer could name the exact word where it happened. That word is usually in a line ABOUT the product rather than about the moment.
`;
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
/**
 * WHICH ENGINE ACTUALLY ANSWERED EACH STAGE — judge provenance, recorded because it changed
 * underneath us without anyone noticing.
 *
 * brain() walks a tier list, so the model behind a stage is whichever CLI happened to be healthy.
 * On 2026-08-17 the owner's claude login expired mid-day; every human-eye call before ~17:54 UTC
 * was answered by claude and every one after it fell through to codex. The taste score is the exit
 * criterion for this whole loop, and for several hours "human eye 76" and "human eye 71" were two
 * different reviewers' opinions being compared as if they were one reviewer's trend. Nothing in
 * the artifact said so.
 *
 * The score is now stamped with the engine that produced it. A number without its judge is not a
 * measurement, and round-over-round comparison across a change of judge is not evidence.
 */
const stageCli = new Map<string, string>();

async function brainOnce(prompt: string, tier: Tier, stage: string): Promise<string | null> {
  const t0 = Date.now();
  try {
    const res = await Promise.race([
      brain(prompt, { tier, loop: `creative:${stage}` }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`stage deadline ${STAGE_DEADLINE_MS}ms exceeded`)), STAGE_DEADLINE_MS).unref()),
    ]);
    stageCli.set(stage, res.cli);
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

AN ANGLE IS A MOMENT, NOT A SHOT PLAN. THIS COST A WHOLE BATCH, SO IT IS A HARD RULE.
On 2026-08-19 an angle came back reading "a late 5.5-second wordless hold compares Saturday 6:20 pm and Sunday 10:10 am... He closes aloud, 'Proposal poochhne se pehle VedicHour dekho.' End card: vedichour.com/sample-report, NEWUSER30, 30% off first paid report". The writer treated that as the brief and obeyed it over the format spec, and ALL SIX variants were destroyed by one number: the hold ceiling is 4s, and the angle had ordered 5.5.
You do not know the format. You are not being asked for it. Shot counts, durations, second-by-second timing, which beat the product lands on, the closing line, the end card, the URL, discount codes and taglines are ALL decided downstream by a spec you cannot see and that changes without telling you. Any of them in your output is not extra detail, it is an instruction that overrides a rule you do not know exists.
So the angle is ONE LINE describing the human moment and the decision inside it — who, what happened, and what he is deciding WHEN to do. Nothing about how it is filmed.
  GOOD: "The ring is bought and the receipt keeps nearly being found; he is deciding which evening to actually ask."
  BAD:  anything containing a number of seconds, a shot list, a closing line, an end card, a promo code, or the word VedicHour.

Return exactly ${count} ideas as STRICT JSON — an array, nothing before or after it, no markdown fences:
[{"id":"kebab-case-slug","family":"decision_moment|cost_time_anchor|respectful_contrarian","angle":"<the creative angle in one line — the MOMENT only, never seconds, shots, a closing line or an end card>","decisionMoment":"<the concrete moment; Hinglish in Latin letters if it is a spoken line>","whyItStops":"<why a scrolling viewer stops inside the first second, max 20 words>","hookFamily":"<one of the six>","decisionDomain":"<one of the seven>","emotionalRegister":"<one of the four>","durationTargetSec":22,"explore":false}]`;
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
function reservedSlots(count: number, hasEvidence: boolean): number {
  if (count <= 1) return 0;
  // AND NOTHING IS RESERVED UNTIL THERE IS SOMETHING TO BE BIASED BY.
  //
  // The bandit exists to stop one lucky early result monopolising the engine. With zero posted
  // reels carrying stats there IS no early result: exploration is collecting evidence for a
  // feedback loop that does not yet exist, and it is not free. On 2026-08-17 the floor of one, at
  // count 2, made HALF the batch explore and spent that half on the least-tested combination —
  // which was study/exam timing, the exact low-stakes domain the seeds file tells the writer
  // nobody loses sleep over. That is a real reel's worth of capacity bought with nothing.
  if (!hasEvidence) return 0;
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
  hasEvidence: boolean,
): { chosen: Idea[]; exploreChosen: number; reserved: number } {
  const reserved = reservedSlots(count, hasEvidence);
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

AND THEN THE FIX FOR THAT FIX, which is why this block has changed again. "Product by shot 2" was right; what it produced was not. Shot 2 became a four-second product demo with a synthesized voice explaining a feature over it, parked three seconds into a confession — and the viewer-reviewer killed draft after draft in these exact words: "product screen breaks emotional setup before tension peaks", "product screen after stairwell scene feels like an ad pivot", "same amber-room-presenter-then-screen pattern; I've already seen this reel". A commercial interrupted a story, and the story never came back.

AND THEN THE FIX FOR THAT FIX'S FIX, which is the newest law on this page and it OVERRIDES anything below that contradicts it. The format used to require TWO product beats. It was measured, on 2026-08-18, with a controlled experiment: the same words, the same reviewer, one call, three shapes.
  A. two product beats, wordless — the shape this brief demanded for two months. Human eye 55. REJECT.
  B. the same, plus the audio carrying across the cut. Human eye 62. REJECT.
  C. ONE product beat, late, arriving as the answer to a question the reel had already made the viewer ask. Human eye 76. KEEP — the first keep in sixty-plus variants.
Twenty-one points, bought by DELETING a shot. The second screen was never proof, it was interruption; showing the product twice was the reason a screen always had to cut in before the story had said anything worth answering.

So: ONE product beat is the default, and it is the payoff.
  A HOLD is the PAYOFF. Late in the reel, after he has said the thing that makes you want it, the screen gets ${PRODUCT_HOLD_MIN_SEC}-${PRODUCT_HOLD_MAX_SEC} seconds to be read, and NOBODY says anything over it. Every reel has exactly one.
  AN INSERT is a GLANCE, and it is now OPTIONAL. One or two seconds, no words, cut INSIDE an early sentence. Take it only if the reel is genuinely better with it — and it usually is not, because the whole 21-point gap above is what happens when you take it out. If you do take it, it comes early, it is a DIFFERENT capture from the hold, and the hold still comes last.

THE SPINE — ${SHOTS_MIN} to ${SHOTS_MAX} shots, ${REEL_SEC_MIN}-${REEL_SEC_MAX} seconds total. Write THIS unless you have a reason:
  1. presenter, at most ${FIRST_SHOT_MAX_SEC}s — THE COLD OPEN (see below).
  2. presenter, up to ${LONG_BEAT_MAX_SEC}s — THE REMEMBERED DETAIL (see below).
  3. presenter, ~4s — THE TURN (see below).
  4. screencap, ${MIN_PRODUCT_SEC}-${PRODUCT_HOLD_MAX_SEC}s — THE HOLD. The only screen in the reel, and it answers what he just asked.
  5. presenter, ~4s — the close, on his face, saying the brand name.
That is 5 shots and ~22 seconds and it is the shape that scored 76. The 6-shot version with an early insert is legal and is what the numbered notes below describe; it is not the default any more.

THE BEATS IN DETAIL — ${SHOTS_MIN} to ${SHOTS_MAX} shots, ${REEL_SEC_MIN}-${REEL_SEC_MAX} seconds total:
  1. presenter, at most ${FIRST_SHOT_MAX_SEC}s — THE COLD OPEN. He is already mid-thought, answering the question the hook asks. NO greeting, NO "kya aapko pata hai", NO "aaj main baat karunga", NO setup of any kind. If the line would work as the SECOND sentence of a conversation, it is right; if it would work as the first, it is warm-up and you must delete it.
     BUT MID-THOUGHT IS NOT THE SAME AS EMPTY, and this is where the last batch died. "Haan, isi baat pe atka hoon" is mid-thought and it is worthless: stuck on WHICH thing? The viewer has no antecedent, so the one second you get is spent parsing. The cold open must be a COMPLETE sentence that a total stranger understands on its own, with the actual subject named in it. "Teen hafte se yeh message draft mein pada hai." — mid-thought AND complete. That is the bar.
     THE COLD OPEN IS ABOUT THE MOMENT, NOT ABOUT US. It may not name the product, the site, an app, a chart, a report or a score — those words in the first three seconds are a company clearing its throat, and the viewer is gone. It is the sentence the VIEWER has said in their own head. Say the human thing first; the product answers it a beat later, on screen, where it is far more convincing than a claim.
  2. presenter, up to ${LONG_BEAT_MAX_SEC}s — THE REMEMBERED DETAIL. The one long beat in the reel, and it comes BEFORE the product, not after. This is the real, specific thing that actually happened, said in full with its specifics intact. Only one shot in the reel may run this long.
     WHY THE BEST LINE MOVED IN FRONT OF THE PRODUCT, because this is the correction that matters most and the evidence for it is the most one-sided this engine has produced. The product used to be nailed to shot 2. The viewer-reviewer killed TWENTY-FOUR consecutive variants at the 3-second mark for it. The product was then moved to shot 3, and the reviewer killed twelve more at the 7-second mark — same sentence, new timestamp: "unexplained product grid interrupts the surname conflict before its consequence lands", "the grid arrives ON SCHEDULE, not because the story needs it", "the product interrupts before the genuinely human mic-mute detail arrives".
     Read that last one again, because it is the whole diagnosis. The format was putting the reel's BEST LINE after its first product shot, every single time, by construction. So the screen always cut in on the way to the good part instead of arriving because of it. Moving the screen later did not fix that; it just moved the complaint later. The fix is to move the GOOD PART EARLIER.
     So: he says the thing that only a real person could have said, in full, and THEN the screen answers it. The rule is THE PRODUCT ARRIVES THE MOMENT THE VIEWER WANTS IT, NEVER BEFORE — and nobody wants it until they have heard something worth answering.
  3. presenter, ~4s — THE TURN. Still him, no cut away: the same moment, but now he knows when. This is where the reel stops being a complaint and becomes a decision, and it is the line the screen is about to answer.
  4. screencap, ${MIN_PRODUCT_SEC}-${PRODUCT_HOLD_MAX_SEC}s — THE HOLD. The screen answers the question he just asked, and NOBODY EXPLAINS IT. This is the punchline of the reel and, by default, the ONLY time the product is on screen.
     THE HOLD MUST BE LEGIBLE AND IT MUST CONTRAST. A reviewer killed a whole batch over this: "the payoff scrolls 18 tiny windows but never holds two contrasting cards long enough to prove the claim", "the payoff is an unreadable grid scroll instead of two legible contrasting windows". Four seconds of a moving list on a phone proves nothing — the viewer cannot read a single row of it, so the one shot that was supposed to be evidence becomes wallpaper. The HOLD is STILL, and it shows TWO specific hours for the same task, one clearer and one heavier, close enough to read. It runs at least ${MIN_PRODUCT_SEC}s precisely because it is the only look the viewer gets: it has to be long enough to actually read.
     IT MUST FOLLOW A PRESENTER SHOT, always. The hold works because it is a REPLY — he asks, the screen answers, wordlessly. A screen that follows an atmosphere shot is answering nobody.
  last. presenter — closes, says the brand name out loud, and lands on the thing the cold open opened.

  OPTIONAL, AND ONLY IF IT GENUINELY EARNS ITSELF: an INSERT — one screencap of at most ${FIRST_PRODUCT_MAX_SEC}s, wordless, at shot 2 or shot 3, cut inside a sentence. It buys ONE thing: scale, the day going past in hour slots so the viewer registers in a glance that this is a whole real day and not a horoscope. It costs the reel the 21 points measured above, so take it only when the cold open ALREADY asks something a screen can answer, all by itself, to a stranger with zero context. "Aaj girlfriend ka naam lunga" qualifies. Almost nothing else does, and thirty-six rejections say guess the other way. If you take it: it starts by second ${PROOF_STARTS_BY_SEC}, only presenter shots may stand in front of it, it must be a DIFFERENT capture from the hold, and the hold still comes last and still runs ${PRODUCT_HOLD_MIN_SEC}s or more.

THE RULES THAT ARE CHECKED MECHANICALLY (a variant that breaks one is rejected before it costs anything):
- ${SHOTS_MIN}-${SHOTS_MAX} shots. ${REEL_SEC_MIN}-${REEL_SEC_MAX}s total. Not 4 long shots — ${SHOTS_MIN}+ short ones.
- Shot 1 is a presenter shot of at most ${FIRST_SHOT_MAX_SEC}s. The last shot is a presenter shot.
- No shot may run longer than ${SHOT_MAX_SEC}s, except exactly ONE presenter beat which may reach ${LONG_BEAT_MAX_SEC}s and the ONE product HOLD which may reach ${PRODUCT_HOLD_MAX_SEC}s. A b-roll shot may never exceed ${SHOT_MAX_SEC}s.
- At least ${MIN_PRODUCT_SHOTS} screencap shot, at least ${MIN_PRODUCT_SEC}s of product on screen in total.
- THE LAST screencap shot is the HOLD and runs ${PRODUCT_HOLD_MIN_SEC}s or more, always.
- IF THE REEL HAS ONE SCREENCAP: it starts no earlier than 40% of the way through the reel and no later than second ${SOLE_PRODUCT_STARTS_BY_SEC}, and the shot immediately before it is a presenter shot. A single screen at second three is an insert with the payoff deleted and is rejected.
- IF THE REEL HAS TWO OR MORE: the first is the insert — at most ${FIRST_PRODUCT_MAX_SEC}s, arriving by shot ${PROOF_BY_SHOT_MAX} and by second ${PROOF_STARTS_BY_SEC}, with only presenter shots in front of it.
- At least ${MIN_PRESENTER_SHOTS} presenter shots, and at least ${MIN_ADJACENT_PRESENTER_PAIRS} pair of them must be ADJACENT — two presenter shots back to back, no product screen between them. A reel that alternates face/screen/face/screen the whole way through is a metronome, and the reviewer has already thrown one out as "I've already seen this reel".
- At most ${MAX_BROLL_SHOTS} broll shot in the whole reel, and it is optional — prefer zero.
- NOBODY NARRATES. ${MAX_NARRATED_SHOTS === 0 ? 'ZERO' : String(MAX_NARRATED_SHOTS)} shots may carry an off-camera line: ${Math.round(NATIVE_RATIO_FLOOR * 100)}% of the spoken words are said by the presenter, on camera. A screencap or b-roll shot carries NO line at all — leave "narration" empty or omit it.
  THIS IS NOT A LIMITATION, IT IS THE TECHNIQUE. A music bed runs unbroken under the whole reel, so a wordless product beat is not dead air — it is a cut, with the score still running, and the viewer reading the screen for themselves. Every time a previous draft put a voice over the product it produced a sentence like "Har ghanta samjhaya hai" or "Tumhara poora din yahan hai" — a feature bullet wearing a Hindi coat, in a second, obviously synthetic voice, at the most fragile moment of the reel. Say nothing. The screen is more convincing than the sentence you were going to write over it.

WHY SO LITTLE B-ROLL. Generic atmosphere footage is what makes an ad look cheap: it is the visual equivalent of clearing your throat, and it is where a generated shot quietly turns your words into props. A face and a real screen, cut tightly against each other, is what a funded company's ad looks like. If you use your one b-roll shot, it must show the ACTUAL human moment of the script — the same man, same clothes, same light, doing the real thing the words describe — never an illustration of the idea.

EVERY SPOKEN LINE MUST BE A SENTENCE A PERSON WOULD SAY OUT LOUD. This is where the last four drafts died, so read this twice. Lines a viewer-reviewer actually threw out, with what he said about them:
- "Farq personal birth chart fit ka." and "Real data, simple what-to-do line." — product bullets with the punctuation of speech.
- "…birth chart se rate hote hain" — "that is the product deck talking, not him."
- "real astronomical data, wahi math jo careful astrologer use karta hai" — "a press release, not a person." THAT PHRASE IS FOR CAPTIONS AND THE DESCRIPTION, NEVER FOR A PRESENTER'S MOUTH. If he needs credibility on camera he says it his own way, in five words, or he does not say it at all — the product on screen is the credibility.
- "yahaan clearer, wahaan heavier" recited as a feature — "the fourth reel making the same point."
Test: read the line aloud. If it is a noun phrase, a feature, or something that could only appear on a landing page, rewrite it as what a friend would actually say. Not "Farq personal birth chart fit ka" but "Tera chart alag hai, mera alag." Not "Real data, simple what-to-do line" but "Yahaan likha hai kis ghante mein kya karna hai."

LEAD WITH YOUR BEST LINE. THE COLD OPEN IS THE CONSEQUENCE, NOT THE PLAN. This is now the most common way these scripts fail, and the viewer-reviewer has said it in almost the same words on every batch:
- "Best detail — midnight paragraph sent, deleted by morning — is buried at shot 3, not earning hook duty."
- "Move 'late utha, revision aadha reh gaya' to second 1, then earn the screen."
- "'Chaar baar same paragraph' is the hook; make it line one."
- "Lead with '11:40 pe kiya; kal?' — earn the timing screen after that."
- "'Teen hafton baad call karunga' is a plan, not a hook; gone." / "'timing choose karunga' is a plan."
Every one of those scripts had a real, specific, human line in it — and put it THIRD, behind a sentence announcing what the person intends to do. Announcing an intention is not a hook: nothing has happened yet, so there is nothing to be curious about, and the product screen that follows arrives before the viewer cares about this person at all. That is why the reviewer keeps saying the screen has not been "earned".
So: write the whole script, find the line only a real person could have written, and MOVE IT TO SHOT ONE. Then rebuild the rest around it.
A stated intention CAN open a reel, but only when the intention is itself the shocking specific thing — "Aaj girlfriend ka naam lunga" works because saying her name at home IS the event. "Teen hafton baad call karunga" does not, because the event is still hypothetical. If you cannot tell which one you have written, assume it is the second and lead with the consequence instead.

START FROM ONE REMEMBERED DETAIL AND BUILD THE WHOLE REEL OUT OF IT. This is the most important instruction on this page and it changes the ORDER in which you work.

Every good line these scripts have ever produced was a specific thing that happened to a specific person on a specific day:
  "Last month Mummy ne rishta photo bheja; main sirf topic badalta raha."
  "Last Diwali seedha bol diya tha; Mummy poori shaam relatives mein busy thi."
Nobody could have invented either of those from a brief. They have a real evening in them. And every script that contained one of them scored well ON THAT LINE and was marked down for everything around it — because the line was found late, dropped into a slot, and surrounded by copy.

So do not assemble six beats and hope one of them lands. Work in this order instead:
  1. BEFORE YOU WRITE ANY SHOTS, invent ONE remembered detail: a real moment, with a person in it, a time or a date attached, and something small and slightly embarrassing that actually occurred. Not a feeling — an event. "Mummy ne rishta photo bheja aur maine topic badal diya" is an event. "Main nervous tha" is not. It should be the kind of thing you would only know if you had been there.
  2. Now ask what that moment is EVIDENCE OF. Someone guessed a moment wrong. That is the reel.
  3. THE COLD OPEN IS THAT DETAIL'S CONSEQUENCE — what he has decided to do about it today, or the sentence he is in the middle of because of it.
  4. THE DETAIL ITSELF IS SHOT 2 — the long beat, said plainly, once, with the specifics intact, BEFORE any product screen. Do not summarise it and do not explain what it means. It is the reason the screen that follows is worth looking at.
  5. THE TURN AND THE CLOSE ARE THE SAME MOMENT, DIFFERENT OUTCOME. He is doing the thing again — but this time he knows when.
Every one of the four spoken lines belongs to that one moment. If a line you have written would fit equally well in a reel about a different detail, it is filler and you must rewrite it or cut it. Four lines from one real evening beats one good line surrounded by product copy, and that gap is the entire distance between the scripts that get rejected and the one that does not.

THE LAST LINE MUST LAND ON THE FIRST. The closing beat is not a place to park the website — it is the payoff of the sentence the reel opened with. If the cold open was "Teen hafte se yeh message draft mein pada hai", the close is about THAT message, and it is better if it is quieter than the opening rather than louder. A closing line that would fit equally well on the end of any other reel we have written is a failed closing line.

SAY THE BRAND NAME. DO NOT READ OUT A URL. This changed on 2026-08-18 and it is the second half of the same correction.
The owner's law is unchanged and it stands: the closing line MUST say the name out loud, because half this audience is LISTENING with their eyes elsewhere and his words are "people who are listening to the reel will figure out, Oh, I found this new platform, VedicHour." A reel that only shows the name on a card reaches nobody who is listening.
What changed is WHICH WORDS. He says "VedicHour". He does not say "dot com". Nobody speaks a URL out loud in a sentence, and every closing line that tried read as an ad the instant it arrived: "VedicHour.com pe time dekh liya", "VedicHour.com dekhkar reply bhejunga", "Birthday message VedicHour.com dekhkar hi bhejunga" — all three were marked as translated ad-copy. The full vedichour.com is on the end card, in writing, where a URL belongs.
So: "VedicHour pe dekh liya tha." "VedicHour kholi thi raat ko." "Aaj nahi. Kal subah. VedicHour pe dekha." Land the human sentence first, then the name, almost as an afterthought, as a separate short clause. The name is still the last thing the viewer hears, which is the entire point — it just stops sounding like an ad read the moment it stops being a web address.

  AND HE IS NOT ALLOWED TO TELL ANYONE TO GO THERE. THIS IS NOW A HARD REJECT, CHECKED MECHANICALLY, and it is the single most expensive mistake on this page: on 2026-08-18 it killed the FIVE best scripts of the day, and nothing else was wrong with any of them. The viewer-reviewer, on the five highest taste scores in the batch, in his own words — "I got the payoff; the brand CTA adds nothing." / "the mandatory-sounding CTA kills the chai payoff." / "the generic VedicHour instruction wastes the stairwell story's payoff." / "the generic brand CTA interrupts a satisfying resolution." / "the stiff branded instruction turns a private moment into an ad."
  The law says a LISTENER MUST HEAR THE NAME. It has never said the reel must issue an order. Those are different sentences and only one of them is an ad read.
  So the closing line is FIRST PERSON, PAST TENSE, about what HE did — and the name is a fact inside his own sentence, not a summons pointed at the viewer:
    RIGHT: "Aaj nahi. Kal subah. VedicHour pe dekha." · "Poochne se pehle VedicHour kholi thi." · "Iss baar pehle dekh liya. VedicHour pe."
    REJECTED, MECHANICALLY, EVERY TIME: anything containing "dekh lo", "dekho", "khol lo", "try karo", "check karo", "download karo", "sign up", "visit" — or the words "tum", "tumhara", "aap", "aapko", "your". The moment the last line changes person from HIM to YOU, the film ends and a commercial starts, and the viewer feels the seam.
  Say what he did. The viewer can work out that he did it somewhere.

  NOW COUNT THE WORDS, BECAUSE THIS INSTRUCTION HAS ALREADY DESTROYED A WHOLE BATCH. Asked for two clauses, the writer produced ELEVEN WORDS in a 4-second closing shot — in all six variants of one idea — and every one of them was rejected before it cost anything, for a budget of 9. Two clauses means SHORTER clauses, not a longer line. A 4s closing shot holds NINE WORDS TOTAL and the site name spends one of them:
    "Aaj nahi. Kal subah. VedicHour." — 5 words. Fits, and it lands on the opening.
    "Baat toh karni hi hai. VedicHour pe dekha." — 8 words. Fits.
    "Iss baar time soch ke bolunga, aur VedicHour pe dekh bhi liya." — 12 words. REJECTED, never rendered, idea wasted.
  Write the closing line, count it on your fingers, and cut it until it fits. Short is better here anyway: the quietest line in the reel should be the last one.

DO NOT WRITE THE SAME REEL SIX TIMES. The reviewer's exact complaint on the last batch: "same amber-room-presenter-then-screen pattern; I've already seen this reel." The MAN is fixed — same face, same clothes, that is brand law and it does not change. Everything else must not be: each variant picks its own room and hour (kitchen at night, balcony at first light, parked car, empty office at 8pm, stairwell), its own physical action (not sitting and talking — pouring tea and stopping, standing up mid-thought, putting the phone face-down), and its own shot sizes. Within one reel, three identical medium close-ups of a man in a booth is a slideshow of one shot.

THE TEST TO APPLY TO YOUR OWN DRAFT, honestly: play it in your head at 11pm, muted, thumb ready. At second 1, is anything happening? By the time the first screen appears, have you heard something that makes you WANT it - a real remembered thing, not a set-up? And is that screen answering it rather than interrupting it? If the answer to any of those is no, the draft is dead and you should write a different one.`;
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
So: EVERY WORD IN THIS REEL IS SAID BY THE PRESENTER, ON CAMERA. There is no narrator. There is no second voice. Synthesized narration has been removed from this format completely.
- Use ${MIN_PRESENTER_SHOTS} OR MORE presenter shots, and at least ${MIN_ADJACENT_PRESENTER_PAIRS} pair of them must run BACK TO BACK with no product screen in between, so one thought can carry across two shots.
- THE PRESENTER IS A RECURRING BRAND FACE, not a fresh casting each time: always a warm, natural young Indian MAN in his late twenties, softly lit, at home or in a cafe. Describe him that way in every presenter and person-carrying b-roll shot. A viewer who meets the same face across reels starts recognising VedicHour.
- THE MIDDLE SHOTS (screencap / broll) SAY NOTHING. Leave their "narration" empty or omit the field. A music bed runs unbroken under the entire reel, so a wordless beat is not a broken file — it is a cut, and the viewer reads the screen themselves.
- If you feel a product shot needs a line to explain it, the line is wrong, not the shot. Either the presenter says it on camera BEFORE the cut, or the screen was not showing the right thing. Every narration line these scripts have ever produced turned out to be a feature bullet in a Hindi coat ("Har ghanta samjhaya hai", "Tumhara poora din yahan hai", "birth chart se rate hote hain") and every one of them was killed by a reviewer. Do not write another.

THE IDEA ABOVE IS A MOMENT, NOT A BRIEF FOR HOW TO FILM IT. If the angle or decision moment names a number of seconds, a shot count, where the product lands, a closing line, an end card or a URL, IGNORE ALL OF IT — the ideation stage does not know this format and has no authority over it. On 2026-08-19 an angle said "a late 5.5-second wordless hold" and all six variants were thrown away against a 4-second ceiling. The FORMAT SPEC below is the only source of truth for structure and timing.

${formatSpecBlock()}

${deathBlock(recentDeaths())}
${LITERALISM_BAN_BLOCK}

PER-FIELD SPEC — follow exactly (the WHY behind these lives in the playbook above, which is versioned and dated; what follows is the mechanical contract):
- hookText: the burned-in on-screen text of the FIRST frame. Maximum ${HOOK_MAX_WORDS} words — see the 1-second hook window in the playbook. Make it a moment or a question, not a slogan. It must be understood on ONE read by someone who knows nothing: if it has to be decoded, even cleverly, it has failed ("Diwali wali timing phir nahi" was marked down for exactly that — "needs a beat to parse").
  AND IT MUST NOT BE THE SAME SENTENCE HE SAYS. THIS IS NOW A HARD REJECT, CHECKED MECHANICALLY. A reviewer killed a variant because "presenter re-reads the title card instead of advancing the story", and a later script that scored 89 shipped the cold open verbatim as its hook card anyway. The hook and the cold open are two different pieces of information that arrive at the same moment — reading one while hearing the other is what makes the first second feel dense. If 80% of the hook's words are also in the first spoken line, the variant is thrown away before it costs anything.
  AND SHOT 2 MAY NOT SAY SHOT 1 AGAIN, also a hard reject. The long beat exists to ADD the specifics three seconds could not carry — who, when, what was actually said. "Savings poochi. Maine menu khol diya." followed by "Friday dinner pe usne savings poochi; maine menu teen baar khola" is one sentence stretched over eight seconds, and it is the most common way a good detail gets wasted.
- spokenScript: every spoken word in the reel, in order (all of it presenter dialogue — there is no narration), as one paragraph. Hinglish in Latin letters. ${REEL_SEC_MIN}-${REEL_SEC_MAX} seconds read aloud — that is ${SCRIPT_WORDS_MIN} to ${SCRIPT_WORDS_MAX} words. Conversational, like a friend texting you back, not an ad. Fewer words than you think: the product on screen is doing half the talking.
- shotList: ${SHOTS_MIN} to ${SHOTS_MAX} shots, following the FORMAT SPEC above exactly. Each: kind = "presenter" | "broll" | "screencap"; seconds (number); visualPrompt; PLUS the line for that shot:
  - presenter shots MUST carry "dialogue" — the exact words said on camera, Hinglish in Latin letters.
  - broll / screencap shots MUST carry NO LINE AT ALL: "narration": "". A line on a non-presenter shot is an automatic reject in this format. The music bed covers the beat; the screen does the talking.
  - HARD ARITHMETIC: spoken Hinglish runs ~${WORDS_PER_SECOND} words/second, so any shot's line must be at most (seconds x ${WORDS_PER_SECOND}) words, rounded DOWN. A 2s shot holds 4 words. A 3s shot holds 6. A 4s shot holds 9. A 5s shot holds 11. A 6s shot holds 13. Over that, the renderer cuts the line off mid-sentence and the reel is thrown away. Count the words in every single line before you return it.
  - presenter / broll → visualPrompt is a concrete cinematic prompt for a text-to-video model: SUBJECT, ACTION, CAMERA MOVE, LIGHTING, MOOD. It must be physically renderable — one clear subject, one clear action. Apply the playbook's "no legible screens" and "subject continuity" principles literally: no text-in-video, no logos, no crowds of faces, no readable UI; any screen in shot is described as "heavily out of focus, glowing softly, no legible characters"; NEVER ask for a logo, wordmark, brand lockup, title card, end card or text overlay — that is a HARD REJECT, because the model renders lettering as gibberish and the renderer already appends the branded end card itself after your last shot; and any person in a b-roll shot is described as "the same man as the presenter shot: young Indian man in his late twenties, same clothing, same time of day", matching the presenter shot's outfit and lighting exactly.
  - screencap → this is a REAL screen recording of the live product, so visualPrompt is simply WHAT TO CAPTURE, chosen from: ${s.screencapLibrary.map((x) => `"${x}"`).join('; ')}
  - SCREENCAP HARD RULE (owner, verbatim): "when it shows the platform scrolling, it should show the REPORT and not the payment section... how all slots are coming and tell you what to do at what time of day." Never ask to capture pricing, plans, checkout, payment or the signup/onboarding form. The screen we show is the report and its hour-slots.
  - SHOT 1 MUST BE kind "presenter", at most ${FIRST_SHOT_MAX_SEC} seconds, and it is a COLD OPEN — see the FORMAT SPEC above.
  - THE DEFAULT IS ONE "screencap", and it is the HOLD: ${MIN_PRODUCT_SEC}-${PRODUCT_HOLD_MAX_SEC} seconds, placed LATE (no earlier than 40% into the reel, no later than second ${SOLE_PRODUCT_STARTS_BY_SEC}), immediately after a presenter shot, never last. A second "screencap" is ALLOWED but never required, and only as an early INSERT of at most ${FIRST_PRODUCT_MAX_SEC} seconds arriving by shot ${PROOF_BY_SHOT_MAX} and by second ${PROOF_STARTS_BY_SEC}, with only presenter shots before it and a DIFFERENT capture from the hold. All hard rejects.
  - The LAST shot MUST be a presenter shot, so the reel closes on a face saying the closing line rather than on synthesized narration over a scroll.
  - THE CLOSING PRESENTER LINE MUST SAY THE BRAND NAME "VedicHour" OUT LOUD. This is a hard reject, not a preference. The owner, verbatim: "at the end there should be a call to action: Try VedicHour.com... because people who are listening to the reel will figure out, Oh, I found this new platform, VedicHour." Half this audience is LISTENING with their eyes somewhere else, so a CTA that only exists on screen reaches nobody. Put it in the final presenter shot's \`dialogue\`, in his own words, e.g. "…VedicHour pe dekh liya." or "…VedicHour, free hai." SAY THE NAME, NOT THE URL: he does not say "dot com" — the full vedichour.com is on the branded end card the renderer appends, in writing, where a web address belongs. Budget the words: the name costs 1 of that shot's word allowance, so keep the rest of the closing line short.
  - Every variant needs at least ${MIN_PRODUCT_SHOTS} screencap shot totalling at least ${MIN_PRODUCT_SEC}s. Shot seconds must sum to ${REEL_SEC_MIN}-${REEL_SEC_MAX}s.
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
[{"hookText":"...","spokenScript":"...","shotList":[{"kind":"presenter","seconds":3,"visualPrompt":"...","dialogue":"<cold open: one complete sentence a stranger understands, max 6 words>"},{"kind":"presenter","seconds":5,"visualPrompt":"<same man, same place, DIFFERENT shot size>","dialogue":"<THE REMEMBERED DETAIL, in full, specifics intact — the best line in the reel, and it comes BEFORE any product screen>"},{"kind":"presenter","seconds":4,"visualPrompt":"...","dialogue":"<the turn — same moment, but now he knows when>"},{"kind":"screencap","seconds":5,"visualPrompt":"<THE HOLD, the only screen in the reel: two hours for the same task side by side, one lighter one heavier, held still and readable>","narration":""},{"kind":"presenter","seconds":4,"visualPrompt":"...","dialogue":"<lands on the cold open, and says VedicHour — the name, not the URL>"}],"onScreenCaptions":["..."],"cta":"...","hashtags":["#..."],"youtubeTitle":"...","youtubeDescription":"...","language":"hinglish","hookFamily":"${idea.tags.hookFamily}","decisionDomain":"${idea.tags.decisionDomain}","emotionalRegister":"${idea.tags.emotionalRegister}","durationTargetSec":${idea.tags.durationTargetSec}}]`;
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

  // THE EARNED PROOF DEADLINE. The product lands at shot 2 or shot 3 — see PROOF_BY_SHOT_MAX for
  // why the fixed slot was retired. Whichever the writer picks, two things stay true: nothing but
  // the presenter may delay it (a b-roll shot buying time before the proof is the slop path), and
  // it must START by PROOF_STARTS_BY_SEC, which is what stops "earned" from becoming "eventually".
  const firstProductIdx = shots.findIndex((sh) => sh.kind === 'screencap');
  if (firstProductIdx < 0) return 'no product shot at all — the reel has no proof in it';
  const productCount = shots.filter((sh) => sh.kind === 'screencap').length;
  // The early deadline is the INSERT's deadline, so it only binds a reel that chose to have an
  // insert. A one-beat reel has no insert to be late — its single beat is the HOLD, and where a
  // hold belongs is late, which is checked on its own terms below.
  if (productCount > 1) {
    if (firstProductIdx + 1 > PROOF_BY_SHOT_MAX)
      return `the product first appears at shot ${firstProductIdx + 1} — an INSERT must arrive by shot ${PROOF_BY_SHOT_MAX}. Shot 2 if the cold open already asks a question; shot 3 if it needed one more beat to become one. If you meant the screen to arrive later than that, write ONE product beat and make it the hold`;
    const proofStartsAt = shots.slice(0, firstProductIdx).reduce((n, sh) => n + (sh.seconds || 0), 0);
    if (proofStartsAt > PROOF_STARTS_BY_SEC)
      return `the insert does not appear until second ${proofStartsAt.toFixed(1)} — the ceiling for a FIRST-of-two product beat is ${PROOF_STARTS_BY_SEC}s. A glance this late is neither a glance nor a payoff; either move it forward or drop it and let the hold carry the proof alone`;
    for (let i = 1; i < firstProductIdx; i++) {
      if (shots[i].kind !== 'presenter')
        return `shot ${i + 1} is a ${shots[i].kind} shot standing between the cold open and the insert — only the presenter may delay the product, and only to earn it. B-roll here is the throat-clearing this format exists to delete`;
    }
  }

  if (shots[shots.length - 1].kind !== 'presenter')
    return `closes on a ${shots[shots.length - 1].kind} shot — the reel must end on a face saying the site out loud`;

  // TWO SHOTS MAY PAUSE FOR BREATH: one presenter beat (the remembered detail) and one product
  // beat (the hold). Nothing else may, and a b-roll shot never may — a long atmosphere shot is
  // the single most reliable way to make a reel look cheap.
  const longPresenters = shots.filter((sh) => sh.kind === 'presenter' && (sh.seconds || 0) > SHOT_MAX_SEC);
  const longProduct = shots.filter((sh) => sh.kind === 'screencap' && (sh.seconds || 0) > SHOT_MAX_SEC);
  const longOther = shots.filter((sh) => sh.kind !== 'presenter' && sh.kind !== 'screencap' && (sh.seconds || 0) > SHOT_MAX_SEC);
  if (longOther.length)
    return `a ${longOther[0].kind} shot runs ${longOther[0].seconds}s — only a presenter beat (${LONG_BEAT_MAX_SEC}s) or the product hold (${PRODUCT_HOLD_MAX_SEC}s) may exceed ${SHOT_MAX_SEC}s`;
  if (longPresenters.length > 1)
    return `${longPresenters.length} presenter shots run longer than ${SHOT_MAX_SEC}s — exactly one presenter beat may reach ${LONG_BEAT_MAX_SEC}s, and it is the remembered detail`;
  if (longPresenters.length === 1 && (longPresenters[0].seconds || 0) > LONG_BEAT_MAX_SEC)
    return `the long presenter beat is ${longPresenters[0].seconds}s — the ceiling is ${LONG_BEAT_MAX_SEC}s`;
  if (longProduct.length > 1)
    return `${longProduct.length} product shots run longer than ${SHOT_MAX_SEC}s — a reel has ONE hold, not two. Free footage is not a reason to show more of it`;
  if (longProduct.length === 1 && (longProduct[0].seconds || 0) > PRODUCT_HOLD_MAX_SEC)
    return `the product hold is ${longProduct[0].seconds}s — the ceiling is ${PRODUCT_HOLD_MAX_SEC}s`;

  const product = shots.filter((sh) => sh.kind === 'screencap');
  const productSec = product.reduce((n, sh) => n + (sh.seconds || 0), 0);
  if (product.length < MIN_PRODUCT_SHOTS)
    return `${product.length} product shot(s) — a reel with no proof in it is a man talking; at least ${MIN_PRODUCT_SHOTS} screencap shot, and screencaps are free`;
  if (productSec < MIN_PRODUCT_SEC) return `only ${productSec}s of product on screen — the floor is ${MIN_PRODUCT_SEC}s`;

  // THE HOLD is the last product beat, and it is the payoff. This is the only product rule that
  // binds every reel: whatever else happens, one screen gets long enough to actually be read.
  const hold = product[product.length - 1];
  if ((hold.seconds || 0) < PRODUCT_HOLD_MIN_SEC)
    return `the last product shot is ${hold.seconds}s — the HOLD must run at least ${PRODUCT_HOLD_MIN_SEC}s and be the payoff of the reel, not another flash. Four seconds of scrolling proves nothing; two hours side by side, held still, proves everything`;

  if (product.length === 1) {
    // ONE BEAT, AND IT IS THE ANSWER. A single screen at second three is the old insert with the
    // hold deleted — strictly worse than either shape, and the thing this relaxation must not
    // become. It has to land after the reel has made the viewer ask something.
    const total = shots.reduce((n, sh) => n + (sh.seconds || 0), 0);
    const startsAt = shots.slice(0, firstProductIdx).reduce((n, sh) => n + (sh.seconds || 0), 0);
    if (startsAt < total * SOLE_PRODUCT_MIN_START_FRAC)
      return `the reel's only product beat starts at second ${startsAt.toFixed(1)} of ${total} — a single screen this early is an insert with the hold deleted. One beat means it ARRIVES AS THE ANSWER, after the remembered detail and the turn, or you need two beats: a glance early and the hold late`;
    if (startsAt > SOLE_PRODUCT_STARTS_BY_SEC)
      return `the reel's only product beat does not start until second ${startsAt.toFixed(1)} — the ceiling is ${SOLE_PRODUCT_STARTS_BY_SEC}s. Late is the point; a talking head with a screenshot stapled to the end is the 29-second reel the owner threw out`;
    // It answers a SENTENCE. A single hold that follows an atmosphere shot is answering nothing —
    // the viewer has to have just heard the question for the screen to be the reply.
    if (shots[firstProductIdx - 1]?.kind !== 'presenter')
      return `the reel's only product beat follows a ${shots[firstProductIdx - 1]?.kind} shot — one late hold works because it ANSWERS the line said immediately before it. Put the presenter's question directly in front of it`;
  } else {
    // THE INSERT. Only meaningful when a second beat exists: a glance cut inside his sentence,
    // never a demo parked at second three ("product screen breaks emotional setup before tension
    // peaks").
    if ((product[0].seconds || 0) > FIRST_PRODUCT_MAX_SEC)
      return `the first of ${product.length} product shots is ${product[0].seconds}s — an INSERT is capped at ${FIRST_PRODUCT_MAX_SEC}s. A longer screen this early stops being a glance and becomes a demo; the lens has killed that as "product screen breaks emotional setup before tension peaks". Either shorten it to a glance, or delete it and let one late hold carry the proof`;
  }

  const presenters = shots.filter((sh) => sh.kind === 'presenter').length;
  if (presenters < MIN_PRESENTER_SHOTS)
    return `${presenters} presenter shot(s) — the format needs ${MIN_PRESENTER_SHOTS}+ short beats cut against the product, not two long ones bookending a silent middle`;

  // One unbroken run of human thought, so the reel is a cut and not a metronome.
  const adjacentPresenterPairs = shots.filter((sh, i) => i > 0 && sh.kind === 'presenter' && shots[i - 1].kind === 'presenter').length;
  if (adjacentPresenterPairs < MIN_ADJACENT_PRESENTER_PAIRS)
    return `the reel alternates face/screen/face/screen the whole way through — the lens calls that "I've already seen this reel". At least one pair of presenter shots must run BACK TO BACK, in two different shot sizes, so the real human beat has room to land without a product screen interrupting it`;

  const broll = shots.filter((sh) => sh.kind === 'broll').length;
  if (broll > MAX_BROLL_SHOTS)
    return `${broll} b-roll shots — at most ${MAX_BROLL_SHOTS}; generic atmosphere footage is what makes an ad look cheap`;

  return null;
}

/**
 * ────────────────────────────────────────────────────────────────────────────────────────────
 * THE THREE THINGS THE PROMPT ALREADY FORBIDS AND NOTHING WAS CHECKING. Added 2026-08-18.
 * ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The first batch written under the one-beat format produced a survivor that scored 89 total and
 * 82 human eye — above every bar this loop has — and it was still not a reel I would defend:
 *   1. hookText was the SAME SENTENCE as the cold open, word for word. The prompt says "IT MUST
 *      NOT BE THE SAME SENTENCE HE SAYS" and cites a reviewer killing a variant for exactly it.
 *   2. the reel's one long beat then RESTATED the cold open ("Savings poochi. Maine menu khol
 *      diya." -> "Friday dinner pe usne savings poochi; maine menu teen baar khola."). Eight of
 *      twenty seconds spent saying one thing three times. The taste lens's own oneFix was "cut
 *      the repeated savings line" — it saw it, scored 82 anyway, and passed it through.
 *   3. the closing presenter shot asked the video model for a "subtle premium brand lockup". The
 *      playbook forbids text and logos in generated shots because models render them as gibberish,
 *      and the renderer appends its own branded end card. Nothing blocked it.
 *
 * All three are plain text in the creative JSON, which is CLAUDE.md §1 exactly: a defect that is
 * decidable for $0 on the INPUT must not be left to a model's opinion on the output. A score is
 * not a gate — the lens saw defect 2 and passed it anyway.
 */

/** Hinglish + English function words. Dropped before comparing two lines for restatement. */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'you', 'was', 'are', 'but', 'not',
  'hai', 'hain', 'tha', 'thi', 'the', 'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'pe', 'par',
  'aur', 'ya', 'yeh', 'woh', 'main', 'maine', 'mera', 'meri', 'ne', 'hi', 'bhi', 'toh', 'nahi',
  'ab', 'phir', 'kya', 'kar', 'karna', 'raha', 'rahi', 'diya', 'liya', 'gaya',
]);

/** Content words of a spoken line: lowercase, punctuation stripped, 3+ letters, not a stopword. */
function contentWords(s: string): Set<string> {
  return new Set(
    (s ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

/** Share of `a`'s content words that also appear in `b`. 0 when `a` has nothing to compare. */
function overlapShare(a: string, b: string): { share: number; size: number; shared: string[] } {
  const A = contentWords(a);
  const B = contentWords(b);
  if (!A.size) return { share: 0, size: 0, shared: [] };
  const shared = [...A].filter((w) => B.has(w));
  return { share: shared.length / A.size, size: A.size, shared };
}

/** The hook and the cold open are two pieces of information arriving at once, not one twice. */
const HOOK_ECHO_MAX_SHARE = 0.8;
/** The long beat is the reel's best line. Saying the cold open again is not a best line. */
const RESTATEMENT_MAX_SHARE = 0.6;

/**
 * Burned-in branding or text requested inside a GENERATED shot. Video models render text as
 * gibberish, a paused frame of gibberish destroys credibility, and the renderer already appends a
 * branded end card — so every one of these is both unrenderable and redundant.
 */
const BURNED_IN_BRANDING = /\b(brand\s+lockup|lockup|logo|wordmark|watermark|end\s+card|title\s+card|lower\s+third|text\s+overlay|on-?screen\s+text|burned-?in\s+text|caption\s+overlay)\b/i;
/** "no logos", "without any wordmark", "never a title card" are the CORRECT phrasing, not a hit. */
const NEGATED_BEFORE = /\b(no|without|never|not|avoid|zero)\b[^.]{0,24}$/i;

function burnedInBrandingHit(shots: Shot[]): { shotIndex: number; excerpt: string } | null {
  for (let i = 0; i < shots.length; i++) {
    if (shots[i].kind === 'screencap') continue; // a real recording of the real site, logo and all
    const p = shots[i].visualPrompt ?? '';
    const m = BURNED_IN_BRANDING.exec(p);
    if (!m) continue;
    if (NEGATED_BEFORE.test(p.slice(0, m.index))) continue;
    return { shotIndex: i + 1, excerpt: p.slice(Math.max(0, m.index - 40), m.index + 50).trim() };
  }
  return null;
}

/**
 * Deterministic gates that need no model: script, length, shape. Cheap and unarguable.
 *
 * Exported for src/loops/format-spec.test.ts. The format spec is the most load-bearing logic in
 * this file and it is now strict enough that a mistake here would reject every variant a run
 * produces — 90 minutes of CLI time for an empty batch. The test asserts the canonical spine
 * PASSES, which is the property no amount of careful reading gives you.
 */
export function preflight(v: Variant): string | null {
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

  // THE COLD OPEN, checked as text. A first line that points at something the viewer cannot see
  // spends the only second the reel gets on parsing — see coldOpenDefect() for the evidence.
  const openDefect = coldOpenDefect(speechFor(v)[0] ?? '');
  if (openDefect) return openDefect;

  // THE HOOK AND THE COLD OPEN CARRY DIFFERENT INFORMATION. Burned-in text the viewer READS while
  // hearing the same words spoken is one beat's worth of content stretched over the only second
  // the reel gets. A reviewer already killed a variant as "presenter re-reads the title card
  // instead of advancing the story"; nothing enforced it until a 89/82 script did it verbatim.
  const spoken = speechFor(v);
  const echo = overlapShare(v.hookText, spoken[0] ?? '');
  if (echo.size >= 3 && echo.share >= HOOK_ECHO_MAX_SHARE)
    return `the hook card and the cold open are the same sentence ("${v.hookText}") — the viewer READS one while HEARING the other, so saying it twice wastes the densest second in the reel. Make the hook the question and the spoken line the answer, or the other way round, but never the same words`;

  // THE LONG BEAT IS THE BEST LINE IN THE REEL, NOT THE COLD OPEN AGAIN. The remembered detail
  // exists to add the specifics the cold open could not fit in three seconds. When it re-tells the
  // opening instead, the reel spends its first eight seconds saying one thing three times.
  const secondLine = spoken[1] ?? '';
  if (v.shotList[1]?.kind === 'presenter' && secondLine) {
    const again = overlapShare(spoken[0] ?? '', secondLine);
    if (again.size >= 4 && again.share >= RESTATEMENT_MAX_SHARE)
      return `the long beat restates the cold open (both say ${again.shared.map((w) => `"${w}"`).join(', ')}) — shot 2 is the reel's ONE long beat and its best line, so it must ADD the specifics the 3-second open could not carry (who, when, what was actually said), never repeat it in more words`;
  }

  // NO BURNED-IN BRANDING INSIDE A GENERATED SHOT. Playbook "no-legible-screens": models render
  // text as gibberish, and the renderer appends its own branded end card after the last shot.
  const branding = burnedInBrandingHit(v.shotList);
  if (branding)
    return `shot ${branding.shotIndex} asks the video model to render branding or text ("${branding.excerpt}") — a text-to-video model renders lettering as gibberish and a paused frame of gibberish destroys the credibility the reel just built. The renderer appends the branded end card itself, after your last shot; describe only what the CAMERA sees`;

  // Voice law: every word rides on camera. A non-presenter shot carries NO line at all — the music
  // bed keeps it from being dead air — and no line may outrun its shot (the renderer would cut it).
  const lines = speechFor(v);
  for (let i = 0; i < v.shotList.length; i++) {
    const sh = v.shotList[i];
    const n = words(lines[i] ?? '');
    if (!n) {
      if (sh.kind === 'presenter')
        return `shot ${i + 1} is a presenter shot with nothing to say — the presenter carries every word in this reel, so a silent face is a wasted generation`;
      continue;
    }
    if (sh.kind !== 'presenter')
      return `shot ${i + 1} (${sh.kind}) carries ${n} words off camera — this format has NO narration at all. Every word is said by the presenter on camera; a product beat plays over the music bed and lets the screen answer for itself. Move the line into presenter dialogue or delete it`;
    if (n > capacity(sh))
      return `shot ${i + 1} (${sh.kind}) says ${n} words in ${sh.seconds}s — budget is ${capacity(sh)} at ${WORDS_PER_SECOND} words/s, the tail would be cut off`;
  }
  if (!v.shotList.some((sh) => sh.kind === 'presenter' && words((sh.dialogue ?? lines[v.shotList.indexOf(sh)]) ?? '')))
    return 'no presenter shot actually speaks — the message must be delivered on camera';

  // ONE REEL, ONE VOICE — now literally, because the music bed made silence free.
  const narrated = v.shotList.filter((sh, i) => sh.kind !== 'presenter' && words(lines[i] ?? '') > 0).length;
  if (narrated > MAX_NARRATED_SHOTS)
    return `${narrated} shot(s) are narrated off camera — the cap is ${MAX_NARRATED_SHOTS}. Synthesized narration is gone from this format entirely: every switch to it is audible, it is the defect the owner rejected twice, and every one of those lines has turned out to be a product feature in a Hindi coat. Let the product beats play wordless over the music bed`;
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
    return `the closing presenter line never says the site out loud ("${closing.slice(0, 60)}") — the owner's ruling is that a listener must hear the name "VedicHour"; end on e.g. "…VedicHour pe dekh liya." The URL belongs on the end card, not in his mouth`;

  // ...AND HE MAY NOT ORDER THE VIEWER TO GO THERE. See CTA_IMPERATIVE: the owner's law is that
  // the name is HEARD, never that the reel issues an instruction, and the instruction is what
  // killed the five highest-scoring scripts of 2026-08-18.
  const bossy = CTA_IMPERATIVE.exec(closing) ?? CTA_SECOND_PERSON.exec(closing);
  if (bossy)
    return `the closing line tells the viewer what to do ("${bossy[0]}" in "${closing.slice(0, 60)}") — the law is that a listener HEARS the name "VedicHour", not that the reel issues an order. An instruction is what the taste lens killed the five best scripts of 2026-08-18 for ("I got the payoff; the brand CTA adds nothing"). He finishes HIS OWN story in the first person and the name is a fact inside it: "Aaj nahi. Kal subah. VedicHour pe dekha." Never "dekh lo", never "try karo", never "aap".`;
  return null;
}

/**
 * THE CLOSING LINE IS HIS, NOT THE BRAND'S — added 2026-08-19.
 *
 * The owner's law is that a LISTENER must hear the word "VedicHour". It has never been that the
 * reel must tell anyone to do anything. But the writer kept discharging the obligation as an
 * instruction, and on 2026-08-18 that single beat killed the five best scripts of the day — every
 * one of the highest taste scores in the batch died on it and on nothing else:
 *   human eye 77  "I got the payoff; the brand CTA adds nothing."
 *   human eye 75  "the mandatory-sounding CTA kills the chai payoff."
 *   human eye 73  "the generic VedicHour instruction wastes the stairwell story's payoff."
 *   human eye 72  "the generic brand CTA interrupts a satisfying resolution."
 *   human eye 69  (same idea) "the stiff branded instruction turns a private moment into an ad."
 * Five scripts within eight points of the bar, all rejected for obeying a rule that never asked
 * for what they gave it.
 *
 * So the name stays and the imperative goes. The man finishes HIS OWN story — first person, past
 * tense, what he actually did — and the brand name is a fact inside that sentence, not a summons
 * addressed to the viewer. "Aaj nahi. Kal subah. VedicHour pe dekha." is the whole requirement.
 * Checked here, for $0, because a note in a prompt has now failed at this five times.
 */
const CTA_IMPERATIVE =
  /\b(?:dekh\s*lo|dekho|dekhiye|dekh\s*lena|khol\s*lo|kholo|kholiye|(?:try|check|use|download|open)\s+kar(?:o|lo|na|lena)?|try\s+vedichour|check\s+vedichour|visit|sign\s*up)\b/i;
const CTA_SECOND_PERSON = /\b(?:tum|tumhe|tumhein|tumhara|tumhari|aap|aapko|aapka|aapki|your)\b/i;

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

THE FORMAT THESE WERE WRITTEN TO — judge them INSIDE it, do not object to it. Every reel opens on a presenter COLD OPEN of ${FIRST_SHOT_MAX_SEC}s or less (the render pipeline requires a human opener; platforms deprioritise faceless AI reels), runs two presenter beats back to back, HOLDS on the real product for ${MIN_PRODUCT_SEC}s+ late in the reel as the payoff, and closes on a face saying the brand name. ${SHOTS_MIN}-${SHOTS_MAX} shots, ${REEL_SEC_MIN}-${REEL_SEC_MAX}s. A brief opening face is therefore CORRECT and must not be marked down as "the presenter should be secondary" or "open on the product instead" — that shape is impossible here.
AND DO NOT COUNT THE PRODUCT BEATS. A reel with ONE product shot is CORRECT and is now the default — that was measured on 2026-08-18 with identical words and one reviewer: two beats scored 55, one late beat scored 76. An optional early ${FIRST_PRODUCT_MAX_SEC}s insert is also allowed. Both shapes are compliant, so never mark a variant down for "showing the product only once" or for "not showing it early enough"; placement is enforced mechanically before you see it.
AND DO NOT JUDGE WHEN THE PRODUCT APPEARS. That is enforced mechanically before you ever see the script, and the rule you may be remembering - "the report by second three" - was AMENDED by the owner on 2026-08-17 ("the rule is mine and it is wrong as an absolute") after the taste lens rejected the second-three placement in thirty-six consecutive variants. The current law is: the remembered detail comes FIRST, the product answers it, and it is on screen by second ${SOLE_PRODUCT_STARTS_BY_SEC}. A reel whose sole product beat starts at second seven, ten, twelve or ${SOLE_PRODUCT_STARTS_BY_SEC} is CORRECT and COMPLIANT. Rejecting one for "violating the second-three reveal" throws away a compliant reel over a rule that no longer exists - which has now happened to six - and on 2026-08-18 a reviewer invented a second-NINE deadline that has never existed in this pipeline and killed all six variants of one idea with it, two of which were the highest-scoring scripts of that day. THERE IS NO DEADLINE FOR YOU TO ENFORCE. The number is checked in code before you are shown anything, so "the report arrives too late" is not an objection you are permitted to make, in any wording, for any second.
AND DO NOT ASK FOR AN END CARD. The renderer appends a branded card carrying vedichour.com to every reel automatically, after the last shot — it is not the writer's job and it is not in the shot list you are shown. A script that ends on the presenter's face is therefore CORRECT and required; rejecting one for "not ending on the branded card" throws away a compliant reel over a stage you cannot see, which has already happened once.
ALSO DO NOT OBJECT TO THE SILENT PRODUCT BEATS. There is no narrator in this format by design: a music bed runs under the whole reel and every spoken word is performed on camera by the presenter. A product shot with no line is a deliberate cut, not a missing voiceover, and marking it down as "needs narration" is the defect, not the fix — every narration line this brief ever produced was a feature bullet in a Hindi coat and was rejected.
What you SHOULD punish is a cold open that warms up instead of answering, a cold open that points at something the viewer cannot see ("isi baat pe", "yeh cheez"), a reel that names the product in the first three seconds, and any line that sounds like the landing page rather than the man.

IDEA UNDER REVIEW: ${idea.angle}

${blocks}

Score EVERY variant 0-100 on each axis:
- hookStrength: does the FIRST on-screen line stop a thumb inside one second? Generic slogans, "unlock/discover your...", or anything a viewer has read a thousand times scores under 40.
- specificity: a named, concrete decision moment scores high. An abstraction about "cosmic energy" or "your timing" scores under 30.
- credibility: would an Indian viewer who actually knows some astrology find this embarrassing to be seen watching? Cringe, guru-voice, over-claiming, or fake-deep = low. ENGINE JARGON IS A CREDIBILITY FAILURE, not a credential: "Swiss Ephemeris", "Lahiri", "ayanamsa", "sidereal", "whole-sign", "vimshottari" mean nothing to this viewer and read as a nerd flex — the owner's words: "No one gives a shit. I don't even know what this is." Any variant using one scores under 35 here. The credible version of the same claim is "real astronomical data, the same math a careful astrologer uses".
- brandSafety: score 0-100, and be ruthless. Score BELOW 60 if there is ANY of: a guarantee or certainty claim; "100%" or miracle framing; a health, money, legal, or relationship OUTCOME promise; fear-mongering; a deterministic "THE best hour / worst hour" stated as fact; invented social proof (fake testimonials, made-up user numbers, star ratings); competitor bashing or mockery of astrology or astrologers; any rupee or dollar figure. Calibrate carefully: a script with NO violation at all should score 90-100, and anything you score under ${BRAND_SAFETY_FLOOR} is automatically rejected and never rendered.
- producibility: can a text-to-video model actually render the presenter/broll shots? Readable on-screen text, logos, specific real places, crowds of faces, complex hand interactions, or multi-subject choreography = low. A presenter shot whose described EXPRESSION does not match the line he is saying is also low — the model will render the words and the face separately and the mismatch is visible. Screencap shots are free (they are real recordings) — judge only what a model must generate. Note that every variant here is 100% on camera by construction, so do not spend this score on voice structure; it is already guaranteed.

HARD RULE, ABOVE ALL FIVE AXES — THE SPOKEN CTA. The last presenter shot's on-camera dialogue must NAME THE BRAND OUT LOUD ("…VedicHour pe dekh liya"). Saying the bare name is CORRECT and preferred — he is not required to read out "dot com", and a line that does is the ad-read version, not the better one; the full vedichour.com is on the branded end card. The owner's ruling, verbatim: "at the end there should be a call to action: Try VedicHour.com... because people who are listening to the reel will figure out, Oh, I found this new platform, VedicHour." Each variant above is annotated with "closing line says the site out loud: YES/NO". Any variant marked NO is verdict "reject" — no exceptions, however good the hook is — and score its hookStrength no higher than 45, because a reel nobody can act on is not doing the job a hook exists to start.
AND THE FORM OF THAT LINE IS SETTLED, SO DO NOT RE-LITIGATE IT. It is first person, past tense, about what HE did, with the name sitting inside his own sentence — "Aaj nahi. Kal subah. VedicHour pe dekha." Every closing line you are shown has ALREADY been checked mechanically for the instruction form: "dekh lo", "try karo", "aap", "tum" and the rest are rejected before you see them, so a viewer-directed command cannot reach you. What CAN reach you is the correct version, and on 2026-08-18 five scripts — the five highest-scoring of that day, one of them at 77 — were thrown away for "the generic brand CTA", "the mandatory-sounding CTA", "the stiff branded instruction". A man naming the thing he opened last night is not a CTA and is not promotional; it is the last beat of his story and it is REQUIRED. Reject a closing line for being limp, for being longer than the beat holds, or for not landing on the reel's opening sentence — never for containing the brand name.

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
  return { hookStrength, specificity, credibility, brandSafety, producibility, humanEye, total: Math.round(total), notes: 'heuristic fallback — hostile reviewer unavailable', degraded: true, judgedBy: stageCli.get('human-eye') ?? 'unavailable' };
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
 *   total        <- a closing line that never says the brand name out loud is penalised, because
 *                    a listener with their eyes elsewhere never learns where to go.
 */
function applyOwnerLaws(v: Variant, s: Scores): Scores {
  const jargon = jargonHits([v.hookText, v.spokenScript, v.onScreenCaptions.join(' '), v.cta, v.youtubeTitle, v.youtubeDescription].join('\n'));
  const ratio = nativeDialogueRatio(v);
  const noSpokenCta = !SPOKEN_SITE.test(closingPresenterLine(v));

  const credibility = jargon.length ? Math.min(s.credibility, 30) : s.credibility;
  // Producibility used to carry a +8 bonus for a high on-camera share and caps below it. Narration
  // is now impossible (MAX_NARRATED_SHOTS = 0, enforced in preflight), so the bonus fired on every
  // surviving variant and the caps could never fire at all: a flat +8 on everything is not a score,
  // it is inflation, and this loop's totals are read as a quality bar. The caps stay as the honest
  // backstop for a variant that somehow reaches here with narration in it.
  const producibility = ratio < 0.5 ? Math.min(s.producibility, 40) : ratio < NATIVE_RATIO_FLOOR ? Math.min(s.producibility, 65) : s.producibility;

  const notes = [
    s.notes,
    jargon.length ? `credibility capped at 30 — ad-copy jargon: ${jargon.join(', ')}` : '',
    ratio < NATIVE_RATIO_FLOOR ? `producibility capped — only ${Math.round(ratio * 100)}% of the words are spoken on camera` : '',
    noSpokenCta ? `total −${MISSING_SPOKEN_CTA_PENALTY} — the closing line never says the name "VedicHour" out loud (owner law). Say the name, not the URL, and never as an instruction` : '',
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
          return { ...s, total, notes: [String(a.notes ?? '').slice(0, 160), eyeNote].filter(Boolean).join(' · '), degraded: false, judgedBy: he.degraded ? 'unavailable' : (stageCli.get('human-eye') ?? 'unknown') };
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
      eye: he,
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

// ---------------------------------------------------------------- 3b. revise

/**
 * THE REVISION PASS — the loop that was missing, and the reason nothing ever got past "good".
 *
 * The human-eye lens has always been asked for TWO things: the second the reel dies, and `oneFix`,
 * "the single change that would make you stop". It has been answering both, precisely and for
 * free, since the day it was written — "Kill the baithak defense; go straight from the binary
 * choice to the answer", "Add one real consequence: what actually went wrong the last time he
 * guessed", "Stay on his face after 'pandit ji'; let the scheduling panic breathe first" — and
 * every single one of those notes was written to a log and thrown away. The engine generated six
 * variants, scored them, picked the least bad, and shipped it at 73.
 *
 * That is not iteration; it is selection, and selection cannot exceed the best thing luck produced
 * in one shot. So the top few reels now go back to the writer WITH THEIR OWN AUTOPSY attached and
 * are rewritten against it, then re-scored on the same scale. The revision competes with the
 * original in the tournament and only wins if it actually scores higher — a rewrite that ignores
 * the note and drifts loses to the draft it came from.
 *
 * Cost: two extra $0 CLI calls per batch, both bounded by the same stage deadline.
 */
const REVISE_TOP_N = 3;
/** Variant indexes of revisions are offset by this, so a revision is identifiable in SQLite. */
const REVISION_INDEX_OFFSET = 100;

function revisePrompt(entries: Judged[], link: string): string {
  // Reels are numbered by SLOT (1..N of what we sent), never by variantIndex: two ideas each
  // produce variants 1-6, so "REEL 5" would be ambiguous and `revisionOf` would map a rewrite
  // onto the wrong draft — silently attributing one idea's autopsy to another idea's script.
  const blocks = entries
    .map((j, slot) => {
      const v = j.variant;
      return `--- REEL ${slot + 1} · "${v.hookText}" ---
WHAT THE VIEWER SAW AND HEARD:
${playbackTimeline(v)}
burned-in captions: ${v.onScreenCaptions.join(' | ')}

WHAT THE VIEWER SAID, verbatim:
  score ${j.eye.overall}/100 — stopped watching at: ${j.eye.diesAt || '(watched it through, but was not moved)'}
  the ONE change that would have made him stop scrolling: ${j.eye.oneFix || '(none given — then find the weakest line yourself and replace it)'}
  the hostile reviewer's harshest objection: ${j.scores.notes || '(none)'}`;
    })
    .join('\n\n');

  return `${BRAND_BRIEF}

You wrote these reels. A real viewer watched them and told you exactly where he stopped and what would have held him. Rewrite each one so that specific thing is fixed.

THIS IS A REVISION, NOT A NEW IDEA. The moment, the person and the situation stay. Do not start over, do not swap the decision for a different one, and do not "improve" the lines the viewer did not complain about — a rewrite that drifts loses to the draft it came from, because both are scored against each other and the higher score wins.

Change what he named, and change whatever that change makes necessary. If he says the product screen felt like an ad pivot, the fix is not a better sentence over it — it is moving or shortening the screen so it answers the line before it. If he says a line sounds like a product deck, replace that line with something a person would actually say about their own evening. If he says nothing happens for three seconds, cut the three seconds.

AND THEN GO ONE STEP FURTHER THAN HE ASKED. He is describing the thing that made him leave; you are trying to make something he would send to a friend. The bar is not "no longer boring". Ask of your rewrite the question the founder asked: does this look like a real advert that a billion-dollar company would launch? If the answer is "it is fine", it is not there yet.

${blocks}

${formatSpecBlock()}

${LITERALISM_BAN_BLOCK}

RULES YOUR REWRITE STILL HAS TO OBEY (unchanged, and all of them are hard rejects):
- The shot list follows the FORMAT above exactly: cold open <= ${FIRST_SHOT_MAX_SEC}s, ONE screencap HOLD of ${MIN_PRODUCT_SEC}-${PRODUCT_HOLD_MAX_SEC}s placed late (no earlier than 40% in, no later than second ${SOLE_PRODUCT_STARTS_BY_SEC}, directly after a presenter shot), two presenter shots back to back somewhere, last shot a presenter. An early <= ${FIRST_PRODUCT_MAX_SEC}s insert is optional, never required — and if the reviewer's complaint was about the product interrupting, deleting it IS the fix.
- NO NARRATION ANYWHERE. Screencap and b-roll shots carry "narration": "". Every word is on camera.
- The closing presenter line says the brand name "VedicHour" out loud — the name, not the URL.
- ${SCRIPT_WORDS_MIN}-${SCRIPT_WORDS_MAX} spoken words total; no shot's line may exceed (its seconds x ${WORDS_PER_SECOND}) words, rounded down. Count them.
- Latin letters only. No jargon. No promises, no fear, no invented proof.
- youtubeDescription contains this link exactly once, verbatim: ${link}

Return STRICT JSON — an array with ONE object per reel above, in the same order, nothing before or after it, no fences. Same shape you wrote originally:
[{"revisionOf":<the reel number>,"whatIChanged":"<max 20 words, name the fix you made>","hookText":"...","spokenScript":"...","shotList":[{"kind":"presenter","seconds":3,"visualPrompt":"...","dialogue":"..."},{"kind":"screencap","seconds":2,"visualPrompt":"...","narration":""}],"onScreenCaptions":["..."],"cta":"...","hashtags":["#..."],"youtubeTitle":"...","youtubeDescription":"...","language":"hinglish"}]`;
}

/**
 * Rewrite the strongest few reels against their own autopsies and judge the results on the same
 * scale. Returns the revisions as fully-judged entries; never throws, and returns [] when the
 * writer or the reviewers are unreachable, so the batch degrades to selection-only.
 */
/** Identity of a judged reel across stages — variantIndex alone repeats across ideas. */
const judgedKey = (j: Judged) => `${j.variant.ideaId}#${j.variant.variantIndex}`;

export interface RevisionOutcome {
  /** Rewrites that beat the draft they came from, judged in the same pass as it. */
  rewrites: Judged[];
  /** Re-judgments of the originals from that same pass, keyed by judgedKey, to replace the stale ones. */
  refreshed: Map<string, Judged>;
}

async function reviseTop(survivors: Judged[], tier: Tier): Promise<RevisionOutcome> {
  // Only reels the lens actually watched can be revised — a degraded verdict carries no note, so
  // there is nothing to rewrite against and a "revision" would just be a second random draw.
  const candidates = [...survivors]
    .filter((j) => !j.eye.degraded && (j.eye.oneFix || j.eye.diesAt))
    .sort((a, b) => b.scores.total - a.scores.total)
    .slice(0, REVISE_TOP_N);
  const empty: RevisionOutcome = { rewrites: [], refreshed: new Map() };
  if (!candidates.length) return empty;

  const first = candidates[0].variant;
  const link = utm(BRAND.links.pricing, 'youtube', 'short', 'creative_engine', first.ideaId);
  const raw = await tryBrain(revisePrompt(candidates, link), tier, 'revise');
  const parsed = raw ? extractJson<any[]>(raw) : null;
  if (!Array.isArray(parsed) || !parsed.length) {
    console.warn('[creative] revise: no parsable rewrites — keeping the originals only.');
    return empty;
  }

  // Map each rewrite back to the reel it came from by SLOT — the model's own `revisionOf` when it
  // gave one, otherwise by position, which is safe because we asked for the same order.
  const revisions: { source: Judged; slot: number; variant: Variant; note: string }[] = [];
  parsed.forEach((rawVariant, i) => {
    const slot = Number.isFinite(Number(rawVariant?.revisionOf)) ? Number(rawVariant.revisionOf) - 1 : i;
    const source = candidates[slot] ?? candidates[i];
    if (!source) return;
    const idea: Idea = {
      id: source.variant.ideaId,
      family: source.variant.family,
      angle: source.variant.angle,
      decisionMoment: '',
      whyItStops: '',
      tags: source.variant.tags,
      explore: source.variant.explore,
    };
    // judge() keys its audit rows by variantIndex, so every reel in that one call must carry a
    // DISTINCT index. Slot numbering gives that: draft n is n, its rewrite is n + the offset.
    const n = candidates.indexOf(source) + 1;
    const v = normalizeVariant(rawVariant, idea, n + REVISION_INDEX_OFFSET, link);
    if (!v.hookText || !v.spokenScript) return;
    revisions.push({ source, slot: n, variant: v, note: String(rawVariant?.whatIChanged ?? '').slice(0, 120) });
  });
  if (!revisions.length) return empty;

  for (const r of revisions) {
    console.log(`[creative] revise → "${r.source.variant.hookText}" (${r.source.scores.total}) rewritten: ${r.note || 'no note given'}`);
  }

  /**
   * THE DRAFT AND ITS REWRITE ARE JUDGED IN THE SAME BREATH.
   *
   * The first version of this stage scored the revisions in a fresh call and compared the number
   * against the original's score from an earlier call. That is not a comparison: the taste lens is
   * a language model reading a batch, and its calibration moves between invocations — on
   * 2026-08-17 two rewrites came back at human-eye 55 against originals of 81 and 75, which would
   * mean every rewrite made things dramatically worse rather than that the two batches were scored
   * against different neighbours.
   *
   * So both go into ONE judging call, as one batch, and the fresh scores are used for BOTH sides.
   * Whatever the absolute numbers are, they are now internally consistent, which is the only thing
   * the head-to-head needs. The refreshed original replaces its earlier judgment in the pool.
   */
  const idea: Idea = {
    id: revisions[0].source.variant.ideaId,
    family: revisions[0].source.variant.family,
    angle: 'this batch’s strongest reels and their rewrites, judged side by side',
    decisionMoment: '',
    whyItStops: '',
    tags: revisions[0].source.variant.tags,
    explore: false,
  };
  const draftsForJudging = revisions.map((r) => ({ ...r.source.variant, variantIndex: r.slot }));
  const paired = await judge(idea, [...draftsForJudging, ...revisions.map((r) => r.variant)], tier);
  const freshByIndex = new Map(paired.map((j) => [j.variant.variantIndex, j]));

  const rewrites: Judged[] = [];
  const refreshed = new Map<string, Judged>();
  for (const r of revisions) {
    const fresh = freshByIndex.get(r.variant.variantIndex);
    // Restore the draft's real variantIndex — it was renumbered only so the judging call could
    // key it — so judgedKey() still matches the entry this is replacing in the pool.
    const judgedDraft = freshByIndex.get(r.slot);
    const original = judgedDraft ? { ...judgedDraft, variant: r.source.variant } : undefined;
    if (!fresh) continue;
    const before = original ? original.scores.total : r.source.scores.total;
    const delta = fresh.scores.total - before;
    const won = fresh.status !== 'rejected' && delta > 0;
    console.log(
      `             ${won ? '✓ KEPT' : '·  lost'} "${fresh.variant.hookText}" → ${fresh.scores.total} (human eye ${fresh.scores.humanEye}) · ` +
        `${delta >= 0 ? '+' : ''}${delta} vs the same draft scored in the same pass` +
        (fresh.rejectionReason ? ` · ${fresh.rejectionReason.slice(0, 90)}` : ''),
    );
    // The rewrite enters the pool on its own merits; the refreshed original goes in either way so
    // the tournament never sees two differently-calibrated scores for the same reel.
    if (won) rewrites.push(fresh);
    if (original) refreshed.set(judgedKey(original), original);
  }
  return { rewrites, refreshed };
}

// ---------------------------------------------------------------- 4. tournament

/** Second-by-second, the way the viewer gets it — so the final judge ranks reels, not paragraphs. */
function playbackTimeline(v: Variant): string {
  const lines = speechFor(v);
  let t = 0;
  return v.shotList
    .map((sh, i) => {
      const from = t;
      t += sh.seconds || 0;
      const what = sh.kind === 'screencap' ? 'REAL PRODUCT SCREEN' : sh.kind.toUpperCase();
      const say = lines[i] ? `he SAYS: "${lines[i]}"` : 'no words — music bed only, the screen speaks for itself';
      return `  ${from.toFixed(0)}s-${t.toFixed(0)}s  ${what} — ${say}`;
    })
    .join('\n');
}

function tournamentPrompt(entries: { key: string; v: Variant }[]): string {
  const blocks = entries
    .map((e) => `[${e.key}]\nfirst frame, burned in: "${e.v.hookText}"\n${playbackTimeline(e.v)}\ncta card: ${e.v.cta}`)
    .join('\n\n');
  return `Judge these short-form video scripts head to head on ONE question only: which would an Indian viewer, scrolling fast on their phone, actually watch to the END?

Not which is the most tasteful. Not which is the most informative. Which one holds a thumb for 25 seconds. Reward a concrete opening moment, a reason to keep watching past second three, and a payoff that arrives. Punish anything that front-loads explanation, sounds like an ad read, or takes more than one second to understand.

You are given the TIMELINE, not just the words, because in this format the structure is most of the difference and the paragraphs read alike. Two things to weigh that you cannot see in a transcript:
- WHERE THE PRODUCT LANDS. A brief wordless flash of the real screen inside a sentence keeps the viewer inside the moment. A long product screen early, or any voice explaining the screen, is a commercial interrupting a story — rank it below a reel whose product beat answers the question that was just asked.
- WHETHER THE FACE GETS A RUN. Two presenter beats back to back let a real thought land. Strict face/screen/face/screen alternation is a slideshow and reads as the same reel we have already made several times.

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

  /**
   * THE GROUP OF DEATH, fixed. Brackets used to be consecutive slices of the score order, so the
   * four best variants met in round one and two of them were eliminated by each other. Batch
   * 2026-08-17-mswozohk is the proof: an 83 and an 82 were drawn against the 86, finished third and
   * fourth in that bracket, and were then ranked BELOW a 74 that had an easy group — so two of the
   * batch's four strongest reels never reached the founder's queue at all.
   *
   * Seeding round-robin instead spreads the top seeds one per bracket, which is what seeding is for.
   */
  const bracketCount = Math.max(1, Math.ceil(byScore.length / BRACKET_SIZE));
  const brackets: Judged[][] = Array.from({ length: bracketCount }, () => []);
  byScore.forEach((j, i) => brackets[i % bracketCount].push(j));

  const finalists: Judged[] = [];
  const alsoRans: Judged[] = [];
  for (const b of brackets) {
    const ranked = await rankGroup(b);
    finalists.push(...ranked.slice(0, 2));
    alsoRans.push(...ranked.slice(2));
  }

  const podium = finalists.length > 1 ? await rankGroup(finalists) : finalists;
  // Everything below the podium is ordered by its own score rather than by which bracket it lost
  // in — a bracket placing is only meaningful against the three reels it was actually compared to.
  const ordered = [...podium, ...alsoRans.sort((a, b) => b.scores.total - a.scores.total)];
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
 * capacity first, and non-presenter shots get NOTHING — this format has no narration at all, so a
 * fallback that manufactured a connective line would build a variant preflight() then rejects.
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

  // 2. anything still unplaced goes back to the presenter with the most headroom. If it
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

_Taste judged by \`${s.judgedBy}\`. brain() falls through its tier list, so the reviewer behind this number is whichever CLI was healthy — on 2026-08-17 an expired login moved it from claude to codex mid-day and the scores kept being compared as one trend. **A human-eye score is only comparable to another one carrying the same judge.**_

## The viewer
_The taste lens's four sub-scores. These were being computed and thrown away, which made "why is this only a 76" unanswerable — the overall alone cannot tell you whether a reel failed to stop a thumb or merely looked cheap once it had._

| what he was asked | score |
| --- | --- |
| would you stop scrolling | ${j.eye.stopScroll} |
| does it look expensive | ${j.eye.looksExpensive} |
| does the human ring true | ${j.eye.humanTruth} |
| is it free of AI slop | ${j.eye.notSlop} |

${j.eye.degraded ? '> The lens was unreachable for this reel — these are neutral placeholders, not a verdict.' : `**Where he would have flicked away:** ${j.eye.diesAt || '(he watched it through)'}\n\n**The one change he asked for:** ${j.eye.oneFix || '(none given)'}`}

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
          // The whole taste verdict, not just the number it rolled up to — `oneFix` is the note the
          // revision stage rewrites against, and it is the most useful sentence in this file.
          humanEye: w.eye,
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
    // Exploration is only worth paying for once there are posted results it could be correcting.
    const hasEvidence = (learned.snapshot?.assets.length ?? 0) > 0;
    const reservedAsk = reservedSlots(count, hasEvidence);
    const { ideas, fallback } = await ideate(seeds, tier, IDEAS_REQUESTED, learned, reservedAsk);
    console.log(`[creative] ideate → ${ideas.length} candidate hooks${fallback ? ' (SEED FALLBACK — brain was unreachable)' : ''}`);

    // 1b. EXPLORE/EXPLOIT — enforced on OUR coverage counts, not on the model's self-label.
    const { chosen, exploreChosen, reserved } = selectForScripting(ideas, count, learned.explore, hasEvidence);
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

    // 3b. REVISE — the strongest reels rewritten against their own autopsies, then re-scored.
    // Selection alone can never beat the best draft luck produced; this is the part that iterates.
    const { rewrites, refreshed } = survivors.length && !isKilled() ? await reviseTop(survivors, tier) : { rewrites: [], refreshed: new Map<string, Judged>() };
    judged.push(...rewrites);
    // A reel that was re-judged alongside its rewrite carries the score from THAT pass, so the
    // tournament never ranks two differently-calibrated numbers against each other.
    const pool = [...survivors.map((j) => refreshed.get(judgedKey(j)) ?? j), ...rewrites].filter((j) => j.status !== 'rejected');

    // 4. TOURNAMENT
    const ordered = pool.length ? await tournament(pool, tier) : [];
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
