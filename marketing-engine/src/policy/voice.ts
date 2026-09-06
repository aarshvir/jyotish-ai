import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG_DIR } from '../paths';

export type LintVerdict = 'pass' | 'flag' | 'block';

export interface VoiceLint {
  verdict: LintVerdict;
  reasons: string[];
  stats: {
    sentences: number;
    avgLen: number;
    stdev: number;
    emDashes: number;
    words: number;
    hasConcrete: boolean;
  };
}

interface Claims {
  block: string[];
  flag: string[];
  jargon: string[];
  adPersonalAttribute: string[];
}
interface Tics {
  phrases: string[];
  hiMachineTells: string[];
}

function loadClaims(): Claims {
  return JSON.parse(readFileSync(resolve(CONFIG_DIR, 'banned-claims.json'), 'utf8')) as Claims;
}
function loadTics(): Tics {
  return JSON.parse(readFileSync(resolve(CONFIG_DIR, 'ai-tics.json'), 'utf8')) as Tics;
}

const CONCRETE_RE =
  /\b(\d{1,2}:\d{2}|\d{1,2}\s?(am|pm)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hr\b|papa|maa|mumma|metro|andheri|bandra|bengaluru|noida|gurgaon|gurugram|upi|swiggy|zomato|courier|lease|broker|balcony|chai|auto|local train|indigo|spicejet)\b/i;

const DEVANAGARI = /[\u0900-\u097F]/;

function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.?!।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

export function lintVoice(text: string, opts: { context?: 'organic' | 'ad'; language?: 'en' | 'hi' | 'hinglish' } = {}): VoiceLint {
  const context = opts.context ?? 'organic';
  const reasons: string[] = [];
  let verdict: LintVerdict = 'pass';
  const bump = (v: LintVerdict, reason: string) => {
    reasons.push(reason);
    if (v === 'block') verdict = 'block';
    else if (v === 'flag' && verdict !== 'block') verdict = 'flag';
  };

  const raw = text ?? '';
  const lower = raw.toLowerCase();
  const claims = loadClaims();
  const tics = loadTics();

  const hitBlock = claims.block.find((w) => lower.includes(w.toLowerCase()));
  if (hitBlock) bump('block', `banned claim: "${hitBlock}"`);

  const hitFlag = claims.flag.find((w) => lower.includes(w.toLowerCase()));
  if (hitFlag) bump('flag', `sensitive phrase: "${hitFlag}"`);

  if (context === 'ad') {
    const j = claims.jargon.find((w) => lower.includes(w.toLowerCase()));
    if (j) bump('block', `ad jargon: "${j}"`);
    const pa = claims.adPersonalAttribute.find((w) => lower.includes(w.toLowerCase()));
    if (pa) bump('block', `Meta personal-attribute pattern: "${pa}"`);
  }

  for (const p of tics.phrases) {
    if (lower.includes(p.toLowerCase())) bump('block', `AI-tic: "${p}"`);
  }
  if (opts.language === 'hi' || DEVANAGARI.test(raw)) {
    for (const p of tics.hiMachineTells) {
      if (raw.includes(p)) bump('block', `Hindi machine-tell: "${p}"`);
    }
  }

  const emDashes = (raw.match(/[—–]/g) ?? []).length;
  const words = wordCount(raw.replace(/https?:\/\/\S+/g, ''));
  if (words > 40 && emDashes > Math.max(1, Math.floor(words / 150))) {
    bump('block', `em-dash tic (${emDashes} in ${words} words)`);
  }

  const sentences = sentencesOf(raw);
  const lens = sentences.map(wordCount);
  const avgLen = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const sd = stdev(lens);
  const spread = lens.length ? Math.max(...lens) - Math.min(...lens) : 0;
  // AI-slop is medium sentences all the same length. Punchy hooks (2 words next to 18) must pass.
  if (sentences.length >= 6 && spread < 8 && avgLen >= 10 && avgLen <= 22) {
    bump('block', `sentence length too uniform (spread ${spread}, avg ${avgLen.toFixed(1)})`);
  }
  if (sentences.length >= 4 && avgLen > 28) {
    bump('flag', `sentences too long on average (${avgLen.toFixed(1)} words)`);
  }

  const hasConcrete = CONCRETE_RE.test(raw) || /\b\d{1,2}\s?(baje|pm|am)\b/i.test(raw);
  if (words > 40 && !hasConcrete && opts.language !== 'hi') {
    bump('block', 'missing concrete specific (a clock time, weekday, or lived Indian detail)');
  }

  const stats = { sentences: sentences.length, avgLen, stdev: sd, emDashes, words, hasConcrete };
  if (verdict === 'pass' && !reasons.length) reasons.push('clean');
  return { verdict, reasons, stats };
}

export function lintMany(chunks: { label: string; text: string; context?: 'organic' | 'ad'; language?: 'en' | 'hi' | 'hinglish' }[]): VoiceLint {
  const merged: VoiceLint = {
    verdict: 'pass',
    reasons: [],
    stats: { sentences: 0, avgLen: 0, stdev: 0, emDashes: 0, words: 0, hasConcrete: false },
  };
  for (const c of chunks) {
    const r = lintVoice(c.text, { context: c.context, language: c.language });
    if (r.verdict === 'block') merged.verdict = 'block';
    else if (r.verdict === 'flag' && merged.verdict !== 'block') merged.verdict = 'flag';
    merged.reasons.push(...r.reasons.filter((x) => x !== 'clean').map((x) => `${c.label}: ${x}`));
    merged.stats.words += r.stats.words;
    merged.stats.sentences += r.stats.sentences;
    merged.stats.emDashes += r.stats.emDashes;
    merged.stats.hasConcrete = merged.stats.hasConcrete || r.stats.hasConcrete;
  }
  if (!merged.reasons.length) merged.reasons.push('clean');
  return merged;
}
