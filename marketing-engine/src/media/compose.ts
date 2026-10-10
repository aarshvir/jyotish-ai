import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capture, run, runCapture } from '../shell';

export async function durationSec(file: string): Promise<number> {
  const out = await capture('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const n = Number(out.trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`no duration on ${file}`);
  return n;
}

export async function meanVolumeDb(file: string): Promise<number> {
  const blob = await runCapture('ffmpeg', ['-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = /mean_volume:\s*(-?[\d.]+)\s*dB/i.exec(blob);
  if (!m) throw new Error(`could not read volume of ${file}`);
  return Number(m[1]);
}

function assTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

/** Even cues from word length. espeak-ng does not give us word timestamps. */
export function writeAss(text: string, duration: number, assPath: string): void {
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => Math.max(1, w.replace(/[^\p{L}\p{N}]/gu, '').length));
  const total = weights.reduce((a, b) => a + b, 0);
  const lines: string[] = [];
  let t = 0.15;
  const group = 6;
  for (let i = 0; i < words.length; i += group) {
    const slice = words.slice(i, i + group);
    const w = weights.slice(i, i + group).reduce((a, b) => a + b, 0);
    const dur = Math.max(0.8, (w / total) * (duration - 0.3));
    const end = Math.min(duration - 0.05, t + dur);
    lines.push(`Dialogue: 0,${assTime(t)},${assTime(end)},Caption,,0,0,0,,${slice.join(' ')}`);
    t = end;
  }
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,52,&H00E8F4F4,&H000000FF,&H00101010,&H96000000,0,0,0,0,100,100,0,0,1,3,0,2,70,70,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  writeFileSync(assPath, header + lines.join('\n') + '\n');
}

export async function slideshow(dir: string, fps: number): Promise<void> {
  const fonts = '/usr/share/fonts/truetype/dejavu';
  await run('ffmpeg', [
    '-y',
    '-framerate', String(fps),
    '-i', 'frames/frame_%03d.jpg',
    '-i', 'voice-en.wav',
    '-vf', `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,ass=captions.ass:fontsdir=${fonts}`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-shortest',
    '-movflags', '+faststart',
    'reel-9x16.mp4',
  ], { cwd: dir });
}

export async function cutAspect(src: string, outPath: string, mode: 'square' | 'wide'): Promise<void> {
  const vf = mode === 'square'
    ? 'crop=ih:ih,scale=1080:1080'
    : 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080';
  await run('ffmpeg', ['-y', '-i', src, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'copy', outPath]);
}

export function framesDir(dir: string): string {
  return resolve(dir, 'frames');
}
