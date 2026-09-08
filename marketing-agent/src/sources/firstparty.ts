/**
 * FIRST-PARTY DEMAND — what our own users actually came here to ask about.
 *
 * Ported 2026-09-06 from the parallel build (`marketing-engine/src/sources/firstparty.ts`).
 * Everything public the engine senses (Google Trends, YouTube) is what *India* is asking. This is
 * the only signal that is what *our* users are asking, and it is by far the better one: it is the
 * demand that already walked through the door.
 *
 * PRIVACY IS THE WHOLE DESIGN, not a caveat on it.
 *
 *   `reports.personal_context` is the free-text box a person types their actual problem into —
 *   "my father's surgery is on the 14th", "should I resign before the appraisal". It sits in the
 *   same row as birth date, birth time, birth city, phone and email. It is the single most
 *   sensitive column in this product.
 *
 *   So: the text is read, bucketed IN MEMORY, and dropped. What leaves this module is a count per
 *   category and nothing else. No verbatim text, no excerpt, no hash of the text, no id, no
 *   birth field, no email, no phone — a hash is still a per-person identifier that can be joined
 *   back, so the source's `discardedHashes` counter did not come across either. Nothing here ever
 *   prints a context line to the console or writes one to disk, and `firstparty.test.ts` proves
 *   it mechanically rather than by inspection.
 *
 *   The select list is explicit and minimal for the same reason — `select=*` on this table would
 *   pull every birth field into process memory for no reason at all.
 *
 * The counts feed `state/sense.json` as a `demand` block, so content-ops ideation weights the
 * categories real people ask about instead of the ones the seed file guessed at in 2026-07.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { resolveSupabase, sbGet } from '../supabase';

export const STATE_DIR = resolve(ROOT, 'state');
export const FIRSTPARTY_FILE = resolve(STATE_DIR, 'firstparty.json');

/** The fixed bucket set. `other` always exists so nothing is silently dropped from the total. */
export const CATEGORIES = [
  'career',
  'marriage',
  'relationships',
  'family',
  'health',
  'money',
  'study',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Ordered — first match wins, so the more specific bucket is tested before the broader one
 * ("shaadi ke liye ladka" is marriage, not relationships; "papa ki surgery" is health, not family).
 * Hindi/Hinglish matters here: most of this box is typed in it.
 */
const RULES: { category: Exclude<Category, 'other'>; re: RegExp }[] = [
  {
    category: 'health',
    re: /\b(surgery|operation|hospital|illness|ill|disease|treatment|doctor|medical|recovery|diagnos\w*|therapy)\b|ऑपरेशन|अस्पताल|इलाज|बीमार/i,
  },
  {
    category: 'marriage',
    re: /\b(marriage|marry|marrying|shaadi|shadi|vivah|wedding|manglik|kundli match|matchmaking|engagement|rishta|in-?laws?|divorce)\b|शादी|विवाह|रिश्ता/i,
  },
  {
    category: 'study',
    re: /\b(exam|exams|study|studies|college|university|admission|entrance|jee|neet|upsc|cat exam|gate|semester|thesis|scholarship)\b|परीक्षा|पढ़ाई|कॉलेज/i,
  },
  {
    category: 'career',
    re: /\b(job|career|work|office|boss|manager|hr|resign|resignation|quit|interview|appraisal|promotion|salary|hike|offer letter|naukri|notice period|switch)\b|नौकरी|इस्तीफा|इंटरव्यू/i,
  },
  {
    category: 'money',
    re: /\b(money|loan|emi|debt|invest\w*|property|flat|house|plot|rent|lease|business|startup|shop|gst|client|funding|savings?|finance)\b|पैसा|कर्ज|मकान|फ्लैट|व्यापार/i,
  },
  {
    category: 'relationships',
    re: /\b(relationship|girlfriend|boyfriend|partner|breakup|break-?up|ex\b|dating|love|crush|propose|reconcile|apolog\w*)\b|रिश्ते|प्यार|ब्रेकअप/i,
  },
  {
    category: 'family',
    re: /\b(family|papa|dad|father|mom|mother|maa|parents|son|daughter|child|children|baby|brother|sister|home)\b|पापा|माँ|परिवार|बच्चा/i,
  },
];

/** Bucket one string. Pure and text-in/label-out — the text is never retained. */
export function classify(text: string): Category {
  const t = String(text ?? '');
  for (const r of RULES) if (r.re.test(t)) return r.category;
  return 'other';
}

export interface CategoryCount {
  category: Category;
  n: number;
  /** Share of classified entries, 0-1, rounded to 3dp. */
  share: number;
}

export interface DemandCounts {
  ts: string;
  /** How many free-text entries were classified. A count, not a list. */
  total: number;
  categories: CategoryCount[];
  source: string;
}

/**
 * Aggregate texts into counts. The ONLY function that ever sees the strings, and it returns a
 * structure whose every string field is a category name or a fixed label. Exported so the test
 * can prove that property against adversarial inputs without a network call.
 */
export function aggregate(texts: string[], source = 'reports.personal_context'): DemandCounts {
  const counts = new Map<Category, number>();
  let total = 0;
  for (const raw of texts) {
    const text = String(raw ?? '').trim();
    if (text.length < 8) continue; // "ok", "-", "test" carry no demand signal
    total++;
    const c = classify(text);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const categories = CATEGORIES.map((category) => {
    const n = counts.get(category) ?? 0;
    return { category, n, share: total ? Math.round((n / total) * 1000) / 1000 : 0 };
  })
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  return { ts: new Date().toISOString(), total, categories, source };
}

const PAGE = 1000;
const MAX_ROWS = 5000;

/**
 * Read personal_context, classify, and return counts. The array of texts never leaves this
 * function's stack frame.
 */
export async function firstPartyDemand(): Promise<DemandCounts> {
  const sb = await resolveSupabase();
  if (!sb) throw new Error('no Supabase service-role credentials — first-party demand cannot be read');

  const texts: string[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    // Explicit, minimal select. Never `*` on a table holding birth time and phone number.
    const rows = (await sbGet(
      sb,
      `reports?select=personal_context&personal_context=not.is.null&order=created_at.desc&limit=${PAGE}&offset=${offset}`,
    )) as { personal_context: string | null }[];
    for (const r of rows ?? []) if (r.personal_context) texts.push(r.personal_context);
    if (!rows || rows.length < PAGE) break;
  }
  return aggregate(texts);
}

/** Persist the counts, and only the counts. */
export function writeDemand(counts: DemandCounts): string {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(FIRSTPARTY_FILE, JSON.stringify(counts, null, 2));
  return FIRSTPARTY_FILE;
}

export function readDemand(): DemandCounts | null {
  if (!existsSync(FIRSTPARTY_FILE)) return null;
  try {
    return JSON.parse(readFileSync(FIRSTPARTY_FILE, 'utf8')) as DemandCounts;
  } catch {
    return null;
  }
}

/**
 * The block injected into the ideate prompt. Unlike the public-trend digest, this is OUR OWN
 * aggregate — there is no untrusted stranger text in it, because there is no text in it at all.
 */
export function demandDigest(): string {
  const d = readDemand();
  if (!d || !d.total || !d.categories.length) return '';
  const rows = d.categories.map((c) => `- ${c.category}: ${c.n} (${Math.round(c.share * 100)}%)`).join('\n');
  return `WHAT OUR OWN USERS ASK ABOUT (aggregate category counts from ${d.total} free-text entries, no quotes retained)
Weight ideas toward the categories people actually bring us. These are counts, not quotes: never
claim a specific user said anything, and never write copy that implies you read someone's message.
${rows}
`;
}

/** `npm run loop:firstparty` — prints counts only, by construction. */
export async function runFirstPartyLoop(): Promise<DemandCounts> {
  const counts = await firstPartyDemand();
  const file = writeDemand(counts);
  console.log(`[firstparty] ${counts.total} free-text entries classified from ${counts.source}`);
  for (const c of counts.categories) {
    console.log(`             ${c.category.padEnd(14)} ${String(c.n).padStart(5)}  ${(c.share * 100).toFixed(1)}%`);
  }
  console.log(`[firstparty] wrote ${file} — category counts only. No verbatim text, no birth data, no identifiers.`);
  return counts;
}
