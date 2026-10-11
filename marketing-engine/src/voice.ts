/**
 * Programmatic anti-slop and ad-policy lint.
 * A draft that fails is not shipped. Regeneration is the caller's job.
 */

export const BANNED_PHRASES = [
  'unlock your',
  'elevate',
  'delve',
  'in today\'s fast-paced',
  'in todays fast-paced',
  'game-changer',
  'game changer',
  'tapestry',
  'seamless',
  'it\'s important to note',
  'it is important to note',
  'unlock the power',
  'take it to the next level',
  'swiss ephemeris',
  'lahiri',
  'guaranteed',
  'will definitely',
  '100%',
  'best hour',
  'worst hour',
  'free trial',
  'card-required free trial',
  'card required free trial',
] as const;

/** Meta personal-attributes and outcome claims. Ads only. */
const AD_PERSONAL = [
  /are you (stuck|broke|struggling|anxious|sick|single|lonely|depressed)/i,
  /your (marriage|debt|illness|anxiety|disease|bankruptcy)/i,
  /you will (get|find|land|pass|marry|conceive|heal)/i,
  /struggling with (money|debt|health|anxiety)/i,
  /we know (what you|your pain|you are)/i,
];

const HINDI_MARKERS = [
  'nahi', 'nahin', 'hai', 'hain', 'aapka', 'aap', 'subah', 'shaam', 'bheje', 'bheja',
  'farq', 'poochta', 'dimaag', 'tees', 'atharah', 'mahine', 'paisa', 'katta', 'vaada',
  'khidki', 'pehle', 'wala', 'wali', 'mein', 'kar', 'sakta', 'dete',
];

export interface LintResult {
  ok: boolean;
  errors: string[];
}

export interface LintOpts {
  kind: 'script' | 'ad' | 'carousel' | 'blog' | 'email' | 'caption';
  /** hindi drafts must not be an English sentence with a few words swapped. */
  lang?: 'en' | 'hi' | 'hinglish';
}

function sentences(text: string): string[] {
  return text
    .replace(/<[^>]+>/g, ' ')
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, n) => a + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

export function lintCopy(text: string, opts: LintOpts): LintResult {
  const errors: string[] = [];
  const raw = text.trim();
  if (raw.length < 40) errors.push('too short to be a real draft');
  const lower = raw.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) errors.push(`banned phrase: ${phrase}`);
  }
  const em = (raw.match(/—/g) ?? []).length;
  if (em > 1) errors.push(`em dashes: ${em} (max 1)`);

  const triples = raw.match(/\b[\p{L}\p{N}]+,\s+[\p{L}\p{N}]+,\s+and\s+[\p{L}\p{N}]+/giu) ?? [];
  if (triples.length > 1) errors.push('repeated rule-of-three lists');

  if (!/\d|₹|\$|tuesday|मंगल|vedichour\.com|\/start|eighteen|atharah|अठारह/i.test(raw)) {
    errors.push('missing a concrete specific (number, price, weekday, or URL)');
  }

  const lens = sentences(raw).map((s) => words(s).length).filter((n) => n > 0);
  if (lens.length >= 4 && stdev(lens) < 2) {
    errors.push(`sentence length too uniform (stdev ${stdev(lens).toFixed(2)}, ${lens.length} sentences)`);
  }

  if (opts.kind === 'ad') {
    for (const re of AD_PERSONAL) {
      if (re.test(raw)) errors.push(`personal-attribute or outcome claim: ${re.source}`);
    }
  }

  if (opts.lang === 'hinglish' || opts.lang === 'hi') {
    const tokens = words(lower.replace(/[।,.!?]/g, ''));
    const hits = tokens.filter((t) => HINDI_MARKERS.includes(t)).length;
    const devanagari = (raw.match(/[\u0900-\u097F]/g) ?? []).length;
    if (opts.lang === 'hi' && devanagari < 40) errors.push('Hindi draft has too little Devanagari to be a rewrite');
    if (opts.lang === 'hinglish' && hits < 8) errors.push(`Hinglish draft has only ${hits} Hindi markers (need 8). Do not word-swap the English.`);
  }

  return { ok: errors.length === 0, errors };
}
