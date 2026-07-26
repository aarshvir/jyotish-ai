import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { resolveCreativeFile } from './preflight';

/**
 * The INPUT CONTRACT for the publish gate: everything the render pipeline leaves behind in
 * output/reels/<slug>/. Reviewers see this dossier and nothing else — notably NOT defects.md,
 * so the nine passes stay independent of the render agent's own self-assessment.
 */

export interface ReelArtifacts {
  slug: string;
  dir: string;
  video: string | null;
  durationSec: number;
  publish: any;
  creative: any | null;
  creativeFile: string | null;
  audioReport: string;
  captions: string;
  /** audit frames, ordered, with the reel timestamp each was grabbed at. */
  frames: { path: string; atSec: number; label: string }[];
  probe: any;
  /** "s1 0-6s (Veo native voice) · s2 6-9.3s · ..." when the audio report carries it. */
  shotBoundaries: string;
}

const REELS = resolve(ROOT, 'output', 'reels');

export function reelDir(slug: string): string {
  return resolve(REELS, slug);
}

export function listReels(): string[] {
  if (!existsSync(REELS)) return [];
  return readdirSync(REELS).filter((d) => existsSync(resolve(REELS, d, 'publish.json')));
}

function readIf(p: string): string {
  try { return existsSync(p) ? readFileSync(p, 'utf8') : ''; } catch { return ''; }
}

/**
 * Audit frames are grabbed evenly across the reel by the render pipeline, first at 0.5s and
 * last at duration-0.5s. Reconstruct each frame's timestamp so findings can be anchored to
 * real seconds instead of frame numbers.
 */
function frameTimes(n: number, durationSec: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [durationSec / 2];
  const first = 0.5;
  const last = Math.max(first, durationSec - 0.5);
  const step = (last - first) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round((first + i * step) * 10) / 10);
}

export function loadReel(slug: string): ReelArtifacts {
  const dir = reelDir(slug);
  if (!existsSync(dir)) throw new Error(`no reel at ${dir}`);
  const pubPath = resolve(dir, 'publish.json');
  if (!existsSync(pubPath)) throw new Error(`${slug} has no publish.json — it has not finished rendering`);
  const publish = JSON.parse(readFileSync(pubPath, 'utf8'));

  const framesDir = resolve(dir, 'frames');
  const files = existsSync(framesDir)
    ? readdirSync(framesDir).filter((f) => /^audit\d+\.(jpg|png)$/i.test(f)).sort()
    : [];
  const durationSec = Number(publish?.durationSec ?? publish?.verification?.probe?.durationSec ?? 0);
  const times = frameTimes(files.length, durationSec);
  const frames = files.map((f, i) => ({
    path: resolve(framesDir, f),
    atSec: times[i],
    label: `FRAME ${String(i + 1).padStart(2, '0')} @ ${times[i]}s`,
  }));

  const creativeFile = resolveCreativeFile(slug);
  let creative: any = null;
  if (creativeFile) { try { creative = JSON.parse(readFileSync(creativeFile, 'utf8')); } catch { creative = null; } }

  const audioReport = readIf(resolve(dir, 'audio-report.txt'));
  const boundaries = /Shot boundaries:.*/.exec(audioReport)?.[0] ?? '';

  return {
    slug,
    dir,
    video: publish?.video ?? (existsSync(resolve(dir, 'final.mp4')) ? resolve(dir, 'final.mp4') : null),
    durationSec,
    publish,
    creative,
    creativeFile,
    audioReport,
    captions: readIf(resolve(dir, 'work', 'captions.ass')),
    frames,
    probe: publish?.verification?.probe ?? null,
    shotBoundaries: boundaries,
  };
}

/** Strip the ASS envelope down to `start-end  STYLE  text` so a reviewer can read timing fast. */
export function captionTimeline(ass: string): string {
  const lines = ass.split(/\r?\n/).filter((l) => l.startsWith('Dialogue:'));
  return lines
    .map((l) => {
      const p = l.slice('Dialogue:'.length).split(',');
      const [, start, end, style] = p;
      const text = p.slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\\N/g, ' / ').trim();
      return `${(start ?? '').trim()}–${(end ?? '').trim()}  ${(style ?? '').trim().padEnd(11)} ${text}`;
    })
    .join('\n');
}

/** The shared evidence block every reviewer receives. Text only — frames are attached separately. */
export function dossier(a: ReelArtifacts): string {
  const shots = (a.publish?.shots ?? []).map((s: any) => `  ${s.id} · ${s.role} · ${s.billedSec}s · ${s.label ?? ''}`).join('\n');
  const script = (a.creative?.shots ?? [])
    .map((s: any) => `  ${s.id} (${s.role}, ${s.seconds}s) ${s.dialogue ? `SPOKEN ON CAMERA: "${s.dialogue}"` : s.vo ? `NARRATED (voice-over): "${s.vo}"` : `capture: ${s.capture?.url ?? '—'}`}`)
    .join('\n');

  return `REEL: ${a.slug}
TITLE: ${a.publish?.title ?? '—'}
DURATION: ${a.durationSec}s · ${a.probe?.width}x${a.probe?.height} · ${a.probe?.fps}fps · audio=${a.probe?.hasAudio}
HOOK (first on-screen line): ${a.creative?.hook ?? '—'}
CTA (closing on-screen line): ${a.creative?.cta ?? '—'}
NARRATION VOICE CONFIGURED: ${a.creative?.voice ?? '(none declared)'}

SHOTS AS RENDERED:
${shots || '  (none listed)'}

SCRIPT AS WRITTEN:
${script || '  (no creative json found)'}

${a.shotBoundaries || ''}

ON-SCREEN CAPTION TIMELINE (start–end, style, text):
${captionTimeline(a.captions) || '(no captions.ass found)'}

AUDIO MEASUREMENTS (ffmpeg loudnorm / silencedetect / astats):
${a.audioReport || '(no audio report)'}

PUBLISH COPY:
  caption: ${a.publish?.caption ?? '—'}
  youtube title: ${a.publish?.youtubeTitle ?? '—'}
  description: ${a.publish?.description ?? '—'}
  hashtags: ${(a.publish?.hashtags ?? []).join(' ')}`;
}
