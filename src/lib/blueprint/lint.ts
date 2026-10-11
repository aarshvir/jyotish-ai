/**
 * Content lint for generated Blueprint text.
 *
 * Layers, all applied to every paragraph a model writes (and, in tests, to everything we
 * write by hand):
 *   1. H5 banned deterministic-fear terms (VEDICHOUR_QUIZ_SPEC §2, shared with the reveal).
 *   2. Extra bans that follow from H5: family-planning outcomes, remedy selling, certainty.
 *   3. Grounding: a sign, house or date the facts never mentioned is a made-up fact.
 */

import { SIGNS } from '@/lib/funnel/reveal/astro';
import { h5Hits } from '@/lib/funnel/reveal/lint';

const EXTRA: { term: string; re: RegExp }[] = [
  { term: 'conception / fertility', re: /\b(conceiv\w*|conception|fertil\w*|abortion|baby|babies)\b/i },
  { term: 'loss / harm prediction', re: /\b(you will (suffer|fail|be hurt|get hurt|break)|ruin\w*|disaster\w*|catastroph\w*|tragic\w*|harm\w*)\b/i },
  { term: 'remedy selling', re: /\b(gemstones?|puja|pooja|havan|hawan|yagya|yagna|tantri\w*|talisman|amulet|rudraksha|ritual to (remove|cure))\b/i },
  { term: 'certainty', re: /\b(guarantee[sd]?|definitely will|certainly will|for sure|without a doubt|100 ?%)\b/i },
  { term: 'fear framing', re: /\b(beware|be afraid|dreaded|malefic curse|afflict\w*)\b/i },
];

/** Terms that break the reader's own "calm" request, applied only when they asked for calm. */
const ANXIOUS = /\b(avoid|warning|warn|bad|harmful|risky|dangerous|unlucky|inauspicious)\b/i;

export function bannedHits(text: string, opts: { calm?: boolean } = {}): string[] {
  const hits = h5Hits(text);
  for (const e of EXTRA) if (e.re.test(text)) hits.push(e.term);
  if (opts.calm && ANXIOUS.test(text)) hits.push('anxious wording (reader asked for calm)');
  return hits;
}

const SIGN_RE = new RegExp(`\\b(${SIGNS.join('|')})\\b`, 'g');
const HOUSE_RE = /\b(\d{1,2})(?:st|nd|rd|th) house/gi;
const ORDINAL_RE = /\b\d{1,2}(?:st|nd|rd|th)\b/g;
const DATE_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;

/** Signs, houses and ISO dates written in `text` that do not appear in `allowed`. */
export function ungrounded(text: string, allowed: string): string[] {
  const issues: string[] = [];
  const known = (re: RegExp, s: string) => new Set(Array.from(s.matchAll(re)).map((m) => m[0].toLowerCase()));
  const allowedSigns = known(SIGN_RE, allowed);
  for (const m of Array.from(text.matchAll(SIGN_RE))) if (!allowedSigns.has(m[0].toLowerCase())) issues.push(`sign ${m[0]} is not in the facts`);
  // Any ordinal the facts use ("6th and 12th houses" included) counts as a house they mention.
  const allowedOrdinals = known(ORDINAL_RE, allowed);
  for (const m of Array.from(text.matchAll(HOUSE_RE))) if (!allowedOrdinals.has(m[0].split(/\s+/)[0].toLowerCase())) issues.push(`${m[0]} is not in the facts`);
  const allowedDates = known(DATE_RE, allowed);
  for (const m of Array.from(text.matchAll(DATE_RE))) if (!allowedDates.has(m[0].toLowerCase())) issues.push(`date ${m[0]} is not in the facts`);
  return Array.from(new Set(issues));
}

export function wordsIn(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** What the model may be told of something the reader typed: their words, unless those words are themselves banned content. */
export function modelSafe(text: string | null | undefined, stand = 'a personal date'): string {
  const t = (text ?? '').trim();
  return t && bannedHits(t).length === 0 ? t : stand;
}
