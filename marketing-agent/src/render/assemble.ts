import { existsSync, mkdirSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { envStr } from './env';
import {
  resolveTools, run, runCapture, probeVideo, probeDuration,
  buildAss, FONT, FONTS,
  GRADE, BLOOM, GRAIN, wordmarkFilter, progressFilter,
  type Seg, type Probe,
} from './ffmpeg';
import { AD_VO_VOICE, AD_VO_LANGUAGE, NATIVE_VOICE, sarvamSpeak, hasSarvamKey, SARVAM_MISSING_MESSAGE } from './sarvam';
import type { CreativeScript, Shot } from './types';

/**
 * Shot assembly + finishing.
 *
 * This deliberately reuses the v3.1 renderer's machinery from src/loops/video.ts — the same
 * navy/gold split-tone grade, highlight bloom, vignette, gold wordmark, progress bar, luma
 * grain, and the same word-synced ASS/libass karaoke captions in the brand TTFs. What is new
 * is that the picture now comes from real generated shots instead of an animated gradient.
 *
 * Windows note, inherited from v3.1 and non-negotiable: the filtergraph is written to graph.txt
 * and passed with -filter_complex_script, and ffmpeg is spawned directly (never via a shell),
 * so quoting/escaping can't corrupt the graph.
 */

export const FRAME = { w: 1080, h: 1920, fps: 30 };
const AUDIO = { rate: 48000, channels: 2 };

/**
 * Presenter-led caption geometry, tuned against extracted frames rather than guessed:
 *  - hookY 400 + hookWrap 20 keeps the hook to two lines spanning ~290-510px, which clears both
 *    Instagram's ~250px top UI zone AND the top of a medium-close-up face (~560px). At the
 *    original 16-char wrap the hook ran to three lines and the last line landed on the face.
 *  - captionY 1290 puts karaoke captions over the chest, never the mouth.
 *  - ctaY 1400 keeps the three-line CTA above ~1500px, where Instagram's bottom chrome starts.
 */
export const PRESENTER_LAYOUT = { hookY: 400, hookWrap: 20, captionY: 1290, ctaY: 1400, ctaHoldSec: 2.6 };

export interface PreparedShot {
  shot: Shot;
  /** Normalized 1080x1920 clip on disk. */
  path: string;
  /** Actual duration after normalization. */
  seconds: number;
  /** Where this shot starts in the finished reel. */
  startSec: number;
  /** Caption segments in REEL-relative time. */
  segments: Seg[];
  /** Did this shot's audio come from the model itself (Veo) rather than TTS? */
  nativeAudio: boolean;
  /** Voice this shot speaks with: `veo_native`, the Sarvam ad voice, or null when silent. */
  voiceId: string | null;
  costUsd: number;
  provider: string;
}

// ---------------------------------------------------------------------------
// Voiceover
// ---------------------------------------------------------------------------

export interface VoResult {
  audioPath: string | null;
  segments: Seg[];
  durationSec: number;
  engine: 'sarvam' | 'native' | 'none';
  costUsd: number;
  /** The voice id this shot actually speaks with — asserted to be uniform across the reel. */
  voiceId: string | null;
  chars: number;
}

/**
 * THE AD-REEL VOICE LADDER (owner law 2026-07-26 + CLAUDE.md §2):
 *
 *   (a) the shot has Veo native dialogue -> `nativeVo()`, never overdubbed. Free, and the bar.
 *   (b) otherwise -> Sarvam Bulbul v3, the single male AD_VO_VOICE. ~$0.01/reel.
 *   (c) no SARVAM_API_KEY -> THROW. There is deliberately no third rung: the owner rejected
 *       edge-tts (en-IN-NeerjaNeural) as "very AI-generated", so a silent fallback to it would
 *       ship the exact defect he already rejected once.
 *
 * edge-tts and ElevenLabs were removed from this path rather than left dormant — a dormant
 * female-defaulting fallback is how the first two ads went out.
 */
export async function synthesizeVo(text: string | undefined, work: string, id: string): Promise<VoResult> {
  const t = (text ?? '').trim();
  if (!t) return { audioPath: null, segments: [], durationSec: 0, engine: 'none', costUsd: 0, voiceId: null, chars: 0 };
  if (!hasSarvamKey()) throw new Error(`shot ${id}: ${SARVAM_MISSING_MESSAGE}`);

  const wav = resolve(work, `${id}.vo.wav`);
  const res = await sarvamSpeak({ text: t, languageCode: envStr('AD_VO_LANGUAGE') ?? AD_VO_LANGUAGE, voice: AD_VO_VOICE, outPath: wav });
  const { ffprobe } = resolveTools();
  const durationSec = await probeDuration(ffprobe, wav).catch(() => 0);
  // Bulbul returns no word boundaries — one segment, which buildAss splits per word by length.
  return {
    audioPath: wav,
    segments: [{ text: t, start: 0.1, end: Math.max(0.6, durationSec - 0.05) }],
    durationSec,
    engine: 'sarvam',
    costUsd: res.costUsd,
    voiceId: res.voice,
    chars: res.chars,
  };
}

/** The zero-cost, highest-quality rung: the video model performed the line in-shot. */
export function nativeVo(dialogue: string, billedSec: number): VoResult {
  return {
    audioPath: null,
    segments: [{ text: dialogue, start: 0.3, end: Math.max(0.9, billedSec - 0.3) }],
    durationSec: billedSec,
    engine: 'native',
    costUsd: 0,
    voiceId: NATIVE_VOICE,
    chars: dialogue.length,
  };
}

// ---------------------------------------------------------------------------
// Placeholder footage (dry mode)
// ---------------------------------------------------------------------------

/**
 * Free lavfi stand-in for a generated clip, so --dry exercises the REAL assembly path.
 * Presenter placeholders draw the framing guides for a medium close-up, which is what lets us
 * verify that the hook and captions never land on the speaker's face.
 */
export async function renderPlaceholder(shot: Shot, seconds: number, outPath: string, note: string): Promise<void> {
  const { ffmpeg } = resolveTools();
  const isPresenter = shot.role === 'presenter' || shot.role === 'presenter_close';
  const font = resolve(FONTS, FONT.cta).replace(/\\/g, '/').replace(/:/g, '\\:');

  const parts: string[] = [`fps=${FRAME.fps}`, 'setsar=1'];
  if (isPresenter) {
    // Head + shoulders guide boxes where a real presenter's face/torso would sit.
    parts.push(`drawbox=x=(iw-330)/2:y=560:w=330:h=420:color=0xD4AF37@0.40:t=5`);
    parts.push(`drawbox=x=(iw-700)/2:y=985:w=700:h=560:color=0xD4AF37@0.28:t=5`);
    parts.push(`drawtext=fontfile='${font}':text='PRESENTER FRAME':fontcolor=0xD4AF37@0.75:fontsize=30:x=(w-text_w)/2:y=1010`);
  }
  parts.push(`drawtext=fontfile='${font}':text='${escDraw(note)}':fontcolor=white@0.82:fontsize=34:x=(w-text_w)/2:y=250`);
  parts.push(`drawtext=fontfile='${font}':text='${escDraw(shot.role.toUpperCase())} · ${seconds}s':fontcolor=white@0.55:fontsize=26:x=(w-text_w)/2:y=300`);
  parts.push('format=yuv420p');

  // A slowly drifting brand gradient, tinted per role so shot boundaries are obvious in review.
  const tint = isPresenter ? '0x1a1340' : shot.role === 'broll_hero' ? '0x22163f' : '0x0d0d2b';
  const bg = `gradients=s=${FRAME.w}x${FRAME.h}:c0=0x0a0a1a:c1=${tint}:c2=0x0a0a1a:nb_colors=3:speed=0.03:d=${seconds}:r=${FRAME.fps}`;

  await run(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', bg,
    '-f', 'lavfi', '-i', `anullsrc=r=${AUDIO.rate}:cl=stereo`,
    '-vf', parts.join(','),
    '-t', String(seconds),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', String(AUDIO.rate), '-ac', String(AUDIO.channels), '-b:a', '128k',
    '-shortest',
    outPath,
  ]);
}

function escDraw(s: string): string {
  return s.replace(/\\/g, '').replace(/'/g, '').replace(/:/g, '\\:').replace(/%/g, '');
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Force any source clip to the house format: 1080x1920, 30fps, yuv420p, 48kHz stereo AAC.
 * Cover-crops rather than letterboxes — a black bar on a reel is an instant scroll-past.
 * `audioPath`, when given, REPLACES the clip's own audio (used for TTS narration over b-roll).
 */
export async function normalizeClip(src: string, outPath: string, seconds: number, audioPath: string | null, keepSourceAudio: boolean): Promise<void> {
  const { ffmpeg } = resolveTools();
  const vf = `scale=${FRAME.w}:${FRAME.h}:force_original_aspect_ratio=increase,crop=${FRAME.w}:${FRAME.h},fps=${FRAME.fps},setsar=1,format=yuv420p`;

  const args = ['-y', '-i', src];
  if (audioPath) args.push('-i', audioPath);
  else if (!keepSourceAudio) args.push('-f', 'lavfi', '-i', `anullsrc=r=${AUDIO.rate}:cl=stereo`);

  args.push('-vf', vf, '-map', '0:v:0');
  if (audioPath) args.push('-map', '1:a:0');
  else if (keepSourceAudio) args.push('-map', '0:a:0?');
  else args.push('-map', '1:a:0');

  args.push(
    // Pad the audio so a short VO can't truncate the shot, then cut both to `seconds` exactly.
    '-af', `apad,atrim=0:${seconds},asetpts=N/SR/TB`,
    '-t', String(seconds),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', String(AUDIO.rate), '-ac', String(AUDIO.channels), '-b:a', '160k',
    '-video_track_timescale', '30000',
    outPath,
  );
  await run(ffmpeg, args);
}

/** Concatenate normalized clips losslessly (they already share codec/format). */
export async function concatClips(clips: string[], work: string, outPath: string): Promise<void> {
  const { ffmpeg } = resolveTools();
  const listPath = resolve(work, 'concat.txt');
  writeFileSync(listPath, clips.map((c) => `file '${c.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', outPath]);
}

// ---------------------------------------------------------------------------
// Music
// ---------------------------------------------------------------------------

const MUSIC_DIRS = [resolve(ROOT, 'media', 'music'), resolve(ROOT, 'media')];

/** Find a music bed if the owner has dropped one in media/music/ (or media/). Optional by design. */
export function findMusic(): string | null {
  for (const dir of MUSIC_DIRS) {
    if (!existsSync(dir)) continue;
    const hit = readdirSync(dir).find((f) => /\.(mp3|m4a|wav|aac|ogg)$/i.test(f) && !/^vo\./i.test(f));
    if (hit) return resolve(dir, hit);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Finishing pass
// ---------------------------------------------------------------------------

export interface FinishOpts {
  stitched: string;
  work: string;
  outPath: string;
  creative: CreativeScript;
  segments: Seg[];
  totalSec: number;
  music: string | null;
  /**
   * Reel-relative windows of the `product` (screencap) shots. Karaoke captions move to the TOP
   * zone during these windows so they never land on the page's own text (pricing cards, buttons).
   */
  productWindows?: { start: number; end: number }[];
  /**
   * Non-Latin localized reels pass pre-rendered caption plates instead of an .ass file, because
   * this ffmpeg's libass does no Indic shaping. See src/render/localize.ts for the evidence.
   */
  plates?: { inputs: string[]; graph: string } | null;
}

/** Loudness target for the final mix: −16 LUFS integrated, the short-form delivery norm. */
const LOUDNORM_TARGET = 'I=-16:TP=-1.5:LRA=11';

/**
 * Pass 1 of two-pass loudnorm: run the exact final audio chain into a null sink and read the
 * measured stats, so pass 2 can normalize LINEARLY (a plain one-pass loudnorm falls back to a
 * dynamic mode that pumps on speech). Returns null on any failure — pass 2 then runs one-pass.
 */
async function measureLoudness(ffmpeg: string, inputs: string[], mixChain: string, totalSec: number): Promise<Record<string, string> | null> {
  const res = await runCapture(ffmpeg, [
    ...inputs,
    '-filter_complex', `${mixChain},loudnorm=${LOUDNORM_TARGET}:print_format=json[a]`,
    '-map', '[a]', '-t', String(totalSec), '-f', 'null', '-',
  ], 300000);
  const m = /\{[\s\S]*?"input_i"[\s\S]*?\}/.exec(res.stderr);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    return typeof j?.input_i === 'string' ? j : null;
  } catch {
    return null;
  }
}

/**
 * The finishing pass: grade -> bloom -> vignette -> karaoke captions -> wordmark -> progress
 * bar -> grain, plus the music mix and a two-pass −16 LUFS loudness normalization. Encoded
 * libx264 crf 22 / maxrate 9M so a 30s reel lands around 8-12 MB and uploads instantly.
 */
export async function finish(o: FinishOpts): Promise<void> {
  const { ffmpeg } = resolveTools();
  // libass matches fonts by their INTERNAL family name, so the TTFs must sit in fontsdir.
  copyFileSync(resolve(FONTS, FONT.hook), resolve(o.work, 'hook.ttf'));
  copyFileSync(resolve(FONTS, FONT.body), resolve(o.work, 'body.ttf'));
  copyFileSync(resolve(FONTS, FONT.cta), resolve(o.work, 'cta.ttf'));

  // No Ken Burns here: the shots already move. Grade + bloom + overlays only.
  const head = `[0:v]${GRADE},split[a][b];\n[b]${BLOOM}[glow];\n[a][glow]blend=all_mode=screen:all_opacity=0.42,vignette=PI/5:mode=backward`;
  const tail = `${wordmarkFilter(120)},${progressFilter(o.totalSec)},${GRAIN},format=yuv420p`;

  let graph: string;
  if (o.plates) {
    // Chromium-rendered caption plates, overlaid on timing.
    graph = `${head},${tail}[pbase];\n${o.plates.graph}`;
  } else {
    writeFileSync(
      resolve(o.work, 'captions.ass'),
      buildAss(o.creative.hook, o.segments, o.creative.cta, o.totalSec, { ...PRESENTER_LAYOUT, topWindows: o.productWindows }),
    );
    graph = `${head},subtitles=captions.ass:fontsdir=.,${tail}[v]`;
  }

  // ---- audio: (optional) music mix, then two-pass loudness normalization ------------------
  // The chain is identical for measurement and encode; only the music input INDEX differs
  // (the encode command also carries the caption-plate inputs before the music bed).
  const mixFor = (musicIdx: number) =>
    o.music
      ? `[0:a]aformat=sample_rates=${AUDIO.rate}:channel_layouts=stereo,volume=1.0[vo];\n` +
        // Duck the bed well under the voice; VO stays the loudest thing in the mix.
        `[${musicIdx}:a]aformat=sample_rates=${AUDIO.rate}:channel_layouts=stereo,volume=0.14,afade=t=out:st=${Math.max(0, o.totalSec - 1.5)}:d=1.5[bed];\n` +
        `[vo][bed]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.95`
      : `[0:a]aformat=sample_rates=${AUDIO.rate}:channel_layouts=stereo`;

  const measureInputs = ['-i', o.stitched, ...(o.music ? ['-stream_loop', '-1', '-i', o.music] : [])];
  const meas = await measureLoudness(ffmpeg, measureInputs, mixFor(1), o.totalSec);
  const ln = meas
    ? `loudnorm=${LOUDNORM_TARGET}:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true`
    : `loudnorm=${LOUDNORM_TARGET}`;
  console.log(
    meas
      ? `[render] loudness: measured ${meas.input_i} LUFS -> normalizing linearly to -16 LUFS`
      : '[render] loudness: measurement pass failed — using one-pass loudnorm to -16 LUFS',
  );

  const args = ['-y', '-i', o.stitched, ...(o.plates?.inputs ?? [])];
  // Input indices: 0 = stitched video, 1..N = caption plates, then the music bed.
  if (o.music) args.push('-stream_loop', '-1', '-i', o.music);
  // loudnorm resamples internally (192kHz) — bring the stream back to the house rate.
  const audioChain = `${mixFor(1 + (o.plates?.inputs.length ?? 0) / 2)},${ln},aresample=${AUDIO.rate}[a]`;
  writeFileSync(resolve(o.work, 'graph.txt'), `${graph};\n${audioChain}`);
  const audioMap = ['-map', '[v]', '-map', '[a]'];

  args.push(
    '-filter_complex_script', resolve(o.work, 'graph.txt'),
    ...audioMap,
    '-t', String(o.totalSec),
    '-r', String(FRAME.fps),
    '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-crf', '22', '-maxrate', '9M', '-bufsize', '18M',
    '-c:a', 'aac', '-b:a', '192k', '-ar', String(AUDIO.rate), '-ac', String(AUDIO.channels),
    '-movflags', '+faststart',
    o.outPath,
  );
  await run(ffmpeg, args, o.work, 900000);
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export interface VerifyResult {
  ok: boolean;
  probe: Probe;
  problems: string[];
  frames: string[];
}

/**
 * Post-render checks. Metadata alone is NOT proof, so this also extracts frames at even
 * intervals for a human (or an agent with eyes) to actually look at.
 */
export async function verifyOutput(file: string, expectSec: number, framesDir: string, frameCount = 6): Promise<VerifyResult> {
  const { ffmpeg, ffprobe } = resolveTools();
  const probe = await probeVideo(ffprobe, file);
  const problems: string[] = [];

  if (probe.width !== FRAME.w || probe.height !== FRAME.h) problems.push(`expected ${FRAME.w}x${FRAME.h}, got ${probe.width}x${probe.height}`);
  if (Math.abs(probe.fps - FRAME.fps) > 0.6) problems.push(`expected ~${FRAME.fps}fps, got ${probe.fps}`);
  if (!probe.hasAudio) problems.push('no audio stream');
  if (Math.abs(probe.durationSec - expectSec) > 1.2) problems.push(`duration ${probe.durationSec.toFixed(2)}s vs expected ${expectSec.toFixed(2)}s`);
  if (probe.codec !== 'h264') problems.push(`expected h264, got ${probe.codec}`);

  mkdirSync(framesDir, { recursive: true });
  const frames: string[] = [];
  for (let i = 0; i < frameCount; i++) {
    const t = ((i + 0.5) / frameCount) * probe.durationSec;
    const out = resolve(framesDir, `frame${i + 1}.jpg`);
    await run(ffmpeg, ['-y', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-q:v', '3', out]);
    frames.push(out);
    // Mean luma — catches black/blank frames that a resolution check would happily pass.
    const sig = await runCapture(ffmpeg, ['-v', 'info', '-i', out, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-']);
    const m = /YAVG=([0-9.]+)/.exec(sig.stderr + sig.stdout);
    if (m && Number(m[1]) < 6) problems.push(`frame ${i + 1} at ${t.toFixed(1)}s is essentially black (YAVG ${m[1]})`);
  }
  return { ok: problems.length === 0, probe, problems, frames };
}
