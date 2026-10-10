import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from 'puppeteer-core';
import { CAROUSEL } from '../../config/pieces';
import { REEL_BEATS, isReportShot, shotKey, type ReelShot } from '../../config/beats';
import { withBrowser } from './browser';

const REPORT_URL = 'https://www.vedichour.com/sample-report';
const QUIZ_URL = 'https://www.vedichour.com/start';

/** CSS pixels. deviceScaleFactor 2 writes a native 1080×1920 frame. Below the `sm` breakpoint. */
const PHONE = { width: 540, height: 960, deviceScaleFactor: 2 };

export interface Still {
  png: string;
  /** scrollY after the shot was framed. Report shots only. */
  y: number;
}

export interface Glide {
  dir: string;
  frames: number;
}

export interface Capture {
  stills: Map<string, Still>;
  /** Keyed by the destination beat index. */
  glides: Map<number, Glide>;
  carouselDir: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function slideHtml(slide: { title: string; body: string }, index: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1080px;height:1350px;background:#0a0713;color:#f4ecd8;font-family:Inter,"Noto Sans",sans-serif}
    .wrap{box-sizing:border-box;height:1350px;padding:100px 84px;display:flex;flex-direction:column;justify-content:center}
    .k{color:#e2c56a;letter-spacing:.22em;font-size:26px;font-weight:600}
    h1{font-size:76px;line-height:1.04;font-weight:640;margin:28px 0 24px;letter-spacing:-0.03em}
    p{font-size:40px;line-height:1.35;color:#ddd4c4;margin:0}
    .n{position:absolute;bottom:56px;left:84px;color:#e2c56a;font-size:26px}
  </style></head><body><div class="wrap"><div class="k">VEDICHOUR</div><h1>${escapeHtml(slide.title)}</h1><p>${escapeHtml(slide.body)}</p></div><div class="n">${index + 1} / ${CAROUSEL.length}</div></body></html>`;
}

function slateHtml(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1080px;height:1920px;color:#f4ecd8;font-family:Inter,"Noto Sans",sans-serif}
    body{background:
      radial-gradient(90% 48% at 50% 12%, #3a2458 0%, rgba(18,12,30,0) 58%),
      radial-gradient(80% 42% at 50% 100%, #241430 0%, #0a0713 68%)}
    .card{box-sizing:border-box;height:1920px;padding:0 96px;display:flex;flex-direction:column;justify-content:center}
    .mark{display:flex;align-items:center;gap:16px;color:#e2c56a}
    .k{letter-spacing:.28em;font-size:28px;font-weight:650}
    h1{font-size:108px;line-height:.98;font-weight:640;margin:36px 0 0;letter-spacing:-0.035em}
    .rule{width:168px;height:2px;background:#e2c56a;margin:40px 0 36px;opacity:.8}
    .price{font-size:64px;font-weight:620;letter-spacing:-0.03em}
    .or{display:block;margin-top:8px;font-size:56px;font-weight:600}
    .muted{margin-top:36px;font-size:36px;line-height:1.35;color:#d9cbb8;max-width:760px}
    .url{margin-top:56px;font-size:42px;color:#e2c56a;font-weight:620}
    .foot{margin-top:18px;font-size:30px;color:#b7a894}
  </style></head><body><div class="card">
    <div class="mark">
      <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="13" stroke="currentColor" stroke-width="1" opacity="0.55"></circle>
        <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="0.8" opacity="0.75"></circle>
        <circle cx="14" cy="14" r="3" fill="currentColor"></circle>
      </svg>
      <div class="k">VEDICHOUR</div>
    </div>
    <h1>One month.</h1>
    <div class="rule"></div>
    <div class="price">$41.99<span class="or">₹3,999</span></div>
    <p class="muted">The card is not charged again by itself.</p>
    <div class="url">VedicHour.com/start</div>
    <div class="foot">For planning, not a promise.</div>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function clickText(page: Page, text: string): Promise<void> {
  const clicked = await page.evaluate((needle) => {
    const hit = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes(needle));
    if (!hit) return false;
    hit.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`quiz button not found: ${text}`);
  await sleep(700);
}

async function prepare(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
      const el = buttons[i] as HTMLElement;
      if ((el.textContent ?? '').includes('Feedback')) el.style.display = 'none';
    }
  });
  await sleep(250);
}

/** Dim every other hour so the spoken score is the one the eye hits. Real text, real scores. */
async function applyFocus(page: Page, shot: ReelShot): Promise<void> {
  const score = shot.kind === 'hour' ? String(shot.score) : '';
  await page.evaluate((wanted) => {
    const items = document.querySelectorAll('ol li');
    for (let i = 0; i < items.length; i++) {
      const li = items[i] as HTMLElement;
      li.style.opacity = wanted ? '0.28' : '';
      li.style.boxShadow = '';
    }
    if (!wanted) return;
    const spans = document.querySelectorAll('span');
    for (let i = 0; i < spans.length; i++) {
      if ((spans[i].textContent ?? '').trim() !== wanted) continue;
      const card = spans[i].closest('li') as HTMLElement | null;
      if (!card) return;
      card.style.opacity = '1';
      card.style.boxShadow = '0 14px 36px rgba(40,24,8,0.14)';
      return;
    }
  }, score);
}

interface Box {
  top: number;
  bottom: number;
  text: string;
}

function inBand(box: Box | null, topMin: number, bottomMax: number, label: string): void {
  if (!box) throw new Error(`shot missing element: ${label}`);
  if (box.top < topMin || box.bottom > bottomMax) {
    throw new Error(`${label} sits at ${box.top.toFixed(2)}–${box.bottom.toFixed(2)} (want ${topMin}–${bottomMax}). ${box.text}`);
  }
}

async function visibleLine(page: Page, needle: string): Promise<Box | null> {
  return page.evaluate((wanted) => {
    const el = Array.from(document.querySelectorAll('span,p,h1,h2')).find((n) => {
      const text = (n.textContent ?? '').replace(/\s+/g, ' ').trim();
      return text.includes(wanted) && text.length < 80;
    });
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top / window.innerHeight, bottom: b.bottom / window.innerHeight, text: (el.textContent ?? '').replace(/\s+/g, ' ').trim() };
  }, needle);
}

async function assertCover(page: Page): Promise<void> {
  inBand(await visibleLine(page, 'Cancer'), 0.02, 0.82, 'Cancer rising');
  inBand(await visibleLine(page, 'Scorpio'), 0.02, 0.82, 'Moon in Scorpio');
}

async function assertHeader(page: Page): Promise<void> {
  // No named functions in here. tsx rewrites them to a helper the page does not have.
  const info = await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('h2')).find((el) => (el.textContent ?? '').includes('Monday'));
    const p = Array.from(document.querySelectorAll('p')).find((el) => (el.textContent ?? '').includes('Two windows'));
    const score = Array.from(document.querySelectorAll('span')).find((el) => (el.textContent ?? '').trim() === '70');
    const hb = h ? h.getBoundingClientRect() : null;
    const pb = p ? p.getBoundingClientRect() : null;
    const sb = score ? score.getBoundingClientRect() : null;
    const ht = (h?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
    const pt = (p?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
    const st = (score?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 220);
    return {
      h: hb ? { top: hb.top / window.innerHeight, bottom: hb.bottom / window.innerHeight, text: ht } : null,
      p: pb ? { top: pb.top / window.innerHeight, bottom: pb.bottom / window.innerHeight, text: pt } : null,
      score: sb ? { top: sb.top / window.innerHeight, bottom: sb.bottom / window.innerHeight, text: st } : null,
    };
  });
  inBand(info.h, 0.04, 0.42, 'Monday header');
  inBand(info.score, 0.04, 0.42, 'day score 70');
  inBand(info.p, 0.08, 0.62, 'two windows sentence');
  if (!/10 am/i.test(info.p!.text) || !/6 pm/i.test(info.p!.text)) {
    throw new Error(`header sentence is not the sample windows: ${info.p!.text}`);
  }
}

async function assertHour(page: Page, score: number): Promise<void> {
  const box = await page.evaluate((wanted) => {
    const span = Array.from(document.querySelectorAll('span')).find((el) => (el.textContent ?? '').trim() === wanted);
    const card = span?.closest('li');
    if (!card) return null;
    const b = card.getBoundingClientRect();
    return { top: b.top / window.innerHeight, bottom: b.bottom / window.innerHeight, text: (card.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 240) };
  }, String(score));
  inBand(box, 0.12, 0.62, `hour ${score}`);
}

async function assertQuiz(page: Page, step: 'concern' | 'career'): Promise<void> {
  const needle = step === 'concern' ? 'Work and money' : 'changing jobs';
  const box = await page.evaluate((label) => {
    const btn = Array.from(document.querySelectorAll('button')).find((el) => (el.textContent ?? '').includes(label));
    if (!btn) return null;
    const b = btn.getBoundingClientRect();
    return { top: b.top / window.innerHeight, bottom: b.bottom / window.innerHeight, text: (btn.textContent ?? '').replace(/\s+/g, ' ').trim() };
  }, needle);
  inBand(box, 0.05, 0.72, needle);
}

async function place(page: Page, shot: ReelShot): Promise<number> {
  if (shot.kind === 'cover') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(80);
    return page.evaluate(() => window.scrollY);
  }
  if (shot.kind === 'header') {
    const y = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h2')).find((el) => (el.textContent ?? '').includes('Monday'));
      if (!h) return -1;
      const top = h.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - window.innerHeight * 0.16));
      return window.scrollY;
    });
    if (y < 0) throw new Error('Monday header not on the sample report');
    await sleep(80);
    return y;
  }
  if (shot.kind === 'hour') {
    const y = await page.evaluate((score) => {
      const span = Array.from(document.querySelectorAll('span')).find((el) => (el.textContent ?? '').trim() === score);
      const card = span?.closest('li');
      if (!card) return -1;
      const top = card.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - window.innerHeight * 0.22));
      return window.scrollY;
    }, String(shot.score));
    if (y < 0) throw new Error(`hour card not found for score ${shot.score}`);
    await sleep(80);
    return y;
  }
  return 0;
}

async function assertShot(page: Page, shot: ReelShot): Promise<void> {
  if (shot.kind === 'cover') await assertCover(page);
  else if (shot.kind === 'header') await assertHeader(page);
  else if (shot.kind === 'hour') await assertHour(page, shot.score);
  else if (shot.kind === 'quiz') await assertQuiz(page, shot.step);
}

async function glide(page: Page, fromY: number, toY: number, folder: string, fromShot: ReelShot, toShot: ReelShot): Promise<Glide> {
  mkdirSync(folder, { recursive: true });
  const dist = Math.abs(toY - fromY);
  const frames = Math.max(10, Math.min(16, Math.round(dist / 70)));
  for (let i = 0; i < frames; i++) {
    const t = frames === 1 ? 1 : i / (frames - 1);
    const e = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
    const y = Math.round(fromY + (toY - fromY) * e);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await applyFocus(page, t < 0.72 ? fromShot : toShot);
    await page.screenshot({ path: resolve(folder, `f_${String(i).padStart(2, '0')}.png`), type: 'png' });
  }
  return { dir: folder, frames };
}

async function openReport(page: Page): Promise<void> {
  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => (document.body.innerText || '').includes('Monday'), { timeout: 25000 });
  await prepare(page);
}

async function openQuiz(page: Page, step: 'concern' | 'career'): Promise<void> {
  await page.goto(QUIZ_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => (document.body.innerText || '').includes('weighing on you'), { timeout: 25000 });
  await prepare(page);
  if (step === 'career') {
    await clickText(page, 'Work and money');
    await page.waitForFunction(() => (document.body.innerText || '').includes('Which is closest'), { timeout: 12000 });
    await sleep(300);
  }
  await page.evaluate(() => {
    const h = document.querySelector('h1');
    if (!h) return;
    const top = h.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, top - window.innerHeight * 0.18));
  });
  await sleep(80);
}

export async function captureFilm(dir: string): Promise<Capture> {
  const stillDir = resolve(dir, 'stills');
  const glideRoot = resolve(dir, 'glides');
  const carouselDir = resolve(dir, 'carousel');
  mkdirSync(stillDir, { recursive: true });
  mkdirSync(carouselDir, { recursive: true });

  return withBrowser(async (browser) => {
    const deck = await browser.newPage();
    await deck.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
    for (let i = 0; i < CAROUSEL.length; i++) {
      await deck.setContent(slideHtml(CAROUSEL[i], i), { waitUntil: 'load' });
      await deck.screenshot({ path: resolve(carouselDir, `slide_${i + 1}.png`), type: 'png' });
    }

    const phone = await browser.newPage();
    await phone.setViewport(PHONE);
    await openReport(phone);

    const stills = new Map<string, Still>();
    for (const beat of REEL_BEATS) {
      if (!isReportShot(beat.shot)) continue;
      const key = shotKey(beat.shot);
      if (stills.has(key)) continue;
      const y = await place(phone, beat.shot);
      await applyFocus(phone, beat.shot);
      await assertShot(phone, beat.shot);
      const png = resolve(stillDir, `${key.replace(':', '_')}.png`);
      await phone.screenshot({ path: png, type: 'png' });
      stills.set(key, { png, y });
    }

    const glides = new Map<number, Glide>();
    for (let i = 1; i < REEL_BEATS.length; i++) {
      const prev = REEL_BEATS[i - 1];
      const beat = REEL_BEATS[i];
      if (!isReportShot(prev.shot) || !isReportShot(beat.shot)) continue;
      if (shotKey(prev.shot) === shotKey(beat.shot)) continue;
      const from = stills.get(shotKey(prev.shot));
      const to = stills.get(shotKey(beat.shot));
      if (!from || !to) throw new Error(`glide missing stills at beat ${beat.id}`);
      glides.set(i, await glide(phone, from.y, to.y, resolve(glideRoot, String(i).padStart(2, '0')), prev.shot, beat.shot));
    }

    for (const beat of REEL_BEATS) {
      if (beat.shot.kind !== 'quiz') continue;
      const key = shotKey(beat.shot);
      if (stills.has(key)) continue;
      await openQuiz(phone, beat.shot.step);
      await assertShot(phone, beat.shot);
      const png = resolve(stillDir, `${key.replace(':', '_')}.png`);
      await phone.screenshot({ path: png, type: 'png' });
      stills.set(key, { png, y: 0 });
    }

    await deck.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await deck.setContent(slateHtml(), { waitUntil: 'load' });
    const slatePng = resolve(stillDir, 'slate.png');
    await deck.screenshot({ path: slatePng, type: 'png' });
    stills.set('slate', { png: slatePng, y: 0 });

    writeFileSync(
      resolve(dir, 'shot-notes.json'),
      JSON.stringify(
        {
          phone: PHONE,
          stills: Object.fromEntries([...stills.entries()].map(([k, v]) => [k, v.y])),
          glides: Object.fromEntries([...glides.entries()].map(([k, v]) => [k, v.frames])),
        },
        null,
        2,
      ),
    );
    return { stills, glides, carouselDir };
  });
}
