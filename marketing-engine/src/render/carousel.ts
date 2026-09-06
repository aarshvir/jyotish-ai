import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BRAND } from '../brand';
import type { CarouselSlide } from '../copy/fallbacks';
import { loadPlaywright } from './playwright';

export async function renderCarousel(slides: CarouselSlide[], dir: string): Promise<string[]> {
  mkdirSync(dir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const paths: string[] = [];
  try {
    for (let i = 0; i < slides.length; i++) {
      const html = slideHtml(slides[i], i + 1, slides.length);
      const htmlPath = resolve(dir, `slide-${String(i + 1).padStart(2, '0')}.html`);
      writeFileSync(htmlPath, html);
      await page.setContent(html, { waitUntil: 'load' });
      const png = resolve(dir, `slide-${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: png, type: 'png' });
      paths.push(png);
    }
  } finally {
    await browser.close();
  }
  return paths;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slideHtml(slide: CarouselSlide, n: number, total: number): string {
  const { paper0, ink900, ink700, ink500, amber600 } = BRAND.colors;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;padding:0;width:1080px;height:1350px;background:${paper0};color:${ink900};}
  .wrap{box-sizing:border-box;height:1350px;padding:88px 80px 72px;display:flex;flex-direction:column;}
  .kicker{font-family:'DM Sans',sans-serif;font-size:22px;letter-spacing:.04em;color:${amber600};margin:0 0 28px;}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-size:72px;line-height:1.12;font-weight:700;margin:0 0 32px;max-width:18ch;}
  p{font-family:'DM Sans',sans-serif;font-size:32px;line-height:1.45;color:${ink700};margin:0;flex:1;}
  .foot{display:flex;justify-content:space-between;align-items:center;font-family:'DM Sans',sans-serif;font-size:20px;color:${ink500};}
  .rule{height:3px;width:72px;background:${amber600};margin:0 0 36px;}
</style></head>
<body>
  <div class="wrap">
    <div class="kicker">${esc(slide.kicker)}</div>
    <div class="rule"></div>
    <h1>${esc(slide.headline)}</h1>
    <p>${esc(slide.body)}</p>
    <div class="foot"><span>VedicHour</span><span>${n} / ${total}</span></div>
  </div>
</body></html>`;
}
