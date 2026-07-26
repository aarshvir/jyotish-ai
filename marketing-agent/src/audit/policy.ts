/**
 * The mechanically-checkable half of VedicHour's project law (../../CLAUDE.md).
 *
 * Everything here is a HARD RULE the owner has already stated. Pre-flight (src/audit/preflight.ts)
 * enforces these on the creative PLAN for $0, before a cent of render spend; the post-render
 * review re-checks the ones that only pixels/audio can prove.
 *
 * Edit this file — not the prompts — when a rule changes. Prompts drift; this does not.
 */

/**
 * LAW §1 — jargon. None of these may appear in ad copy (script, captions, title, description).
 * The owner's 2026-07-26 rejection: "Swiss Ephemeris" read as jargon to a normal viewer.
 * Word-boundary matched, case-insensitive.
 */
export const JARGON = [
  'swiss ephemeris',
  'lahiri',
  'ayanamsa',
  'ayanamsha',
  'sidereal',
  'whole-sign',
  'whole sign',
  'vimshottari',
] as const;

/**
 * LAW §1 — capture targets. A product shot exists to prove the REPORT (hour slots +
 * what-to-do-when). Anything that looks like a payment surface is an instant block:
 * the owner watched a reel scroll his own pricing page and called it a defect.
 */
export const BANNED_CAPTURE = /\/(pricing|checkout|payment|onboard|billing|subscribe|upgrade)\b|[?&]plan=/i;

/**
 * The only surfaces a `product` shot may capture. Extend this list (with the owner's
 * agreement) rather than loosening BANNED_CAPTURE.
 */
export const ALLOWED_CAPTURE = [
  /\/report\b/i,
  /\/reports?\//i,
  /\/sample-report\b/i,
  /\/demo\b/i,
  /\/dashboard\b/i,
];

/**
 * LAW §2 — voice. The presenter's Veo native in-shot voice is free AND the quality bar.
 * `edge-tts` / en-IN-NeerjaNeural reads as synthetic in an ad and is banned outright.
 */
export const BANNED_VOICE = /neerja|edge-?tts|neural$|Neural\b/i;

/** Sarvam Bulbul v3 MALE speakers — the only approved narration voices (LAW §2). */
export const APPROVED_VOICES = [
  'shubh', 'aditya', 'gokul', 'rahul', 'rohan', 'amit', 'mani', 'dev', 'kabir', 'varun',
] as const;

/** Sarvam Bulbul v3 FEMALE speakers — approved voices, but only for a female presenter. */
export const FEMALE_VOICES = [
  'ritu', 'priya', 'kavitha', 'shreya', 'neha', 'pooja', 'roopa', 'ishita', 'simran', 'tanya',
] as const;

/** LAW §1 — narration fit. Words spoken inside a shot may not exceed seconds x this. */
export const WORDS_PER_SECOND = 2.3;

export type Severity = 'blocker' | 'major' | 'minor' | 'nit';
export type Verdict = 'ship' | 'ship_with_notes' | 'block';

/** How a finding gets fixed. Decides whether the render path can self-heal at $0. */
export type FixClass = 'auto_fixable' | 'needs_rerender' | 'advisory';

export const SEVERITY_RANK: Record<Severity, number> = { blocker: 0, major: 1, minor: 2, nit: 3 };

/** Guess a person's gender from a visual prompt. Used to catch a mid-reel gender switch. */
export function genderOf(text: string): 'male' | 'female' | 'unknown' {
  const t = ` ${text.toLowerCase()} `;
  const male = /\b(man|male|guy|he|his|him|gentleman|boy)\b/.test(t);
  const female = /\b(woman|female|lady|she|her|girl)\b/.test(t);
  if (male && !female) return 'male';
  if (female && !male) return 'female';
  return 'unknown';
}

export function voiceGender(voice: string): 'male' | 'female' | 'unknown' {
  const v = voice.toLowerCase();
  if ((APPROVED_VOICES as readonly string[]).some((x) => v.includes(x))) return 'male';
  if ((FEMALE_VOICES as readonly string[]).some((x) => v.includes(x))) return 'female';
  if (/neerja|aria|jenny|ananya|swara|kalpana/.test(v)) return 'female';
  if (/prabhat|madhur|guy|davis|arjun/.test(v)) return 'male';
  return 'unknown';
}

/** Every jargon hit in `text`, with its character offset. */
export function jargonHits(text: string): { term: string; index: number }[] {
  const out: { term: string; index: number }[] = [];
  for (const term of JARGON) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) out.push({ term, index: m.index });
  }
  return out;
}

export function wordCount(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}
