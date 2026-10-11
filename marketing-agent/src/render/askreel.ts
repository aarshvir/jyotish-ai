/**
 * ASK-REEL renderer: card frames (HTML -> PNG via Playwright) and the ffmpeg assembly.
 *
 * Same method as the carousel (docs/DESIGN_SYSTEM.md NIGHT canvas, the site's own self-hosted
 * fonts, no metered API), at 1080x1920 for a 9:16 reel. Silent by design: a reel built from text
 * cards and a real screen needs no voice, which also keeps CLAUDE.md §2 intact (no synthetic
 * narrator). The owner can add trending audio inside Instagram when posting.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../db/index';
import { TOKENS, esc, brandFontsAvailable } from './carousel';
import { resolveTools, runTool } from './ffmpeg';

export const REEL_W = 1080;
export const REEL_H = 1920;
export const FPS = 30;

export type CardKind = 'hook' | 'q1' | 'q2' | 'reveal' | 'end';

export interface CardCopy {
  hook: string;
  questions: [string, string];
  reveal: { kicker: string; brand: string; ask: string };
  endCard: { headline: string; sub: string };
  disclaimer: string;
}

const FONT_DIR = resolve(ROOT, '..', 'public', 'fonts');

function fontFace(family: string, weight: number, file: string): string {
  const p = resolve(FONT_DIR, file);
  if (!existsSync(p)) return '';
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url('${pathToFileURL(p).href}') format('woff2');}`;
}

const FONTS = [
  fontFace('Cormorant Garamond', 400, 'cormorant-garamond-latin-400-normal.woff2'),
  fontFace('Cormorant Garamond', 600, 'cormorant-garamond-latin-600-normal.woff2'),
  fontFace('DM Sans', 400, 'dm-sans-latin-400-normal.woff2'),
  fontFace('DM Sans', 500, 'dm-sans-latin-500-normal.woff2'),
].join('\n');

/** A deterministic scatter of faint stars, so the same reel always renders the same sky. */
function stars(): string {
  const dots: string[] = [];
  let s = 20261012;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 46; i++) {
    const x = Math.round(rnd() * REEL_W);
    const y = Math.round(rnd() * REEL_H);
    const a = (0.12 + rnd() * 0.34).toFixed(2);
    dots.push(`${x}px ${y}px 0 ${rnd() > 0.8 ? 2 : 0}px rgba(246,239,228,${a})`);
  }
  return dots.join(',');
}

const BASE_CSS = `
${FONTS}
html,body{margin:0;padding:0;width:${REEL_W}px;height:${REEL_H}px;overflow:hidden;}
body{background:radial-gradient(120% 70% at 50% 0%, ${TOKENS.nightGlow} 0%, ${TOKENS.night1} 52%, ${TOKENS.night0} 100%);color:${TOKENS.nightFg};-webkit-font-smoothing:antialiased;position:relative;}
.sky{position:absolute;left:0;top:0;width:1px;height:1px;border-radius:50%;box-shadow:${stars()};}
.wrap{position:relative;box-sizing:border-box;width:${REEL_W}px;height:${REEL_H}px;padding:0 96px;display:flex;flex-direction:column;justify-content:center;}
.wrap div{text-wrap:balance;}
.serif{font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;}
.sans{font-family:'DM Sans',system-ui,sans-serif;}
`;

function page(body: string, extraCss = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${BASE_CSS}${extraCss}</style></head><body><div class="sky"></div>${body}</body></html>`;
}

/** Headline size by length, so a short hook is large and a long one still fits in three lines. */
export function hookSize(text: string): number {
  const n = text.length;
  if (n <= 28) return 118;
  if (n <= 44) return 100;
  return 88;
}

export function cardHtml(kind: CardKind, c: CardCopy): string {
  const T = TOKENS;
  switch (kind) {
    case 'hook':
      return page(
        `<div class="wrap" style="text-align:center"><div class="serif" style="font-weight:600;font-size:${hookSize(c.hook)}px;line-height:1.1;color:${T.nightFg}">${esc(c.hook)}</div></div>`,
      );
    case 'q1':
    case 'q2': {
      const q2 = kind === 'q2';
      return page(
        `<div class="wrap" style="text-align:center;gap:64px">
          <div class="serif" style="font-weight:600;font-size:84px;line-height:1.15;color:${T.nightFg}">${esc(c.questions[0])}</div>
          <div class="serif" style="font-weight:600;font-size:84px;line-height:1.15;color:${T.nightFg};visibility:${q2 ? 'visible' : 'hidden'}">${esc(c.questions[1])}</div>
        </div>`,
      );
    }
    case 'reveal':
      return page(
        `<div class="wrap" style="text-align:center;gap:18px">
          <div class="sans" style="font-weight:500;font-size:44px;letter-spacing:0.04em;color:${T.amber300}">${esc(c.reveal.kicker)}</div>
          <div class="serif" style="font-weight:600;font-size:176px;line-height:1;color:${T.amber300}">${esc(c.reveal.brand)}</div>
          <div class="serif" style="font-weight:400;font-size:132px;line-height:1.05;color:${T.nightFg}">${esc(c.reveal.ask)}</div>
        </div>`,
      );
    case 'end':
      return page(
        `<div class="wrap" style="text-align:center;gap:44px">
          <div class="serif" style="font-weight:600;font-size:104px;line-height:1.08;color:${T.nightFg}">${esc(c.endCard.headline)}</div>
          <div class="serif" style="font-weight:600;font-size:96px;color:${T.amber300}">${esc(c.endCard.sub)}</div>
          <div class="sans" style="font-weight:400;font-size:30px;line-height:1.5;color:${T.nightFg3};margin-top:70px;padding-top:36px;border-top:1px solid rgba(155,143,166,0.35);max-width:760px;align-self:center">${esc(c.disclaimer)}</div>
        </div>`,
      );
  }
}

/** Transparent overlay laid over the real product footage: the proof line and the sample tag. */
export function overlayHtml(proofLine: string, sampleTag: string): string {
  const T = TOKENS;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${FONTS}
html,body{margin:0;padding:0;width:${REEL_W}px;height:${REEL_H}px;background:transparent;overflow:hidden;}
.pill{position:absolute;left:56px;right:56px;bottom:230px;text-align:center;background:rgba(18,12,30,0.96);border:2px solid ${T.amber500};padding:30px 40px 26px;border-radius:30px;}
.line{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:76px;line-height:1.08;color:${T.nightFg};text-wrap:balance;}
.sub{font-family:'DM Sans',system-ui,sans-serif;font-weight:500;font-size:30px;letter-spacing:0.03em;color:${T.amber300};margin-top:14px;}
</style></head><body><div class="pill"><div class="line">${esc(proofLine)}</div><div class="sub">${esc(sampleTag)}</div></div></body></html>`;
}

async function loadChromium(): Promise<any> {
  try {
    const pw: any = await import('playwright');
    return pw.chromium;
  } catch (e: any) {
    throw new Error(`Playwright is not available (${String(e?.message ?? e).slice(0, 80)}). Run \`npm ci\` in marketing-agent/.`);
  }
}

export interface FramePaths {
  hook: string;
  q1: string;
  q2: string;
  reveal: string;
  end: string;
  overlay: string;
}

/** Render every card and the overlay to PNG. Refuses to run on a fallback font (CLAUDE.md §2). */
export async function renderAskReelFrames(c: CardCopy, proofLine: string, sampleTag: string, dir: string): Promise<FramePaths> {
  if (!brandFontsAvailable()) {
    throw new Error("the site's self-hosted brand fonts are missing from public/fonts/ — a reel rendered in a fallback serif is off-brand and will not be written.");
  }
  mkdirSync(dir, { recursive: true });
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: true });
  const out = {} as FramePaths;
  try {
    const context = await browser.newContext({ viewport: { width: REEL_W, height: REEL_H }, deviceScaleFactor: 1 });
    const pageObj = await context.newPage();
    const shoot = async (name: keyof FramePaths, html: string, transparent = false) => {
      const htmlPath = resolve(dir, `${name}.html`);
      writeFileSync(htmlPath, html);
      // goto the file, not setContent: a page built with setContent has an about:blank origin and
      // Chromium refuses its file:// @font-face URLs, so the brand serif silently fell back to
      // Georgia. Loaded from file:// the site's own Cormorant Garamond / DM Sans files apply.
      await pageObj.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
      await pageObj.evaluate(() => (document as any).fonts?.ready);
      const png = resolve(dir, `${name}.png`);
      await pageObj.screenshot({ path: png, type: 'png', omitBackground: transparent, clip: { x: 0, y: 0, width: REEL_W, height: REEL_H } });
      out[name] = png;
    };
    for (const k of ['hook', 'q1', 'q2', 'reveal', 'end'] as const) await shoot(k, cardHtml(k, c));
    await shoot('overlay', overlayHtml(proofLine, sampleTag), true);
  } finally {
    await browser.close();
  }
  return out;
}

export interface Timeline {
  hook: number;
  q1: number;
  q2: number;
  reveal: number;
  proof: number;
  end: number;
}

/** 16.2 s: long enough to read every card, short enough to be watched to the end. */
export const TIMELINE: Timeline = { hook: 2.8, q1: 1.4, q2: 2.2, reveal: 1.8, proof: 5.6, end: 2.4 };
export const MAX_REEL_SECONDS = 20;

export function totalSeconds(t: Timeline = TIMELINE): number {
  return Math.round((t.hook + t.q1 + t.q2 + t.reveal + t.proof + t.end) * 100) / 100;
}

const ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '128k', '-shortest'];
const SILENCE = ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];

function fades(dur: number, inD: number, outD: number): string {
  const f: string[] = [];
  if (inD > 0) f.push(`fade=t=in:st=0:d=${inD}`);
  if (outD > 0) f.push(`fade=t=out:st=${(dur - outD).toFixed(2)}:d=${outD}`);
  return f.join(',');
}

async function still(png: string, out: string, dur: number, o: { zoom: boolean; fadeIn: number; fadeOut: number }): Promise<void> {
  const { ffmpeg } = resolveTools();
  const frames = Math.round(dur * FPS);
  const motion = o.zoom
    ? `scale=2160:3840,zoompan=z='1+0.0004*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${REEL_W}x${REEL_H}:fps=${FPS}`
    : `scale=${REEL_W}:${REEL_H},fps=${FPS}`;
  const f = fades(dur, o.fadeIn, o.fadeOut);
  const vf = [motion, f, 'setsar=1', 'format=yuv420p'].filter(Boolean).join(',');
  // A single PNG is a one-frame video: without -loop the non-zoom cards (the two question cards)
  // ended after one frame and the first render came out 12.7 s instead of 16.2 s. The zoom cards
  // (zoompan, d=frames) generate their own frames and must NOT be looped.
  const loop = o.zoom ? [] : ['-loop', '1'];
  await runTool(ffmpeg, ['-y', ...loop, '-i', png, ...SILENCE, '-vf', vf, '-t', String(dur), ...ENC, out], undefined, 240000);
}

/** The real report footage with the proof line laid over it. */
async function proofSegment(clip: string, overlay: string, out: string, dur: number): Promise<void> {
  const { ffmpeg } = resolveTools();
  const f = fades(dur, 0.25, 0.25);
  const fc = `[0:v]scale=${REEL_W}:${REEL_H},setsar=1,fps=${FPS}[bg];[bg][1:v]overlay=0:0:enable='gte(t,1.3)'[ov];[ov]${f},format=yuv420p[v]`;
  await runTool(ffmpeg, ['-y', '-i', clip, '-i', overlay, ...SILENCE, '-filter_complex', fc, '-map', '[v]', '-map', '2:a', '-t', String(dur), ...ENC, out], undefined, 240000);
}

export interface ComposeInput {
  frames: FramePaths;
  /** 1080x1920 mp4 of the real report (captureProductShot). */
  proofClip: string;
  outPath: string;
  workDir: string;
  timeline?: Timeline;
}

/** Cut every segment to identical codec settings, then join them without re-encoding. */
export async function composeAskReel(input: ComposeInput): Promise<string> {
  const t = input.timeline ?? TIMELINE;
  mkdirSync(input.workDir, { recursive: true });
  const seg = (n: string) => resolve(input.workDir, `seg-${n}.mp4`);
  await still(input.frames.hook, seg('1-hook'), t.hook, { zoom: true, fadeIn: 0.4, fadeOut: 0.25 });
  await still(input.frames.q1, seg('2-q1'), t.q1, { zoom: false, fadeIn: 0.3, fadeOut: 0 });
  await still(input.frames.q2, seg('3-q2'), t.q2, { zoom: false, fadeIn: 0, fadeOut: 0.2 });
  await still(input.frames.reveal, seg('4-reveal'), t.reveal, { zoom: true, fadeIn: 0.25, fadeOut: 0.25 });
  await proofSegment(input.proofClip, input.frames.overlay, seg('5-proof'), t.proof);
  await still(input.frames.end, seg('6-end'), t.end, { zoom: true, fadeIn: 0.3, fadeOut: 0 });
  const order = ['1-hook', '2-q1', '3-q2', '4-reveal', '5-proof', '6-end'].map(seg);
  const list = resolve(input.workDir, 'concat.txt');
  writeFileSync(list, order.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  mkdirSync(dirname(input.outPath), { recursive: true });
  const { ffmpeg } = resolveTools();
  await runTool(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', input.outPath], undefined, 240000);
  return input.outPath;
}
