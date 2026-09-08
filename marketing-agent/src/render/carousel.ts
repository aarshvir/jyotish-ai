/**
 * Carousel renderer — HTML slide template → PNG via Playwright. $0, local, deterministic.
 *
 * Ported 2026-09-06 from Cursor's parallel build (`marketing-engine/src/render/carousel.ts`) and
 * re-cut to docs/DESIGN_SYSTEM.md: two canvases (NIGHT plum-indigo for the ritual frames — cover
 * and close; PAPER parchment for everything a person reads), Cormorant Garamond for every
 * headline, DM Sans for body and every number, no mono, no uppercase micro-labels. Fonts are the
 * site's own self-hosted files (public/fonts/) loaded over file://, so a render never depends on
 * Google Fonts being reachable and looks identical on every machine.
 *
 * No clipping, mechanically: after the slide is laid out, the page shrinks the headline and body
 * in steps until the content fits the 1080x1350 frame, and the renderer refuses to write a PNG
 * whose content still overflows. A slide that cannot be made to fit is a defect the caller sees,
 * not a cropped image the owner finds on Instagram.
 *
 * Playwright resolves from marketing-agent's own devDependencies (pinned to the parent app's
 * version so the one downloaded Chromium is shared).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../db/index';

export type SlideCanvas = 'night' | 'paper';
export type SlideKind = 'cover' | 'story' | 'proof' | 'howto' | 'close';

export interface CarouselSlide {
  kind: SlideKind;
  canvas: SlideCanvas;
  /** Small DM Sans line above the rule — sentence case, never uppercase. */
  kicker: string;
  /** Cormorant headline. */
  headline: string;
  /** DM Sans body. May be empty. */
  body: string;
  /** Smaller closing line under the body (the disclaimer on the last slide). */
  footnote?: string;
}

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

/** docs/DESIGN_SYSTEM.md tokens — the only colours a slide may use. */
export const TOKENS = {
  night0: '#0A0713',
  night1: '#120C1E',
  nightGlow: '#2A1C42',
  nightFg: '#F6EFE4',
  nightFg2: '#C9BCCE',
  nightFg3: '#9B8FA6',
  paper0: '#FBF7F1',
  paperLine: '#E6DBCB',
  ink900: '#1E1726',
  ink700: '#3B3247',
  ink500: '#66596F',
  amber300: '#E8C97A',
  amber500: '#D4A853',
  amber700: '#8A6318',
} as const;

const FONT_DIR = resolve(ROOT, '..', 'public', 'fonts');

function fontFace(family: string, weight: number, file: string): string {
  const p = resolve(FONT_DIR, file);
  if (!existsSync(p)) return '';
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url('${pathToFileURL(p).href}') format('woff2');}`;
}

/** True when the site's self-hosted fonts are present (the render is on-brand, not a fallback). */
export function brandFontsAvailable(): boolean {
  return ['cormorant-garamond-latin-600-normal.woff2', 'dm-sans-latin-400-normal.woff2'].every((f) =>
    existsSync(resolve(FONT_DIR, f)),
  );
}

export function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Headline size by length so a six-word hook is big and a two-line story still fits. */
export function headlineSize(text: string): number {
  const n = text.length;
  if (n <= 36) return 104;
  if (n <= 64) return 88;
  if (n <= 96) return 76;
  if (n <= 140) return 66;
  return 56;
}

/** Warm film grain — the design system's "removes the flat digital rectangle" pass. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function slideHtml(slide: CarouselSlide, n: number, total: number): string {
  const night = slide.canvas === 'night';
  const T = TOKENS;
  const bg = night
    ? `radial-gradient(120% 90% at 50% -10%, ${T.nightGlow} 0%, ${T.night1} 55%, ${T.night0} 100%)`
    : T.paper0;
  const fg = night ? T.nightFg : T.ink900;
  const fg2 = night ? T.nightFg2 : T.ink700;
  const fg3 = night ? T.nightFg3 : T.ink500;
  const accent = night ? T.amber300 : T.amber700;
  const fonts = [
    fontFace('Cormorant Garamond', 400, 'cormorant-garamond-latin-400-normal.woff2'),
    fontFace('Cormorant Garamond', 600, 'cormorant-garamond-latin-600-normal.woff2'),
    fontFace('DM Sans', 300, 'dm-sans-latin-300-normal.woff2'),
    fontFace('DM Sans', 400, 'dm-sans-latin-400-normal.woff2'),
    fontFace('DM Sans', 500, 'dm-sans-latin-500-normal.woff2'),
  ].join('\n');
  const hSize = headlineSize(slide.headline);
  const isClose = slide.kind === 'close';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
${fonts}
html,body{margin:0;padding:0;width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;background:${bg};color:${fg};-webkit-font-smoothing:antialiased;}
body::after{content:'';position:absolute;inset:0;pointer-events:none;background-image:${GRAIN};opacity:${night ? 0.028 : 0.016};mix-blend-mode:multiply;}
.wrap{box-sizing:border-box;position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;padding:96px 96px 84px;display:flex;flex-direction:column;}
.top{flex:0 0 auto;}
.kicker{font-family:'DM Sans',system-ui,sans-serif;font-weight:500;font-size:28px;line-height:1.3;color:${accent};margin:0 0 22px;}
.rule{height:3px;width:72px;background:${T.amber500};margin:0 0 56px;border-radius:2px;}
.content{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;min-height:0;}
h1{font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-weight:600;font-size:${hSize}px;line-height:1.08;letter-spacing:-0.005em;margin:0 0 40px;color:${fg};max-width:100%;overflow-wrap:break-word;}
h1.site{font-size:112px;color:${T.amber300};letter-spacing:0.005em;}
p.body{font-family:'DM Sans',system-ui,sans-serif;font-weight:400;font-size:38px;line-height:1.5;color:${fg2};margin:0;max-width:34ch;}
p.footnote{font-family:'DM Sans',system-ui,sans-serif;font-weight:400;font-size:26px;line-height:1.5;color:${fg3};margin:48px 0 0;max-width:40ch;padding-top:32px;border-top:1px solid ${night ? 'rgba(255,241,224,0.12)' : T.paperLine};}
.foot{flex:0 0 auto;display:flex;justify-content:space-between;align-items:baseline;font-family:'DM Sans',system-ui,sans-serif;font-weight:400;font-size:26px;color:${fg3};font-variant-numeric:tabular-nums;padding-top:40px;}
.foot .brand{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:34px;color:${night ? T.amber300 : T.ink700};}
.foot .swipe{color:${accent};}
</style></head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="kicker">${esc(slide.kicker)}</div>
      <div class="rule"></div>
    </div>
    <div class="content" id="content">
      <h1 class="${isClose ? 'site' : ''}" id="h1">${esc(slide.headline)}</h1>
      ${slide.body ? `<p class="body" id="body">${esc(slide.body)}</p>` : ''}
      ${slide.footnote ? `<p class="footnote" id="footnote">${esc(slide.footnote)}</p>` : ''}
    </div>
    <div class="foot">
      <span class="brand">VedicHour</span>
      <span>${n < total ? `<span class="swipe">Swipe →</span>&nbsp;&nbsp;` : ''}${n} / ${total}</span>
    </div>
  </div>
</body></html>`;
}

/**
 * Runs inside the page: shrink type until the content block no longer overflows its box.
 * Returns the final sizes and whether it fits, so the renderer can refuse a clipped slide.
 */
const FIT_SCRIPT = `(() => {
  const c = document.getElementById('content');
  const h = document.getElementById('h1');
  const b = document.getElementById('body');
  const fits = () => c.scrollHeight <= c.clientHeight + 1;
  let steps = 0;
  while (!fits() && steps < 40) {
    const hs = parseFloat(getComputedStyle(h).fontSize);
    if (hs > 40) h.style.fontSize = (hs - 4) + 'px';
    if (b) { const bs = parseFloat(getComputedStyle(b).fontSize); if (bs > 26) b.style.fontSize = (bs - 2) + 'px'; }
    steps++;
  }
  return { fits: fits(), headlinePx: parseFloat(getComputedStyle(h).fontSize), bodyPx: b ? parseFloat(getComputedStyle(b).fontSize) : null, steps };
})()`;

export interface RenderedSlide {
  n: number;
  png: string;
  html: string;
  fit: { fits: boolean; headlinePx: number; bodyPx: number | null; steps: number };
}

async function loadChromium(): Promise<any> {
  try {
    const pw: any = await import('playwright');
    return pw.chromium;
  } catch (e: any) {
    throw new Error(
      `Playwright is not installed for marketing-agent (${String(e?.message ?? e).slice(0, 80)}). ` +
        'Run `npm ci` in marketing-agent/ — playwright is a pinned devDependency and .npmrc allows its Chromium download.',
    );
  }
}

/**
 * Render every slide to `<dir>/slide-NN.png` (plus the HTML beside it for inspection).
 * Throws if any slide still overflows after the fit pass — a clipped slide is never written.
 */
export async function renderCarouselSlides(
  slides: CarouselSlide[],
  dir: string,
  opts: { onProgress?: (msg: string) => void } = {},
): Promise<RenderedSlide[]> {
  if (!slides.length) throw new Error('renderCarouselSlides: no slides');
  mkdirSync(dir, { recursive: true });
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  const out: RenderedSlide[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: SLIDE_W, height: SLIDE_H }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (let i = 0; i < slides.length; i++) {
      const n = i + 1;
      const tag = String(n).padStart(2, '0');
      const html = slideHtml(slides[i], n, slides.length);
      const htmlPath = resolve(dir, `slide-${tag}.html`);
      writeFileSync(htmlPath, html);
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => (document as any).fonts?.ready);
      const fit = (await page.evaluate(FIT_SCRIPT)) as RenderedSlide['fit'];
      if (!fit.fits) {
        throw new Error(`slide ${n} ("${slides[i].headline.slice(0, 40)}…") still overflows the frame after ${fit.steps} fit steps — shorten the copy`);
      }
      const png = resolve(dir, `slide-${tag}.png`);
      await page.screenshot({ path: png, type: 'png', clip: { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H } });
      opts.onProgress?.(`slide ${n}/${slides.length} → ${png} (h1 ${fit.headlinePx}px${fit.steps ? `, shrunk ${fit.steps} step(s)` : ''})`);
      out.push({ n, png, html: htmlPath, fit });
    }
  } finally {
    await browser.close();
  }
  return out;
}
