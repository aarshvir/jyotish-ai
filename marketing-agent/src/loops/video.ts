import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lint } from '../policy/linter';
import { isKilled, killInfo } from '../safety/killswitch';
import { db, logRun, enqueueApproval, ROOT } from '../db/index';
import { writeHeartbeat } from '../scheduler/heartbeat';

const MEDIA = resolve(ROOT, 'media');
const REELS = resolve(MEDIA, 'reels');
export const FONTS = resolve(MEDIA, 'fonts');
export const TTS_HELPER = resolve(MEDIA, 'tts_words.py');
export const FONT = {
  hook: 'cormorant-garamond-latin-600-normal.ttf',
  body: 'dm-sans-latin-500-normal.ttf',
  cta: 'dm-sans-latin-400-normal.ttf',
};
// ASS font family names (internal name table of the converted TTFs) and BGR colours.
const FAM = { hook: 'Cormorant Garamond Light SemiBold', body: 'DM Sans 9pt Medium', cta: 'DM Sans 9pt' };
const GOLD = '&H0037AFD4'; // #D4AF37
const OFFWHITE = '&H00D8ECF4'; // #F4ECD8
const CREAM = '&H00B8E6F5'; // #F5E6B8
const OUTL = '&HB4000000'; // translucent black outline
const SCRIPTS_FILE = resolve(ROOT, 'config', 'reel-scripts.json');

interface ReelScript {
  slug: string;
  title: string;
  product: string;
  hook: string;
  beats: string[];
  voiceover: string;
  cta: string;
}
export interface Seg {
  text: string;
  start: number;
  end: number;
}

function onPath(name: string): boolean {
  return spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { windowsHide: true }).status === 0;
}
function firstExisting(paths: string[]): string | null {
  for (const p of paths) if (existsSync(p)) return p;
  return null;
}
export function resolveTools(): { ffmpeg: string; ffprobe: string } {
  const local = process.env.LOCALAPPDATA ?? '';
  let ffBin = '';
  try {
    const base = resolve(local, 'Microsoft', 'WinGet', 'Packages');
    const pkg = readdirSync(base).find((d) => d.startsWith('Gyan.FFmpeg'));
    if (pkg) {
      const sub = readdirSync(resolve(base, pkg)).find((d) => /ffmpeg-.*build/i.test(d));
      if (sub) ffBin = resolve(base, pkg, sub, 'bin');
    }
  } catch {
    /* ignore */
  }
  const ffmpeg = (onPath('ffmpeg') && 'ffmpeg') || firstExisting(ffBin ? [resolve(ffBin, 'ffmpeg.exe')] : []) || 'ffmpeg';
  const ffprobe = (onPath('ffprobe') && 'ffprobe') || firstExisting(ffBin ? [resolve(ffBin, 'ffprobe.exe')] : []) || 'ffprobe';
  return { ffmpeg, ffprobe };
}

export function run(exe: string, args: string[], cwd?: string, timeoutMs = 360000): Promise<void> {
  return new Promise((res, rej) => {
    const child = spawn(exe, args, { cwd, windowsHide: true });
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      rej(new Error(`${exe} timed out`));
    }, timeoutMs);
    child.stderr?.on('data', (d) => (err += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      rej(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? res() : rej(new Error(`${exe} exit ${code}: ${err.slice(-360)}`));
    });
  });
}

export function probeDuration(ffprobe: string, file: string): Promise<number> {
  return new Promise((res, rej) => {
    const child = spawn(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.on('error', rej);
    child.on('close', () => {
      const n = parseFloat(out.trim());
      isNaN(n) ? rej(new Error('no duration')) : res(n);
    });
  });
}

function wrap(text: string, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = (cur ? cur + ' ' : '') + w;
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

function assTime(s: number): string {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
function assEsc(t: string): string {
  return t.replace(/[{}]/g, '').replace(/\r?\n/g, '\\N');
}

/**
 * Optional caption geometry. Defaults reproduce the v3.1 faceless-reel layout exactly; the
 * presenter-led render pipeline overrides them to keep text clear of the speaker's face and
 * inside Instagram's safe margins.
 */
export interface AssLayout {
  hookY?: number;
  captionY?: number;
  ctaY?: number;
  /** Seconds the CTA is held at the end. */
  ctaHoldSec?: number;
  /** Wrap width for the hook, in characters. Fewer lines = shorter block = clears a face. */
  hookWrap?: number;
  /** ASS font family for captions/hook — overridden for scripts the brand TTFs can't render. */
  fontFamily?: { hook?: string; body?: string; cta?: string };
  /**
   * Reel-relative time windows (product/screencap shots) during which karaoke captions move to
   * the TOP zone (`topCaptionY`) instead of `captionY`. Real product UI is dense with its own
   * text mid-frame; a caption at chest height lands straight on it. The top zone sits below the
   * wordmark (~120-166px) and above the page content that matters.
   */
  topWindows?: { start: number; end: number }[];
  /** Caption anchor Y used inside `topWindows`. Default 330 keeps the block within ~240-420px. */
  topCaptionY?: number;
}

/** Build an .ass with a Cormorant hook, word-synced karaoke VO captions (gold sweep), and a CTA. */
export function buildAss(hook: string, segments: Seg[], cta: string, total: number, layout: AssLayout = {}): string {
  const hookY = layout.hookY ?? 700;
  const captionY = layout.captionY ?? 1175;
  const ctaY = layout.ctaY ?? 1630;
  const ctaHold = layout.ctaHoldSec ?? 2.5;
  const hookWrap = layout.hookWrap ?? 16;
  const fam = { hook: layout.fontFamily?.hook ?? FAM.hook, body: layout.fontFamily?.body ?? FAM.body, cta: layout.fontFamily?.cta ?? FAM.cta };
  const header =
    `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n` +
    `[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    `Style: Hook,${fam.hook},104,${CREAM},${CREAM},${OUTL},&H64000000,0,0,0,0,100,100,0,0,1,4,4,5,80,80,0,1\n` +
    `Style: Caption,${fam.body},76,${GOLD},${OFFWHITE},${OUTL},&H64000000,-1,0,0,0,100,100,1,0,1,5,3,5,80,80,0,1\n` +
    // Top-zone variant for product shots: BorderStyle=3 draws an opaque navy band (OutlineColour
    // is the box fill) so the caption never garbles the page's own text behind it. Shadow=0 —
    // with BorderStyle=3 a shadow would draw a second offset box.
    `Style: CaptionBand,${fam.body},76,${GOLD},${OFFWHITE},&H101A0A0A,&H64000000,-1,0,0,0,100,100,1,0,3,16,0,5,80,80,0,1\n` +
    `Style: CTA,${fam.cta},46,${GOLD},${GOLD},${OUTL},&H64000000,0,0,0,0,100,100,1,0,1,3,2,5,80,80,0,1\n\n` +
    `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  const ev: string[] = [];
  const hookEnd = Math.min(2.7, Math.max(2.1, total * 0.16 + 1.7));
  ev.push(`Dialogue: 0,${assTime(0)},${assTime(hookEnd)},Hook,,0,0,0,,{\\an5\\pos(540,${hookY})\\fad(250,200)}${assEsc(wrap(hook, hookWrap))}`);

  // derive per-word timing from segments (proportional by char length, +90ms lead)
  const words: Seg[] = [];
  for (const seg of segments) {
    const sw = seg.text.split(/\s+/).filter(Boolean);
    const dur = Math.max(0.4, seg.end - seg.start);
    const tc = sw.reduce((a, w) => a + w.length, 0) || 1;
    let acc = 0;
    for (const w of sw) {
      const st = seg.start + (acc / tc) * dur + 0.09;
      acc += w.length;
      words.push({ text: w, start: st, end: seg.start + (acc / tc) * dur + 0.09 });
    }
  }
  const capStart = hookEnd - 0.1;
  const capEnd = total - ctaHold;
  const topY = layout.topCaptionY ?? 330;
  const topWins = layout.topWindows ?? [];
  const cap = words.filter((x) => x.start >= capStart && x.start < capEnd);
  for (let i = 0; i < cap.length; i += 3) {
    const grp = cap.slice(i, i + 3);
    const bs = grp[0].start;
    const be = Math.min(capEnd, grp[grp.length - 1].end + 0.22);
    if (be <= bs) continue;
    // Classify the group by its midpoint so a line straddling a shot boundary follows
    // whichever shot it mostly plays over.
    const mid = (bs + be) / 2;
    const inTop = topWins.some((w) => mid >= w.start && mid <= w.end);
    const y = inTop ? topY : captionY;
    const kara = grp.map((g) => `{\\kf${Math.max(8, Math.round((g.end - g.start) * 100))}}${assEsc(g.text.toUpperCase())} `).join('').trim();
    ev.push(`Dialogue: 0,${assTime(bs)},${assTime(be)},${inTop ? 'CaptionBand' : 'Caption'},,0,0,0,,{\\an5\\pos(540,${y})\\fad(70,70)\\fscx84\\fscy84\\t(0,150,\\fscx105\\fscy105)\\t(150,230,\\fscx100\\fscy100)}${kara}`);
  }
  ev.push(`Dialogue: 0,${assTime(Math.max(0, total - ctaHold))},${assTime(total)},CTA,,0,0,0,,{\\an5\\pos(540,${ctaY})\\fad(200,200)}${assEsc(wrap(cta, 26))}`);
  return header + ev.join('\n') + '\n';
}

// --- shared look: the v3.1 grade + overlay set, reused by src/render/assemble.ts ----------

/** drawtext border/shadow suffix used by every text overlay. */
export const TEXT_SHADOW = 'borderw=2:bordercolor=0x000000@0.5:shadowcolor=0x000000@0.55:shadowx=2:shadowy=3';

/** Navy/gold split-tone grade — the VedicHour look. */
export const GRADE =
  `colorbalance=rs=-0.06:bs=0.10:rh=0.10:bh=-0.06,eq=contrast=1.06:saturation=0.95:gamma=0.98,curves=all='0/0.03 0.25/0.22 0.75/0.80 1/0.98'`;

/** Highlight-only bloom pass (feed it the graded stream, screen-blend the result back). */
export const BLOOM = `curves=all='0/0 0.60/0 0.85/0.70 1/1',gblur=sigma=34:steps=4`;

/** Persistent gold wordmark. `y` moves it clear of the presenter framing when needed. */
export function wordmarkFilter(y = 120, fontfile = 'cta.ttf'): string {
  return `drawtext=fontfile=${fontfile}:text=VEDICHOUR:fontcolor=0xD4AF37@0.9:fontsize=38:x=(w-text_w)/2:y=${y}:${TEXT_SHADOW}`;
}

/** Top progress bar that fills over the full duration. */
export function progressFilter(total: number): string {
  return `drawbox=x=0:y=14:w=iw:h=6:color=white@0.14:t=fill,drawbox=x=0:y=14:w='iw*min(t/${total},1)':h=6:color=0xD4AF37@0.9:t=fill`;
}

/** Luma temporal grain — the last step before format conversion. */
export const GRAIN = 'noise=c0s=9:c0f=t+u';

function renderedSlugs(): Set<string> {
  if (!existsSync(REELS)) return new Set();
  return new Set(readdirSync(REELS).filter((d) => existsSync(resolve(REELS, d, `${d}.mp4`))));
}

function loadScripts(): { voice: string; reels: ReelScript[] } {
  return JSON.parse(readFileSync(SCRIPTS_FILE, 'utf8'));
}

/**
 * v3.1 renderer: animated brand gradient + supersampled seamless ping-pong Ken Burns +
 * navy/gold split-tone grade + highlight bloom + vignette + ASS karaoke captions
 * (word-synced gold sweep, Cormorant hook, DM Sans body) + wordmark + top progress
 * bar + luma temporal grain. Graph via script file to avoid Windows ffmpeg escaping.
 */
async function renderReel(s: ReelScript, voice: string): Promise<{ file: string; durationSec: number }> {
  const { ffmpeg, ffprobe } = resolveTools();
  const work = resolve(REELS, s.slug);
  mkdirSync(work, { recursive: true });
  // libass scans fontsdir by internal family name — copy the brand TTFs into the work dir
  copyFileSync(resolve(FONTS, FONT.hook), resolve(work, 'hook.ttf'));
  copyFileSync(resolve(FONTS, FONT.body), resolve(work, 'body.ttf'));
  copyFileSync(resolve(FONTS, FONT.cta), resolve(work, 'cta.ttf'));

  // 1) VO + segment timing
  const vo = resolve(work, 'vo.mp3');
  const segsPath = resolve(work, 'segs.json');
  await run('python', [TTS_HELPER, s.voiceover, voice, vo, segsPath], work, 120000);
  let dur = 15;
  try {
    dur = await probeDuration(ffprobe, vo);
  } catch {
    /* default */
  }
  const total = Math.max(8, +(dur + 1.0).toFixed(2));
  const frames = Math.round(total * 30);

  // 2) captions.ass
  let segments: Seg[] = [];
  try {
    segments = (JSON.parse(readFileSync(segsPath, 'utf8')).segments as Seg[]) || [];
  } catch {
    /* none */
  }
  if (!segments.length) segments = [{ text: s.voiceover, start: 0.1, end: Math.max(2, total - 1) }];
  writeFileSync(resolve(work, 'captions.ass'), buildAss(s.hook, segments, s.cta, total));

  // 3) overlays kept in the filtergraph
  const wordmark = wordmarkFilter(120);
  const progress = progressFilter(total);

  // 4) graph: supersample -> ping-pong Ken Burns -> grade -> bloom -> vignette -> ASS -> wordmark -> progress -> grain
  const kb = `zoompan=z='1.0+0.06*(0.5-0.5*cos(2*PI*on/${frames}))':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`;
  const graph =
    `[0:v]scale=2160:3840,${kb},${GRADE},split[a][b];\n` +
    `[b]${BLOOM}[glow];\n` +
    `[a][glow]blend=all_mode=screen:all_opacity=0.5,vignette=PI/5:mode=backward,subtitles=captions.ass:fontsdir=.,${wordmark},${progress},${GRAIN},format=yuv420p[v]`;
  writeFileSync(resolve(work, 'graph.txt'), graph);

  const bg = `gradients=s=1080x1920:c0=0x0a0a1a:c1=0x1a1340:c2=0x0a0a1a:nb_colors=3:x0=0:y0=0:x1=1080:y1=1920:speed=0.010`;
  const outName = `${s.slug}.mp4`;
  const args = [
    '-y',
    '-f', 'lavfi', '-i', bg,
    '-i', 'vo.mp3',
    '-filter_complex_script', 'graph.txt',
    '-map', '[v]', '-map', '1:a',
    '-t', String(total), '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '22', '-maxrate', '9M', '-bufsize', '18M',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    outName,
  ];
  await run(ffmpeg, args, work, 360000);
  return { file: resolve(work, outName), durationSec: total };
}

/** L2 — render the next un-rendered reel from the backlog (kill-aware, policy-gated). */
export async function runReelLoop(opts: { slug?: string } = {}): Promise<void> {
  const loop = 'reel';
  if (isKilled()) {
    console.log(`[reel] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }
  logRun({ loop, status: 'started' });
  try {
    const { voice, reels } = loadScripts();
    const done = renderedSlugs();
    const target = opts.slug ? reels.find((r) => r.slug === opts.slug) : reels.find((r) => !done.has(r.slug));
    if (!target) {
      console.log('[reel] No un-rendered reels left in the backlog.');
      logRun({ loop, status: 'skipped', detail: 'backlog empty' });
      writeHeartbeat(loop, 'backlog empty');
      return;
    }

    const script = `${target.hook}\n${target.beats.join('\n')}\n${target.voiceover}\n${target.cta}`;
    const verdict = await lint(script);
    if (verdict.verdict === 'block') {
      console.log(`[reel] BLOCKED "${target.title}" — ${verdict.reason}. Not rendering.`);
      logRun({ loop, status: 'skipped', detail: `blocked: ${verdict.reason}` });
      db().prepare(`INSERT INTO content_library (asset, type, product, script_source, status, meta) VALUES (?,?,?,?,?,?)`)
        .run(target.slug, 'reel', target.product, `reel-script:${target.slug}`, 'archived', JSON.stringify({ slug: target.slug, title: target.title, verdict: 'block', reason: verdict.reason }));
      writeHeartbeat(loop, `blocked: ${target.slug}`);
      return;
    }

    console.log(`[reel] Rendering "${target.title}" (${verdict.verdict})…`);
    const t0 = Date.now();
    const { file, durationSec } = await renderReel(target, voice);
    const meta = { slug: target.slug, title: target.title, durationSec, file, verdict: verdict.verdict, reason: verdict.reason };
    writeFileSync(resolve(REELS, target.slug, 'meta.json'), JSON.stringify(meta, null, 2));
    db().prepare(`INSERT INTO content_library (asset, type, product, script_source, status, meta) VALUES (?,?,?,?,?,?)`)
      .run(file, 'reel', target.product, `reel-script:${target.slug}`, 'ready', JSON.stringify(meta));
    if (verdict.verdict === 'flag') {
      enqueueApproval({ item: `Reel: ${target.title}`, lane: 'B', linter_verdict: 'flag', linter_reason: verdict.reason, channel: 'reel' });
    }
    console.log(`[reel] ✅ ${file}\n       ${durationSec}s, 1080x1920, rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s | linter: ${verdict.reason}`);
    writeHeartbeat(loop, `${verdict.verdict}: ${target.slug}`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error(`[reel] failed: ${msg}`);
    logRun({ loop, status: 'error', detail: msg.slice(0, 200) });
    writeHeartbeat(loop, `error: ${msg.slice(0, 80)}`);
  }
}
