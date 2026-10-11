/**
 * Tone lint for funnel copy (English and Roman-script Hinglish).
 *
 * The brief (ASTRO_INDIA_TEARDOWN §5.1) bans the words and shapes that make copy read as
 * machine-written, and the owner wants copy that does not look AI-generated. This is a
 * mechanical floor, not a style guide: it catches the tells that are cheap to catch. A
 * native-speaker read is still the real check for Hinglish.
 *
 * Used by the content tests; nothing at runtime depends on it.
 */

const WORDS = [
  'journey', 'unlock', 'unveil', 'unleash', 'cosmic', 'universe', 'embrace', 'empower', 'transform', 'harness',
  'elevate', 'navigate', 'tapestry', 'delve', 'dive', 'realm', 'beacon', 'testament', 'game-changer', 'seamless',
  'holistic', 'resonate', 'destiny', 'divine', 'celestial', 'ancient wisdom', 'true self', 'deeper truth',
  'brahmaand', 'kismat badal',
];
const WORD_RES = WORDS.map((w) => ({ w, re: new RegExp(`(^|[^a-z])${w.replace(/[-]/g, '[- ]')}(s|ed|ing)?([^a-z]|$)`, 'i') }));

const PHRASES: { name: string; re: RegExp }[] = [
  { name: "here's the thing", re: /here['’]s the thing/i },
  { name: "in today's", re: /\bin today['’]s\b/i },
  { name: "whether you're", re: /\bwhether you(?:['’]re| are)\b/i },
  { name: 'not just X but Y', re: /\bnot just\b[^.]{1,60}\bbut\b/i },
  { name: "it's not X, it's Y", re: /\bit['’]?s not\b[^.]{1,60},\s*it['’]?s\b/i },
  { name: 'exclamation mark', re: /!/ },
];

/** Names of every tell found in `text` (empty array means clean). */
export function aiTells(text: string): string[] {
  const hits: string[] = [];
  for (const { w, re } of WORD_RES) if (re.test(text)) hits.push(w);
  for (const p of PHRASES) if (p.re.test(text)) hits.push(p.name);
  // Em dashes are fine once in a while; a screen that leans on them reads as generated.
  if ((text.match(/—/g) ?? []).length > 1) hits.push('em dashes');
  return hits;
}

/**
 * Claims the funnel may never make (H4): invented numbers about other people, ratings,
 * accuracy figures, testimonials, countdowns. Matches wording, so a digit in "10th house"
 * is fine and "5,000 people" is not.
 */
const CLAIMS: { name: string; re: RegExp }[] = [
  { name: 'percentage', re: /\d\s?%/ },
  { name: 'count of people', re: /\b\d[\d,.]*\+?\s*(?:k|m|lakh|crore|million|thousand)?\s*(?:people|users|customers|readers|members|readings|seekers|women|men)\b/i },
  { name: 'crowd claim', re: /\b(?:thousands|millions|lakhs|crores|hundreds) of\b|\bmost people\b|\bpeople like you\b|\bothers like you\b|\bjoin(?:ed)?\b.{0,20}\bothers\b/i },
  { name: 'accuracy', re: /\baccura(?:te|cy)\b|\bguarantee[sd]?\b|\b100\s?%/i },
  { name: 'rating', re: /\brated\b|\b\d(?:\.\d)?\s?\/\s?5\b|\bfive[- ]star\b|\b\d+\s*stars?\b/i },
  { name: 'testimonial', re: /\btestimonials?\b|\breviews?\b/i },
  { name: 'urgency', re: /\bhurry\b|\blast chance\b|\bonly \d+ (?:left|spots|slots)\b|\bexpires?\b|\boffer ends\b|\blimited time\b/i },
];

export function claimHits(text: string): string[] {
  return CLAIMS.filter((c) => c.re.test(text)).map((c) => c.name);
}
