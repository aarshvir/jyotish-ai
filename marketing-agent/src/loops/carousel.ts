/**
 * L3c — CAROUSEL. Turn an approved creative into 6–8 posted-ready PNG slides plus a caption pack.
 *
 * Ported 2026-09-06 from the parallel build (`marketing-engine/src/loops/*` + its
 * `src/render/carousel.ts`) and re-cut to this engine's law:
 *
 *   - $0 and local. Playwright + an HTML template. No model call, no metered API, nothing to spend.
 *     The slide copy comes from the creative that already passed preflight and the tournament;
 *     this loop composes, it does not write.
 *   - docs/DESIGN_SYSTEM.md, not the source's Google-Fonts template: two canvases (NIGHT for the
 *     cover and the close, PAPER for everything a person reads), Cormorant headlines, DM Sans body
 *     and numbers, the site's own self-hosted woff2 files.
 *   - CLAUDE.md §1: jargon is a HARD BLOCK, not a warning. Any line carrying "Swiss Ephemeris",
 *     "Lahiri", "ayanamsa" and friends is dropped before it can reach a slide, and the loop
 *     refuses to write a carousel whose composed copy still contains one. Same list the creative
 *     engine and the linter use (`jargonHits`), so the three can never disagree.
 *   - The last slide is always the close: vedichour.com plus the reflection-and-planning
 *     disclaimer. It is not optional and not derived from the creative.
 *
 * Output: output/carousels/<slug>/slide-NN.png (+ slide-NN.html for inspection),
 * caption.md (what the owner pastes) and carousel.json (the machine-readable pack that
 * loop:package folds into ready-to-post).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logRun, ROOT } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, utm } from '../brand';
import { jargonHits, lint } from '../policy/linter';
import { brandFontsAvailable, renderCarouselSlides, type CarouselSlide } from '../render/carousel';

export const CAROUSEL_OUT = resolve(ROOT, 'output', 'carousels');
const CREATIVE_DIR = resolve(ROOT, 'output', 'creative');

/** 6 is the minimum that still tells a story; 8 is where Instagram swipe-through falls off. */
export const MIN_SLIDES = 6;
export const MAX_SLIDES = 8;

type Json = Record<string, unknown>;

function asRecord(v: unknown): Json {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

export function loadCreative(slug: string): Json {
  const base = slug.replace(/-v\d+$/, '');
  for (const f of [resolve(CREATIVE_DIR, `${slug}.json`), resolve(CREATIVE_DIR, `${base}.json`)]) {
    if (!existsSync(f)) continue;
    try {
      return asRecord(JSON.parse(readFileSync(f, 'utf8')));
    } catch {
      /* fall through to the next candidate */
    }
  }
  throw new Error(`no creative JSON for "${slug}" under output/creative/`);
}

/**
 * The spoken lines of the creative, in order, with the jargon ones DROPPED (not rewritten — this
 * loop does not author copy, and a silently reworded line is a lie about what was approved).
 */
export function usableLines(creative: Json): string[] {
  const shots = Array.isArray(creative.shots) ? creative.shots : [];
  const out: string[] = [];
  for (const raw of shots) {
    const s = asRecord(raw);
    const line = str(s.dialogue, str(s.vo, str(s.narration)));
    if (!line) continue;
    if (jargonHits(line).length) continue;
    if (line.length > 190) continue; // too long to read on a slide; the reel keeps it
    if (out.includes(line)) continue;
    out.push(line);
  }
  return out;
}

/** Sentence-case section labels, in the order a carousel earns attention. */
const STORY_KICKERS = ['The moment', 'What is actually going on', 'The part people skip'];

/**
 * Compose the slide deck. Deterministic and browser-free, so it is unit-testable and so a
 * composition defect is caught before Chromium is ever launched.
 */
export function buildSlides(creative: Json): CarouselSlide[] {
  const hook = str(creative.hook, str(creative.title, 'Your day is not one mood.'));
  const lines = usableLines(creative);
  const slides: CarouselSlide[] = [];

  slides.push({
    kind: 'cover',
    canvas: 'night',
    kicker: BRAND.pillars[0], // "Not another horoscope"
    headline: hook,
    body: '',
  });

  const story = lines.filter((l) => l !== hook).slice(0, 3);
  story.forEach((line, i) => {
    slides.push({
      kind: 'story',
      canvas: 'paper',
      kicker: STORY_KICKERS[i] ?? STORY_KICKERS[STORY_KICKERS.length - 1],
      headline: line,
      body: '',
    });
  });

  slides.push({
    kind: 'proof',
    canvas: 'paper',
    kicker: 'What the report actually is',
    headline: 'Eighteen hour-slots, rated against your own birth chart.',
    body: BRAND.adSafeDifferentiators.slice(1).join('. ') + '.',
  });

  slides.push({
    kind: 'howto',
    canvas: 'paper',
    kicker: 'How you use it',
    headline: 'Put the heavy conversation in a clearer window.',
    body: 'Not a mood for the whole day. A grid of hours, so you can move the hard thing an hour or two and see what changes.',
  });

  // Pad only if a thin creative left us under the minimum — never with invented product claims.
  while (slides.length < MIN_SLIDES - 1) {
    slides.push({
      kind: 'story',
      canvas: 'paper',
      kicker: 'Same day, different hours',
      headline: BRAND.pillars[1], // "Your day is not one mood"
      body: 'Clearer windows and heavier windows, in plain English.',
    });
  }

  // The close is always last and always the same promise. Non-negotiable.
  const close: CarouselSlide = {
    kind: 'close',
    canvas: 'night',
    kicker: BRAND.taglineClose,
    headline: 'vedichour.com',
    body: 'Build a free chart and read one real day.',
    footnote: BRAND.disclaimer,
  };

  const trimmed = slides.slice(0, MAX_SLIDES - 1);
  trimmed.push(close);
  return trimmed;
}

/** The text the owner pastes with the images. */
export function buildCaption(creative: Json, slug: string): { caption: string; hashtags: string[]; link: string } {
  const hook = str(creative.hook, str(creative.title, 'Your day is not one mood.'));
  const publish = asRecord(creative.publish);
  const hashtags = (Array.isArray(publish.hashtags) ? publish.hashtags.map(String) : [])
    .filter((h) => h.startsWith('#'))
    .slice(0, 12);
  const link = utm(BRAND.links.sampleReport, 'instagram', 'carousel', 'content_ops', slug);
  const caption = [
    hook,
    '',
    'Swipe → eighteen hour-slots, rated against your own birth chart. Clearer windows and heavier ones, in plain English.',
    '',
    `Read a sample day: ${link}`,
    BRAND.taglineClose,
    '',
    BRAND.disclaimer,
    hashtags.length ? `\n${hashtags.join(' ')}` : '',
  ]
    .join('\n')
    .trim();
  return { caption, hashtags: hashtags.length ? hashtags : ['#vedichour', '#vedictiming'], link };
}

export interface CarouselResult {
  slug: string;
  dir: string;
  pngs: string[];
  caption: string;
  hashtags: string[];
  link: string;
  linter: { verdict: string; reason: string };
}

/** Every string that will be visible to a stranger — the jargon and lint gate reads this. */
export function visibleText(slides: CarouselSlide[], caption: string): string {
  return [...slides.flatMap((s) => [s.kicker, s.headline, s.body, s.footnote ?? '']), caption].join('\n');
}

export async function renderCarouselForSlug(slug: string): Promise<CarouselResult> {
  const creative = loadCreative(slug);
  const slides = buildSlides(creative);
  const { caption, hashtags, link } = buildCaption(creative, slug);

  // CLAUDE.md §1: $0 gate on the INPUTS, hard-block, before Chromium is launched.
  const hits = jargonHits(visibleText(slides, caption));
  if (hits.length) {
    throw new Error(
      `carousel copy still contains ad-copy jargon (${hits.join(', ')}) — say "real astronomical data" instead. No slide written.`,
    );
  }
  if (slides.length < MIN_SLIDES || slides.length > MAX_SLIDES) {
    throw new Error(`carousel must be ${MIN_SLIDES}–${MAX_SLIDES} slides, got ${slides.length}`);
  }
  if (slides[slides.length - 1].kind !== 'close') throw new Error('last slide must be the close card');

  const dir = resolve(CAROUSEL_OUT, slug);
  const rendered = await renderCarouselSlides(slides, dir, {
    onProgress: (m) => console.log(`[carousel]   ${m}`),
  });

  const lintRes = await lint(caption, { classify: false, context: 'ad' });
  const pack: CarouselResult = {
    slug,
    dir,
    pngs: rendered.map((r) => r.png),
    caption,
    hashtags,
    link,
    linter: { verdict: lintRes.verdict, reason: lintRes.reason },
  };
  writeFileSync(resolve(dir, 'carousel.json'), JSON.stringify({ ...pack, slides }, null, 2));
  writeFileSync(
    resolve(dir, 'caption.md'),
    [
      `# Instagram carousel — ${slug}`,
      '',
      `${rendered.length} slides: ${rendered.map((r) => `slide-${String(r.n).padStart(2, '0')}.png`).join(', ')}`,
      '',
      '## Caption (paste as-is)',
      '',
      caption,
      '',
      `_linter: ${lintRes.verdict} — ${lintRes.reason}_`,
      '',
    ].join('\n'),
  );
  return pack;
}

export async function runCarouselLoop(opts: { slug?: string } = {}): Promise<void> {
  const loop = 'carousel';
  if (isKilled()) {
    console.log(`[carousel] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  const t0 = Date.now();

  if (!brandFontsAvailable()) {
    // §2: never silently degrade a quality-critical component.
    throw new Error(
      'the site\'s self-hosted brand fonts are missing from public/fonts/ — a carousel rendered in a fallback serif is off-brand and will not be written.',
    );
  }

  const slugs = opts.slug
    ? [opts.slug]
    : existsSync(CREATIVE_DIR)
      ? readdirSync(CREATIVE_DIR)
          .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
          .map((f) => f.replace(/\.json$/, ''))
          .slice(0, 1)
      : [];
  if (!slugs.length) {
    console.log('[carousel] no creative to render. Pass a slug: npm run loop:carousel -- <slug>');
    logRun({ loop, status: 'skipped', detail: 'no creative' });
    return;
  }

  let n = 0;
  for (const slug of slugs) {
    try {
      const pack = await renderCarouselForSlug(slug);
      console.log(`[carousel] ${slug} → ${pack.pngs.length} slides in ${pack.dir}`);
      console.log(`[carousel] linter: ${pack.linter.verdict} — ${pack.linter.reason}`);
      n++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[carousel] ${slug} FAILED: ${msg}`);
      logRun({ loop, status: 'error', detail: `${slug}: ${msg.slice(0, 180)}` });
    }
  }
  if (n) {
    logRun({ loop, status: 'ok', detail: `${n}/${slugs.length} carousels`, duration_ms: Date.now() - t0 });
    writeHeartbeat(loop, `${n} carousel(s) rendered`);
  }
}
