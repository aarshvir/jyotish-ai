import { db } from './db/index';

/**
 * THE LESSONS LOOP — the owner's question was "how do you learn this automatically?".
 *
 * Answer: every rejection becomes a ROW, not a paragraph in a chat log. Rows are injected into
 * the prompts that write the next reel and asserted in the pre-flight that gates the next spend,
 * so a mistake the owner names once cannot reach him twice. His words: "I don't want to give this
 * again and again. It wastes a lot of energy from my end."
 *
 * Injection points (grep `activeLessons(` to keep this list honest):
 *   - src/loops/creative.ts  ideate prompt   <- scope script, voice
 *   - src/loops/creative.ts  script prompt   <- scope script, voice
 *   - src/loops/creative.ts  audit prompt    <- scope script, voice, caption
 *   - src/loops/render.ts    pre-flight      <- scope visual, capture, caption (+ asserted)
 *
 * `rule` is UNIQUE, so filing the same lesson twice is a no-op and the seed below is idempotent.
 */

export type LessonSource = 'owner' | 'internal_audit' | 'gpt_review';
export type LessonSeverity = 'critical' | 'high' | 'medium' | 'low';
export type LessonScope = 'script' | 'visual' | 'voice' | 'capture' | 'caption';

export interface Lesson {
  id: number;
  created_at: string;
  source: LessonSource;
  severity: LessonSeverity;
  scope: LessonScope;
  rule: string;
  evidence: string | null;
  active: number;
}

export interface NewLesson {
  source: LessonSource;
  severity?: LessonSeverity;
  scope: LessonScope;
  /** Imperative one-liner. This exact string is what lands in the next prompt. */
  rule: string;
  evidence?: string;
}

/**
 * File a lesson. Idempotent on `rule` — re-filing an existing rule re-activates it and refreshes
 * its evidence rather than creating a duplicate. Returns the row id.
 */
export function addLesson(l: NewLesson): number {
  const rule = l.rule.trim();
  if (!rule) throw new Error('addLesson: rule is empty');
  db()
    .prepare(
      `INSERT INTO lessons (source, severity, scope, rule, evidence, active)
       VALUES (@source, @severity, @scope, @rule, @evidence, 1)
       ON CONFLICT(rule) DO UPDATE SET
         active = 1,
         severity = excluded.severity,
         evidence = COALESCE(excluded.evidence, lessons.evidence)`,
    )
    .run({
      source: l.source,
      severity: l.severity ?? 'high',
      scope: l.scope,
      rule,
      evidence: l.evidence ?? null,
    });
  const row = db().prepare(`SELECT id FROM lessons WHERE rule = ?`).get(rule) as { id: number } | undefined;
  return Number(row?.id ?? 0);
}

/** Active lessons, newest first. Pass one or more scopes to narrow. */
export function activeLessons(scope?: LessonScope | LessonScope[]): Lesson[] {
  ensureSeeded();
  const scopes = scope ? (Array.isArray(scope) ? scope : [scope]) : null;
  const sql = scopes?.length
    ? `SELECT * FROM lessons WHERE active = 1 AND scope IN (${scopes.map(() => '?').join(',')}) ORDER BY id DESC`
    : `SELECT * FROM lessons WHERE active = 1 ORDER BY id DESC`;
  return db().prepare(sql).all(...(scopes ?? [])) as Lesson[];
}

/** Retire a lesson without deleting the history. */
export function deactivateLesson(id: number): void {
  db().prepare(`UPDATE lessons SET active = 0 WHERE id = ?`).run(id);
}

/**
 * Render active lessons as a prompt block. Returns '' when there are none, so callers can
 * interpolate it unconditionally without leaving a dangling heading.
 */
export function lessonBlock(scope?: LessonScope | LessonScope[], heading = 'LESSONS ALREADY LEARNED — these are permanent, violating one is a defect'): string {
  const rows = activeLessons(scope);
  if (!rows.length) return '';
  return `${heading}:\n${rows.map((l) => `- [${l.scope}] ${l.rule}`).join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Seed — the owner's five rulings, verbatim as rules
// ---------------------------------------------------------------------------

/**
 * Filed 2026-07-26 after the owner reviewed the first two rendered ads. Each `rule` is the
 * imperative form of what he said; `evidence` keeps his actual words attached so a future
 * reviewer can see WHY without archaeology.
 */
export const OWNER_SEED_LESSONS: NewLesson[] = [
  {
    source: 'owner',
    severity: 'critical',
    scope: 'voice',
    rule: 'Never use a synthetic female narrator voice — Veo native in-shot dialogue or the Sarvam male voice only, and never switch timbre mid-reel.',
    evidence:
      'Owner, 2026-07-26, on the first two ads: "the second voice, when it comes, looks very AI-generated, the woman\'s voice... the first 6 seconds are good". The good 6s were Veo native audio; the drop-off was edge-tts en-IN-NeerjaNeural.',
  },
  {
    source: 'owner',
    severity: 'critical',
    scope: 'capture',
    rule: 'Product scrolls must show the report and its hour-slots, never the pricing or checkout page.',
    evidence:
      'Owner, 2026-07-26: "when it shows the platform scrolling, it should show the REPORT and not the payment section... how all slots are coming and tell you what to do at what time of day".',
  },
  {
    source: 'owner',
    severity: 'high',
    scope: 'script',
    rule: 'No astrology or engine jargon in ad copy — never Swiss Ephemeris, Lahiri, ayanamsa, sidereal, whole-sign or vimshottari. Say "real astronomical data, the same math a careful astrologer uses".',
    evidence:
      'Owner, 2026-07-26: "some jargon like Swiss Ephemeris, Lahiri... No one gives a shit. I don\'t even know what this is." (These terms stay legal on the blog and site — ad copy only.)',
  },
  {
    source: 'owner',
    severity: 'high',
    scope: 'caption',
    rule: 'Captions must never overlap the page\'s own text — over a product screencap they move to the top zone and use the opaque band style.',
    evidence: 'Owner review of the first two ads, 2026-07-26. Implemented as the CaptionBand/CtaBand ASS styles driven by productWindows in src/render/assemble.ts.',
  },
  {
    source: 'owner',
    severity: 'critical',
    scope: 'script',
    // PHRASING MATTERS HERE. src/audit/lessons-bridge.ts turns a NEGATIVE script lesson that names
    // terms in quotes into a forbidden-substring block. A lesson that REQUIRES a phrase must
    // therefore never be written as "never ... 'vedichour.com'", or the pre-flight would block
    // every creative that obeys it. Kept positive and unquoted; the gate itself is deterministic
    // (SPOKEN_SITE, asserted in creative.ts preflight() and render.ts preflight()).
    rule:
      'Every reel MUST close by naming the site out loud AND on screen: the final presenter shot says vedichour.com in his own ' +
      'on-camera dialogue (Veo performs it, so it is free and stays in the reel one voice), and the reel ends on the branded ' +
      'card where vedichour.com is the largest element. A viewer who only LISTENS must still learn where to go.',
    evidence:
      'Owner, 2026-07-26, reviewing the two finished reels: "at the end there should be a call to action: Try VedicHour.com... ' +
      'because people who are listening to the reel will figure out, Oh, I found this new platform, VedicHour."',
  },
  {
    source: 'owner',
    severity: 'high',
    scope: 'visual',
    rule: 'The end frame must be a clean hero hold of at least 1.5s — no launch banners, no floating feedback widgets, no mid-scroll footer.',
    evidence: 'Owner review of the first two ads, 2026-07-26. Site chrome is stripped in src/render/screencap.ts; the closing shot must settle before the reel ends.',
  },
  {
    source: 'owner',
    severity: 'critical',
    // SCOPE MATTERS: filed as `visual`, not `script`. lessonMatcher() harvests quoted terms from a
    // COPY lesson into a forbidden-substring block, and this lesson quotes ordinary words the ad is
    // still allowed to SAY. It is a rule about what may be PICTURED, and it is asserted
    // deterministically by literalismHits()/propBanHits() in src/audit/human-eye.ts.
    scope: 'visual',
    rule:
      'A figure of speech is never rendered as an object. When the copy says window, door, green light, clock or crossroads, the shot shows the actual subject — the person deciding, the real moment, or the live report — not the metaphor as a prop.',
    evidence:
      'Owner, 2026-08-16, on the rejected reel: "window shares an image of window while we are talking of time window". The script said "Same Tuesday. Two windows." (two windows of TIME) and shot 2 was a push-in through an apartment window.',
  },
  {
    source: 'owner',
    severity: 'critical',
    scope: 'script',
    // Phrased with "must" on purpose: lessonMatcher() refuses to turn a REQUIREMENT into a banned
    // substring, so this can never invert into a gate that blocks the shape it is demanding.
    rule:
      'Every reel must open on a presenter cold open of 3 seconds or less — already mid-answer, no greeting and no setup — then give the remembered detail its own presenter beat, and show the real report by second NINE at the latest, then keep cutting back to it. 5-8 shots in 20-28 seconds, at most one presenter beat over 4s, at most one b-roll shot.',
    evidence:
      'Owner, 2026-08-16: "this reel is shit" / "this should look like a real advert that a $1B saas platform will launch". Measured: the rejected reel ran 29s in 5 shots and spent its first 13 seconds on a talking head before the product appeared. AMENDED 2026-08-17 by the owner ("the rule is mine and it is wrong as an absolute"): the earlier deadline nailed the product to shot 2, and the taste lens then rejected that placement in 36 consecutive variants ("unexplained product grid interrupts the story before it develops"). What the 13-second failure justifies is a DEADLINE; the SLOT was an over-correction and is gone.',
  },
  {
    source: 'owner',
    severity: 'critical',
    scope: 'script',
    rule:
      'Every reel must survive a human-eye review as well as the rule checks: a bored viewer scrolling at 11pm has to stop in the first second, find something real on screen inside three, and see something that looks like a funded company made it. A script that breaks no rule and would still be scrolled past must be rejected.',
    evidence:
      'Owner, 2026-08-16: "All the videos should be audited from a human lens — any user seeing the video should get a world class look into the platform like its a $1B platform launching an ad." The rejected reel passed brand safety, captions, voice, capture policy, jargon and loudness.',
  },
];

let seeded = false;

/** Insert the owner's rulings once per process. Idempotent at the DB level too (rule is UNIQUE). */
export function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  for (const l of OWNER_SEED_LESSONS) addLesson(l);
}

/**
 * `npm run lessons` — list what the engine has permanently learned.
 * Optional scope filter: `npm run lessons -- voice`.
 */
export function printLessons(scope?: LessonScope): void {
  const rows = activeLessons(scope);
  console.log(`\nLessons (${rows.length} active${scope ? `, scope ${scope}` : ''}) — injected into creative prompts and asserted in the render pre-flight\n`);
  for (const l of rows) {
    console.log(`  #${l.id}  [${l.severity}] [${l.scope}] via ${l.source}  ${l.created_at}`);
    console.log(`      ${l.rule}`);
    if (l.evidence) console.log(`      evidence: ${l.evidence}`);
    console.log('');
  }
  if (!rows.length) console.log('  (none — nothing has been rejected yet)\n');
}

const SCOPES: LessonScope[] = ['script', 'visual', 'voice', 'capture', 'caption'];

// `npm run lessons [scope]`. This module is its own entry point so the shared src/cli.ts stays
// out of the way of the concurrent session that also edits it (CLAUDE.md §8).
if (process.argv[1] && /lessons\.[cm]?ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const arg = process.argv[2] as LessonScope | undefined;
  if (arg && !SCOPES.includes(arg)) {
    console.error(`unknown scope "${arg}" — one of: ${SCOPES.join(', ')}`);
    process.exit(1);
  }
  printLessons(arg);
}
