import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ComposeOpts {
  still: string;
  audio: string | null;
  durationSec: number;
  captions: string;
  outFile: string;
  width: number;
  height: number;
}

function runFfmpeg(args: string[]): void {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${(r.stderr || r.stdout || '').slice(-800)}`);
  }
}

export function composeVideo(opts: ComposeOpts): void {
  if (!existsSync(opts.still)) throw new Error(`missing still ${opts.still}`);
  const srt = resolve(opts.outFile.replace(/\.mp4$/, '.srt'));
  writeFileSync(srt, toSrt(opts.captions, opts.durationSec), 'utf8');
  const dur = Math.max(8, Math.min(45, opts.durationSec || 32));
  const vf = [
    `scale=${opts.width}:${opts.height}:force_original_aspect_ratio=increase`,
    `crop=${opts.width}:${opts.height}`,
    `zoompan=z='min(1.06,1+0.0012*on)':x='iw/2-(iw/zoom/2)':y='min(ih-ih/zoom, max(0, (ih-ih/zoom)*on/${Math.max(1, dur * 30)}))':d=1:s=${opts.width}x${opts.height}:fps=30`,
    `drawbox=x=0:y=0:w=iw:h=8:color=D4A853@1:t=fill`,
    `drawbox=x=0:y=ih-64:w=iw:h=64:color=120C1E@0.72:t=fill`,
  ].join(',');

  const args = ['-y', '-loop', '1', '-t', String(dur), '-i', opts.still];
  if (opts.audio && existsSync(opts.audio)) args.push('-i', opts.audio);
  args.push('-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30');
  if (opts.audio && existsSync(opts.audio)) args.push('-c:a', 'aac', '-shortest');
  else args.push('-an');
  args.push(opts.outFile);
  runFfmpeg(args);
}

function toSrt(text: string, durationSec: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  const chunk = 8;
  const lines: string[] = [];
  const n = Math.max(1, Math.ceil(words.length / chunk));
  const slice = durationSec / n;
  for (let i = 0; i < n; i++) {
    const start = i * slice;
    const end = Math.min(durationSec, (i + 1) * slice);
    lines.push(`${i + 1}`, `${fmt(start)} --> ${fmt(end)}`, words.slice(i * chunk, (i + 1) * chunk).join(' '), '');
  }
  return lines.join('\n');
}

function fmt(sec: number): string {
  const ms = Math.floor((sec % 1) * 1000);
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`;
}
