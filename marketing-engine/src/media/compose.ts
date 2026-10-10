import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { capture, run, runCapture } from '../shell';

const FONTS = '/usr/share/fonts/truetype/macos';

export async function durationSec(file: string): Promise<number> {
  const out = await capture('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const n = Number(out.trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`no duration on ${file}`);
  return n;
}

export async function meanVolumeDb(file: string): Promise<number> {
  const blob = await runCapture('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = /mean_volume:\s*(-?[\d.]+)\s*dB/i.exec(blob);
  if (!m) throw new Error(`could not read volume of ${file}`);
  return Number(m[1]);
}

/** Longest stretch under -36 dB. A breath is fine. A full second of dead air is not. */
export async function maxSilenceSec(file: string): Promise<number> {
  const blob = await runCapture('ffmpeg', [
    '-hide_banner', '-i', file, '-af', 'silencedetect=noise=-36dB:d=0.3', '-f', 'null', '-',
  ]);
  const durations = [...blob.matchAll(/silence_duration:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  return durations.length ? Math.max(...durations) : 0;
}

function assTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

/** Cue times are the real speech segments, not an even split of the whole reel. */
export function writeCueAss(cues: CaptionCue[], assPath: string): void {
  const lines = cues.map((cue) => {
    const text = cue.text.replace(/\n/g, '\\N');
    return `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Caption,,0,0,0,,${text}`;
  });
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Inter,50,&H00E6F1F4,&H000000FF,&H00140C18,&H00120C16,-1,0,0,0,100,100,0,0,3,16,0,2,72,72,128,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  writeFileSync(assPath, header + lines.join('\n') + '\n');
}

export type Segment =
  | { kind: 'speech'; still: string; wav: string; caption: string | null; beatId: string }
  | { kind: 'hold'; still: string; seconds: number }
  | { kind: 'glide'; dir: string; frames: number };

async function encodeSpeech(seg: Extract<Segment, { kind: 'speech' }>, out: string): Promise<void> {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-loop', '1', '-i', seg.still,
    '-i', seg.wav,
    '-vf', 'scale=1080:1920,setsar=1,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1',
    '-shortest',
    out,
  ]);
}

async function encodeHold(seg: Extract<Segment, { kind: 'hold' }>, out: string): Promise<void> {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-loop', '1', '-i', seg.still,
    '-f', 'lavfi', '-t', String(seg.seconds), '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
    '-vf', 'scale=1080:1920,setsar=1,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1',
    '-t', String(seg.seconds),
    out,
  ]);
}

async function encodeGlide(seg: Extract<Segment, { kind: 'glide' }>, out: string): Promise<void> {
  const dur = (seg.frames / 30).toFixed(3);
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', '30', '-start_number', '0', '-i', resolve(seg.dir, 'f_%02d.png'),
    '-f', 'lavfi', '-t', dur, '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
    '-vf', 'scale=1080:1920,setsar=1,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '1',
    '-t', dur,
    out,
  ]);
}

export interface CutTimeline {
  duration: number;
  cues: { beatId: string; start: number; end: number; text: string }[];
}

/** Picture duration follows each sentence. Glides are the breaths between shots. */
export async function assembleReel(dir: string, segments: Segment[], reelPath: string): Promise<CutTimeline> {
  const partDir = resolve(dir, 'parts');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(partDir, { recursive: true });

  const cues: CutTimeline['cues'] = [];
  const files: string[] = [];
  let t = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const out = resolve(partDir, `seg_${String(i).padStart(2, '0')}.mkv`);
    if (seg.kind === 'speech') await encodeSpeech(seg, out);
    else if (seg.kind === 'hold') await encodeHold(seg, out);
    else await encodeGlide(seg, out);
    const dur = await durationSec(out);
    if (seg.kind === 'speech' && seg.caption) {
      cues.push({ beatId: seg.beatId, start: t + 0.04, end: Math.max(t + 0.2, t + dur - 0.04), text: seg.caption });
    }
    t += dur;
    files.push(out);
  }

  const list = resolve(dir, 'concat.txt');
  writeFileSync(list, files.map((f) => `file '${f}'`).join('\n') + '\n');
  const master = resolve(dir, 'master.mkv');
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', master]);

  const ass = resolve(dir, 'captions.ass');
  writeCueAss(cues, ass);
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', master,
    '-vf', `ass=${ass}:fontsdir=${FONTS}`,
    '-af', 'highpass=f=70,acompressor=threshold=-20dB:ratio=1.6:attack=12:release=140:makeup=1,loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '1',
    '-movflags', '+faststart',
    reelPath,
  ]);
  return { duration: await durationSec(reelPath), cues };
}

export async function cutAspect(src: string, outPath: string, mode: 'square' | 'wide'): Promise<void> {
  // Square keeps the hour card (it sits in the upper half). The 9:16 file is the one with captions.
  const vf = mode === 'square'
    ? 'crop=1080:1080:0:180,scale=1080:1080,setsar=1'
    : 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0a0713,setsar=1';
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', vf,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'copy', outPath,
  ]);
}
