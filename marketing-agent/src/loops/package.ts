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
export interface PackageOpts { slug?: string }

function loadPublish(slug: string): any | null {
  const p = resolve(REELS_OUT, slug, 'publish.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}
function loadCreative(slug: string): any | null {
  const base = slug.replace(/-v\d+$/, '');
  for (const f of [resolve(ROOT, 'output', 'creative', `${slug}.json`), resolve(ROOT, 'output', 'creative', `${base}.json`)]) {
    if (!existsSync(f)) continue;
    try { return JSON.parse(readFileSync(f, 'utf8')); } catch { /* */ }
  }
  return null;
}
function listSlugs(explicit?: string): string[] {
  if (explicit) return [explicit];
  if (!existsSync(REELS_OUT)) return [];
  return readdirSync(REELS_OUT).filter((d) => existsSync(resolve(REELS_OUT, d, 'final.mp4')) || existsSync(resolve(REELS_OUT, d, 'publish.json')));
}
async function lintCopy(text: string) {
  const r = await lint(text, { classify: false, context: 'ad' });
  return { verdict: r.verdict, reason: r.reason };
}
function carouselSlides(pub: any, creative: any) {
  const hook = String(pub?.hook ?? creative?.hook ?? creative?.hookText ?? 'Your day is not one mood');
  const captions: string[] = Array.isArray(creative?.onScreenCaptions) ? creative.onScreenCaptions.map(String) : String(pub?.caption ?? '').split(/\n+/).map((s: string) => s.trim()).filter(Boolean).slice(0, 5);
  return [
    { title: 'Hook', body: hook },
    { title: 'The tension', body: captions[1] ?? captions[0] ?? 'Same day. Different windows.' },
    { title: 'The proof', body: '18 hour-slots on YOUR chart — clearer vs heavier for the task.' },
    { title: 'How it feels', body: captions[2] ?? 'Not a sun-sign mood. A timing grid.' },
    { title: 'CTA', body: `Try VedicHour.com — free kundli start. ${BRAND.taglineClose}` },
  ];
}
function longformOutline(pub: any, creative: any): string {
  const hook = String(pub?.youtubeTitle ?? creative?.youtubeTitle ?? creative?.hook ?? 'Timing your day');
  const shots: any[] = Array.isArray(creative?.shots) ? creative.shots : Array.isArray(creative?.shotList) ? creative.shotList : [];
  const chapters = shots.map((s: any, i: number) => {
    const label = String(s.role ?? s.kind ?? `beat-${i + 1}`);
    const line = String(s.dialogue ?? s.vo ?? s.narration ?? '').trim();
    return `### ${i + 1}. ${label} (~${s.seconds ?? '?'}s)\\n${line || '_visual beat_'}`;
  });
  return `# YouTube long-form outline (8–12 min) — ${hook}\\n\\n> Expand the winning Reel. No fake testimonials. Say VedicHour.com. Show REPORT, never checkout.\\n\\n## Cold open\\n${hook}\\n\\n## What VedicHour does\\n${BRAND.adSafeDifferentiators.map((d) => `- ${d}`).join('\\n')}\\n\\n## Beats\\n${chapters.join('\\n\\n') || '_from publish description_'}\\n\\n## Close\\nTry VedicHour.com. ${BRAND.disclaimer}\\n`;
}

export async function packageSlug(slug: string): Promise<string[]> {
  const dir = resolve(REELS_OUT, slug);
  const pkgDir = resolve(dir, 'packages');
  mkdirSync(pkgDir, { recursive: true });
  const pub = loadPublish(slug) ?? {};
  const creative = loadCreative(slug) ?? {};
  const landing = BRAND.links.freeKundli;
  const written: string[] = [];
  const igCaption = pub.platforms?.instagram?.caption ?? `${pub.caption ?? creative.hook ?? ''}\\n\\n${BRAND.taglineClose}`.trim();
  const ytCaption = pub.platforms?.youtube?.caption ?? pub.youtubeTitle ?? igCaption;
  const hashtags: string[] = pub.hashtags ?? pub.platforms?.instagram?.hashtags ?? ['#vedichour', '#vedicastrology', '#jyotish'];
  const ig = { platform: 'instagram_reels', aspect: '9:16', video: existsSync(resolve(dir, 'final.mp4')) ? resolve(dir, 'final.mp4') : null, caption: igCaption, hashtags, link: utm(landing, 'instagram', 'reel', 'content_ops', slug), endCard: 'vedichour.com', linter: await lintCopy(igCaption), approvedToPublish: canPublish(slug) };
  writeFileSync(resolve(pkgDir, 'instagram-reels.json'), JSON.stringify(ig, null, 2)); written.push(resolve(pkgDir, 'instagram-reels.json'));
  const shorts = { platform: 'youtube_shorts', aspect: '9:16', video: ig.video, title: pub.youtubeTitle ?? `${creative.hook ?? slug} | VedicHour`, description: pub.description ?? ytCaption, tags: pub.tags ?? ['vedic astrology', 'hora', 'kundli', 'vedichour'], link: utm(landing, 'youtube', 'short', 'content_ops', slug), endCard: 'vedichour.com', linter: await lintCopy(String(pub.youtubeTitle ?? ytCaption)), approvedToPublish: canPublish(slug) };
  writeFileSync(resolve(pkgDir, 'youtube-shorts.json'), JSON.stringify(shorts, null, 2)); written.push(resolve(pkgDir, 'youtube-shorts.json'));
  writeFileSync(resolve(pkgDir, 'youtube-longform-outline.md'), longformOutline(pub, creative)); written.push(resolve(pkgDir, 'youtube-longform-outline.md'));
  const gbpBody = [String(creative.hook ?? pub.hook ?? 'Your day is not one mood.'), '', 'VedicHour rates the hours of your day against your birth chart — clearer vs heavier windows.', '', `Start free: ${utm(landing, 'google', 'gbp', 'content_ops', slug)}`, BRAND.taglineClose].join('\\n');
  const gbp = { platform: 'google_business_profile', body: gbpBody, cta: 'Learn more', link: utm(landing, 'google', 'gbp', 'content_ops', slug), linter: await lintCopy(gbpBody), approvedToPublish: canPublish(slug), notes: 'No fake reviews.' };
  writeFileSync(resolve(pkgDir, 'google-business.json'), JSON.stringify(gbp, null, 2)); written.push(resolve(pkgDir, 'google-business.json'));
  const slides = carouselSlides(pub, creative);
  const carousel = { platform: 'instagram_carousel', slides, caption: `${slides[0].body}\\n\\nSwipe →\\n\\n${BRAND.taglineClose}\\n${hashtags.join(' ')}`, link: utm(landing, 'instagram', 'carousel', 'content_ops', slug), craft: { noMandalaCollage: true, proofSlideRequired: true }, linter: await lintCopy(slides.map((s) => s.body).join('\\n')), approvedToPublish: canPublish(slug) };
  writeFileSync(resolve(pkgDir, 'instagram-carousel.json'), JSON.stringify(carousel, null, 2)); written.push(resolve(pkgDir, 'instagram-carousel.json'));
  const index = { slug, brandBriefOneLiner: BRAND_BRIEF.slice(0, 120) + '…', packages: written.map((p) => p.replace(ROOT + '/', '')), blocked: [ig, shorts, gbp, carousel].some((x) => x.linter.verdict === 'block'), canPublish: canPublish(slug) };
  writeFileSync(resolve(pkgDir, 'index.json'), JSON.stringify(index, null, 2)); written.push(resolve(pkgDir, 'index.json'));
  return written;
}

export async function runPackageLoop(opts: PackageOpts = {}): Promise<void> {
  const loop = 'package';
  if (isKilled()) { console.log(`[package] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`); logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' }); return; }
  logRun({ loop, status: 'started' });
  const slugs = listSlugs(opts.slug);
  if (!slugs.length) { console.log('[package] no reels to package under output/reels/.'); logRun({ loop, status: 'skipped', detail: 'no reels' }); return; }
  let n = 0;
  for (const slug of slugs) {
    try { const files = await packageSlug(slug); console.log(`[package] ${slug} → ${files.length} artifacts in packages/`); n++; }
    catch (e: any) { console.error(`[package] ${slug} failed: ${String(e?.message ?? e).slice(0, 160)}`); }
  }
  logRun({ loop, status: 'ok', detail: `${n}/${slugs.length} packaged` });
  writeHeartbeat(loop, `${n} reels packaged`);
}
