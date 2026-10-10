import { mkdirSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Page } from 'puppeteer-core';
import { CAROUSEL, ENGLISH_SCRIPT, HINDI_SCRIPT } from '../../config/pieces';
import { logRun } from '../db';
import { withBrowser } from '../media/browser';
import { cutAspect, durationSec, meanVolumeDb, slideshow, writeAss } from '../media/compose';
import { speak } from '../media/speak';
import { ENGINE_ROOT } from '../paths';

const IDEA = 'two-slots-same-tuesday';

function dayDir(): string {
  const day = new Date().toISOString().slice(0, 10);
  return resolve(ENGINE_ROOT, 'out', day, IDEA);
}

function slideHtml(slide: { title: string; body: string }, index: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1080px;height:1350px;background:#0a0a1a;color:#f4ecd8;font-family:"DejaVu Sans",sans-serif}
    .wrap{box-sizing:border-box;height:1350px;padding:100px 84px;display:flex;flex-direction:column;justify-content:center}
    .k{color:#d4af37;letter-spacing:.16em;font-size:28px;text-transform:uppercase}
    h1{font-size:78px;line-height:1.05;font-weight:650;margin:28px 0 24px}
    p{font-size:40px;line-height:1.35;color:#ddd4c4;margin:0}
    .n{position:absolute;bottom:56px;left:84px;color:#d4af37;font-size:26px}
  </style></head><body><div class="wrap"><div class="k">VedicHour</div><h1>${escapeHtml(slide.title)}</h1><p>${escapeHtml(slide.body)}</p></div><div class="n">${index + 1} / ${CAROUSEL.length}</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function shoot(page: Page, dir: string, startAt: number, count: number, scrollPx: number): Promise<number> {
  let n = startAt;
  for (let i = 0; i < count; i++) {
    const full = resolve(dir, `frame_${String(n).padStart(3, '0')}.jpg`);
    await page.screenshot({ path: full, type: 'jpeg', quality: 72 });
    n++;
    if (scrollPx > 0) await page.evaluate((y) => window.scrollBy(0, y), scrollPx);
  }
  return n;
}

async function clickText(page: Page, text: string): Promise<void> {
  const clicked = await page.evaluate((needle) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const hit = buttons.find((b) => (b.textContent ?? '').includes(needle));
    if (!hit) return false;
    hit.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`quiz button not found: ${text}`);
  await new Promise((r) => setTimeout(r, 600));
}

export async function runAssets(db: DatabaseSync): Promise<string> {
  const dir = dayDir();
  const frames = resolve(dir, 'frames');
  const slides = resolve(dir, 'carousel');
  mkdirSync(frames, { recursive: true });
  mkdirSync(slides, { recursive: true });

  await withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
    for (let i = 0; i < CAROUSEL.length; i++) {
      await page.setContent(slideHtml(CAROUSEL[i], i), { waitUntil: 'load' });
      await page.screenshot({ path: resolve(slides, `slide_${i + 1}.png`), type: 'png' });
    }

    const phone = await browser.newPage();
    await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await phone.goto('https://www.vedichour.com/start', { waitUntil: 'networkidle2', timeout: 45000 });
    await phone.waitForFunction(() => (document.body.innerText || '').includes('weighing on you'), { timeout: 20000 });
    let n = await shoot(phone, frames, 0, 4, 0);
    await clickText(phone, 'Work and money');
    n = await shoot(phone, frames, n, 3, 0);
    await clickText(phone, 'changing jobs');
    n = await shoot(phone, frames, n, 3, 0);

    await phone.goto('https://www.vedichour.com/sample-report', { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    await shoot(phone, frames, n, 56, 140);
  });

  const frameFiles = readdirSync(frames).filter((f) => f.endsWith('.jpg')).sort();
  if (frameFiles.length < 20) throw new Error(`only ${frameFiles.length} product frames; refusing to invent a reel`);

  const voiceEn = resolve(dir, 'voice-en.wav');
  const voiceHi = resolve(dir, 'voice-hi.wav');
  const voiceUs = resolve(dir, 'voice-en-us-sample.wav');
  await speak(ENGLISH_SCRIPT, voiceEn, 'en-gb-x-rp', 128);
  await speak(HINDI_SCRIPT, voiceHi, 'hi', 124);
  await speak(ENGLISH_SCRIPT.split('\n').slice(0, 2).join(' '), voiceUs, 'en-us', 128);

  const seconds = await durationSec(voiceEn);
  const fps = Math.max(1, Math.round((frameFiles.length / seconds) * 10) / 10);
  const ass = resolve(dir, 'captions.ass');
  writeAss(ENGLISH_SCRIPT.replace(/\n/g, ' '), seconds, ass);

  const reel = resolve(dir, 'reel-9x16.mp4');
  await slideshow(dir, fps);
  const mean = await meanVolumeDb(reel);
  if (mean < -40) throw new Error(`reel is inaudible at ${mean} dB`);

  const square = resolve(dir, 'reel-1x1.mp4');
  const wide = resolve(dir, 'reel-16x9.mp4');
  await cutAspect(reel, square, 'square');
  await cutAspect(reel, wide, 'wide');

  const manifest = {
    idea: IDEA,
    voice: {
      primary: 'espeak-ng en-gb-x-rp at 128 wpm',
      comparedWith: 'espeak-ng en-us sample (voice-en-us-sample.wav)',
      hindi: 'espeak-ng hi (voice-hi.wav)',
      note: 'ElevenLabs was not used. espeak-ng has no Indian-English voice. RP is the slower of the two English samples. This is a free fallback, and it sounds like a synthesizer. Do not pretend it is a presenter.',
      meanVolumeDb: mean,
      durationSec: seconds,
    },
    picture: 'Live vedichour.com/start (quiz taps: Work and money, then changing jobs) and a scroll of /sample-report. No birth data typed.',
    files: {
      reel9x16: reel,
      reel1x1: square,
      reel16x9: wide,
      carousel: slides,
      captions: ass,
    },
    humanView: 'Play reel-9x16.mp4 with sound before anyone posts it.',
  };
  writeFileSync(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const now = new Date().toISOString();
  const ins = db.prepare(`INSERT INTO assets (idea_slug, kind, path, created_at) VALUES (?, ?, ?, ?)`);
  ins.run(IDEA, 'reel-9x16', reel, now);
  ins.run(IDEA, 'carousel', slides, now);
  logRun(db, 'assets', 'ok', `reel ${seconds.toFixed(1)}s mean ${mean.toFixed(1)} dB, ${frameFiles.length} frames, ${CAROUSEL.length} slides`);

  const artifact = '/opt/cursor/artifacts';
  try {
    mkdirSync(artifact, { recursive: true });
    copyFileSync(reel, resolve(artifact, 'reel_9x16.mp4'));
    copyFileSync(resolve(slides, 'slide_1.png'), resolve(artifact, 'carousel_slide_1.png'));
    copyFileSync(resolve(frames, frameFiles[8] ?? frameFiles[0]), resolve(artifact, 'product_frame.jpg'));
  } catch {
    /* artifacts dir is optional outside the cloud VM */
  }
  return dir;
}
