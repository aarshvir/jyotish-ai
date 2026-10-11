import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { QUIZ_SLUGS } from '@/config/quiz_slugs';
import { buildScreens, type T } from '@/lib/funnel/screens';
import { allInterstitialText } from '@/lib/funnel/interstitials';
import * as content from '@/lib/funnel/reveal/content';
import { LOCKED_SECTIONS } from '@/lib/funnel/reveal/content';
import { cardTitle, lockedTitle, revealChrome } from '@/lib/funnel/revealCopy';
import { consentText } from '@/lib/leads/consentText';
import { aiTells, claimHits } from '@/lib/funnel/toneLint';
import { h5Hits } from '@/lib/funnel/reveal/lint';

/**
 * One place that holds all funnel copy to the tone guide (ASTRO_INDIA_TEARDOWN §5.1):
 * no AI-voice words or shapes, no invented claims, short Hinglish sentences, one spelling
 * per Hinglish word, and no em dashes in anything a visitor reads. A native Hinglish and
 * Hindi editor is still the real check; this is the mechanical floor.
 */

interface Line {
  where: string;
  text: string;
  lang: 'en' | 'hi';
}

function funnelCopy(): Line[] {
  const out: Line[] = [];
  const addT = (where: string, t?: T) => {
    if (!t) return;
    out.push({ where, text: t.en, lang: 'en' }, { where, text: t.hi, lang: 'hi' });
  };
  const slug = QUIZ_SLUGS['repeating-lessons'];
  for (const s of Object.values(QUIZ_SLUGS)) {
    addT(`slug ${s.slug} question`, s.s01);
    addT(`slug ${s.slug} eyebrow`, s.eyebrow);
  }
  for (const s of buildScreens(slug)) {
    if ('title' in s) addT(`${s.id} title`, s.title as T);
    if ('subtitle' in s) addT(`${s.id} subtitle`, s.subtitle as T);
    if ('notice' in s) addT(`${s.id} notice`, s.notice as T);
    if ('toast' in s) addT(`${s.id} toast`, s.toast as T);
    if ('cta' in s) addT(`${s.id} cta`, s.cta as T);
    if ('options' in s) for (const o of s.options) addT(`${s.id}:${o.value}`, o.label);
  }
  for (const text of allInterstitialText()) out.push({ where: 'interstitial', text, lang: /\b(hai|aur|nahi|mein|ke|ka|ki|se|ko)\b/.test(text) ? 'hi' : 'en' });
  for (const lang of ['en', 'hi'] as const) {
    for (const k of ['notice', 'service', 'marketing'] as const) out.push({ where: `consent ${k}`, text: consentText(k, lang), lang });
    for (const v of Object.values(revealChrome(lang, 'Asha'))) if (v) out.push({ where: 'reveal chrome', text: v, lang });
  }
  const walk = (name: string, v: unknown) => {
    if (typeof v === 'string') out.push({ where: `reveal content ${name}`, text: v, lang: 'en' });
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x);
  };
  for (const [k, v] of Object.entries(content)) if (typeof v !== 'function') walk(k, v);
  return out;
}

const copy = funnelCopy();

describe('funnel copy holds to the tone guide', () => {
  it('covers a substantial amount of copy', () => {
    expect(copy.length).toBeGreaterThan(500);
  });

  it('has no AI-voice words or shapes', () => {
    for (const l of copy) expect(aiTells(l.text), `${l.where}: ${l.text.slice(0, 80)}`).toEqual([]);
  });

  it('makes no invented claim (counts, ratings, accuracy, urgency)', () => {
    for (const l of copy) expect(claimHits(l.text), `${l.where}: ${l.text.slice(0, 80)}`).toEqual([]);
  });

  it('keeps Hinglish sentences short and in Roman script', () => {
    for (const l of copy.filter((x) => x.lang === 'hi')) {
      expect(l.text, l.where).not.toMatch(/[ऀ-ॿ]/);
      for (const sentence of l.text.split(/(?<=[.?!])\s+/)) {
        const words = sentence.split(/\s+/).filter(Boolean).length;
        expect(words, `${l.where}: ${sentence}`).toBeLessThanOrEqual(18);
      }
    }
  });

  it('spells each Hinglish word one way', () => {
    const variants: [RegExp, string][] = [
      [/\bshadi\b|\bshaddi\b/i, 'shaadi'],
      [/\bkundali\b/i, 'kundli'],
      [/\bzaruri\b|\bjaruri\b|\bzarori\b/i, 'zaroori'],
      [/\btarikh\b|\btaareekh\b/i, 'tareekh'],
      [/\bsehet\b|\bsehat\b(?=.*\bsehet\b)/i, 'sehat'],
      [/\bnakshtra\b|\bnaksatra\b/i, 'nakshatra'],
      [/\bgher\b/i, 'ghar'],
      [/\bmahino\b|\bmahinon\b/i, 'mahine'],
    ];
    for (const l of copy.filter((x) => x.lang === 'hi'))
      for (const [re, canon] of variants) expect(re.test(l.text), `${l.where}: use "${canon}"`).toBe(false);
  });

  it('gives every locked section and card a Hinglish title', () => {
    for (const title of Object.values(LOCKED_SECTIONS)) expect(lockedTitle(title, 'hi'), title).not.toBe(title);
    for (const key of ['ketu', 'rahu', 'merit'] as const) {
      const card = { key, title: 'English title', paragraphs: [] } as never;
      expect(cardTitle(card, 'hi')).not.toBe('English title');
    }
  });
});

describe('the screens a visitor reads', () => {
  const root = path.resolve(__dirname, '../..');
  const files = [
    'src/components/funnel',
    'src/app/q',
    'src/app/chart-privacy',
    'src/app/what-we-never-say',
    'src/lib/funnel',
    'src/lib/leads/chartEmail.ts',
    'src/lib/leads/consentText.ts',
    'src/config/quiz_slugs.ts',
  ];
  // toneLint lists the banned words; the two art files use SVG attributes such as transform.
  const skip = new Set(['toneLint.ts', 'SceneArt.tsx', 'NodeChart.tsx']);

  function list(p: string): string[] {
    const full = path.join(root, p);
    if (fs.statSync(full).isFile()) return [full];
    return fs.readdirSync(full, { withFileTypes: true }).flatMap((d) => {
      const rel = path.join(p, d.name);
      return d.isDirectory() ? list(rel) : /\.(ts|tsx)$/.test(d.name) && !skip.has(d.name) ? [path.join(root, rel)] : [];
    });
  }
  /** Source without comments, so notes to developers are not held to the visitor's tone guide. */
  const visible = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('has no em dash in anything shown to a visitor', () => {
    for (const f of files.flatMap(list)) {
      const hits = visible(fs.readFileSync(f, 'utf8'))
        .split('\n')
        .filter((l) => l.includes('—'));
      expect(hits, path.relative(root, f)).toEqual([]);
    }
  });

  it('uses none of the AI-voice words in visitor-facing source', () => {
    const words = /\b(journey|unlock|unveil|unleash|cosmic|universe|embrace|empower|transform|harness|elevate|tapestry|delve|holistic|seamless|destiny|divine|celestial)\b/i;
    for (const f of files.flatMap(list)) {
      const text = visible(fs.readFileSync(f, 'utf8'));
      const m = words.exec(text);
      expect(m?.[0] ?? null, path.relative(root, f)).toBeNull();
    }
  });

  it('keeps banned never-say terms out of visitor-facing source, except in a refusal', () => {
    // content.ts and the interstitial refusals are covered by their own tests.
    const refuses = /\b(?:do not|does not|makes? no|never|nahi|koi bhavishyavani)\b/i;
    for (const l of copy) if (h5Hits(l.text).length) expect(l.text, l.where).toMatch(refuses);
  });
});
