/**
 * L3b — multi-platform packaging (IG Reels, YT Shorts, YT 8-12m outline, GBP, IG carousel).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { logRun, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { BRAND, BRAND_BRIEF, utm } from '../brand';
import { canPublish } from '../audit/approvals';

const REELS_OUT = resolve(ROOT, 'output', 'reels');

export interface PackageOpts {
  slug?: string;
}

type Json = Record<string, unknown>;

function asRecord(v: unknown): Json {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}

function loadJson(path: string): Json | null {
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function loadPublish(slug: string): Json {
  return loadJson(resolve(REELS_OUT, slug, 'publish.json')) ?? {};
}

function loadCreative(slug: string): Json {
  const base = slug.replace(/-v\d+$/, '');
  for (const f of [
    resolve(ROOT, 'output', 'creative', `${slug}.json`),
    resolve(ROOT, 'output', 'creative', `${base}.json`),
  ]) {
    const hit = loadJson(f);
    if (hit) return hit;
  }
  return {};
}

function listSlugs(explicit?: string): string[] {
  if (explicit) return [explicit];
  if (!existsSync(REELS_OUT)) return [];
  return readdirSync(REELS_OUT).filter(
    (d) => existsSync(resolve(REELS_OUT, d, 'final.mp4')) || existsSync(resolve(REELS_OUT, d, 'publish.json')),
  );
}

async function lintCopy(text: string) {
  const r = await lint(text, { classify: false, context: 'ad' });
  return { verdict: r.verdict, reason: r.reason };
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function carouselSlides(pub: Json, creative: Json) {
  const hook = str(pub.hook, str(creative.hook, str(creative.hookText, 'Your day is not one mood')));
  const fromCreative = Array.isArray(creative.onScreenCaptions)
    ? creative.onScreenCaptions.map((s) => String(s))
    : [];
  const captions = fromCreative.length
    ? fromCreative
    : str(pub.caption)
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
  return [
    { title: 'Hook', body: hook },
    { title: 'The tension', body: captions[1] ?? captions[0] ?? 'Same day. Different windows.' },
    { title: 'The proof', body: '18 hour-slots on YOUR chart — clearer vs heavier for the task.' },
    { title: 'How it feels', body: captions[2] ?? 'Not a sun-sign mood. A timing grid.' },
    { title: 'CTA', body: `Try VedicHour.com — free kundli start. ${BRAND.taglineClose}` },
  ];
}

export function longformOutline(pub: Json, creative: Json): string {
  const hook = str(pub.youtubeTitle, str(creative.youtubeTitle, str(creative.hook, 'Timing your day')));
  const shots = Array.isArray(creative.shots)
    ? creative.shots
    : Array.isArray(creative.shotList)
      ? creative.shotList
      : [];
  const chapters = shots.map((raw, i) => {
    const s = asRecord(raw);
    const label = str(s.role, str(s.kind, `beat-${i + 1}`));
    const line = str(s.dialogue, str(s.vo, str(s.narration))).trim();
    return `### ${i + 1}. ${label} (~${s.seconds ?? '?'}s)\n${line || '_visual beat_'}`;
  });
  const diffs = BRAND.adSafeDifferentiators.map((d) => `- ${d}`).join('\n');
  return [
    `# YouTube long-form outline (8–12 min) — ${hook}`,
    '',
    '> Expand the winning Reel. No fake testimonials. Say VedicHour.com. Show REPORT, never checkout.',
    '',
    '## Cold open',
    hook,
    '',
    '## What VedicHour does',
    diffs,
    '',
    '## Beats',
    chapters.join('\n\n') || '_from publish description_',
    '',
    '## Close',
    `Try VedicHour.com. ${BRAND.disclaimer}`,
    '',
  ].join('\n');
}

export async function packageSlug(slug: string): Promise<string[]> {
  const dir = resolve(REELS_OUT, slug);
  const pkgDir = resolve(dir, 'packages');
  mkdirSync(pkgDir, { recursive: true });
  const pub = loadPublish(slug);
  const creative = loadCreative(slug);
  const landing = BRAND.links.freeKundli;
  const written: string[] = [];
  const platforms = asRecord(pub.platforms);
  const igPlat = asRecord(platforms.instagram);
  const ytPlat = asRecord(platforms.youtube);
  const igCaption = str(
    igPlat.caption,
    `${str(pub.caption, str(creative.hook))}\n\n${BRAND.taglineClose}`.trim(),
  );
  const ytCaption = str(ytPlat.caption, str(pub.youtubeTitle, igCaption));
  const hashtags: string[] = Array.isArray(pub.hashtags)
    ? pub.hashtags.map(String)
    : Array.isArray(igPlat.hashtags)
      ? igPlat.hashtags.map(String)
      : ['#vedichour', '#vedicastrology', '#jyotish'];
  const video = existsSync(resolve(dir, 'final.mp4')) ? resolve(dir, 'final.mp4') : null;
  const ig = {
    platform: 'instagram_reels',
    aspect: '9:16',
    video,
    caption: igCaption,
    hashtags,
    link: utm(landing, 'instagram', 'reel', 'content_ops', slug),
    endCard: 'vedichour.com',
    linter: await lintCopy(igCaption),
    approvedToPublish: canPublish(slug),
  };
  writeFileSync(resolve(pkgDir, 'instagram-reels.json'), JSON.stringify(ig, null, 2));
  written.push(resolve(pkgDir, 'instagram-reels.json'));
  const shorts = {
    platform: 'youtube_shorts',
    aspect: '9:16',
    video,
    title: str(pub.youtubeTitle, `${str(creative.hook, slug)} | VedicHour`),
    description: str(pub.description, ytCaption),
    tags: Array.isArray(pub.tags) ? pub.tags.map(String) : ['vedic astrology', 'hora', 'kundli', 'vedichour'],
    link: utm(landing, 'youtube', 'short', 'content_ops', slug),
    endCard: 'vedichour.com',
    linter: await lintCopy(str(pub.youtubeTitle, ytCaption)),
    approvedToPublish: canPublish(slug),
  };
  writeFileSync(resolve(pkgDir, 'youtube-shorts.json'), JSON.stringify(shorts, null, 2));
  written.push(resolve(pkgDir, 'youtube-shorts.json'));
  writeFileSync(resolve(pkgDir, 'youtube-longform-outline.md'), longformOutline(pub, creative));
  written.push(resolve(pkgDir, 'youtube-longform-outline.md'));
  const gbpBody = [
    str(creative.hook, str(pub.hook, 'Your day is not one mood.')),
    '',
    'VedicHour rates the hours of your day against your birth chart — clearer vs heavier windows.',
    '',
    `Start free: ${utm(landing, 'google', 'gbp', 'content_ops', slug)}`,
    BRAND.taglineClose,
  ].join('\n');
  const gbp = {
    platform: 'google_business_profile',
    body: gbpBody,
    cta: 'Learn more',
    link: utm(landing, 'google', 'gbp', 'content_ops', slug),
    linter: await lintCopy(gbpBody),
    approvedToPublish: canPublish(slug),
    notes: 'No fake reviews.',
  };
  writeFileSync(resolve(pkgDir, 'google-business.json'), JSON.stringify(gbp, null, 2));
  written.push(resolve(pkgDir, 'google-business.json'));
  const slides = carouselSlides(pub, creative);
  const carousel = {
    platform: 'instagram_carousel',
    slides,
    caption: `${slides[0].body}\n\nSwipe →\n\n${BRAND.taglineClose}\n${hashtags.join(' ')}`,
    link: utm(landing, 'instagram', 'carousel', 'content_ops', slug),
    craft: { noMandalaCollage: true, proofSlideRequired: true },
    linter: await lintCopy(slides.map((s) => s.body).join('\n')),
    approvedToPublish: canPublish(slug),
  };
  writeFileSync(resolve(pkgDir, 'instagram-carousel.json'), JSON.stringify(carousel, null, 2));
  written.push(resolve(pkgDir, 'instagram-carousel.json'));
  const index = {
    slug,
    brandBriefOneLiner: BRAND_BRIEF.slice(0, 120) + '…',
    packages: written.map((p) => p.replace(ROOT + '/', '')),
    blocked: [ig, shorts, gbp, carousel].some((x) => x.linter.verdict === 'block'),
    canPublish: canPublish(slug),
  };
  writeFileSync(resolve(pkgDir, 'index.json'), JSON.stringify(index, null, 2));
  written.push(resolve(pkgDir, 'index.json'));
  return written;
}

export async function runPackageLoop(opts: PackageOpts = {}): Promise<void> {
  const loop = 'package';
  if (isKilled()) {
    console.log(`[package] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  const slugs = listSlugs(opts.slug);
  if (!slugs.length) {
    console.log('[package] no reels to package under output/reels/.');
    logRun({ loop, status: 'skipped', detail: 'no reels' });
    return;
  }
  let n = 0;
  for (const slug of slugs) {
    try {
      const files = await packageSlug(slug);
      console.log(`[package] ${slug} → ${files.length} artifacts in packages/`);
      n++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[package] ${slug} failed: ${msg.slice(0, 160)}`);
    }
  }
  logRun({ loop, status: 'ok', detail: `${n}/${slugs.length} packaged` });
  writeHeartbeat(loop, `${n} reels packaged`);
}
