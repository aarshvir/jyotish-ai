import { existsSync, mkdirSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { envStr } from './env';
import {
  resolveTools, run, runCapture, probeVideo, probeDuration,
  buildAss, FONT, FONTS,
  GRADE, BLOOM, GRAIN, TEXT_SHADOW, wordmarkFilter, progressFilter,
  type Seg, type Probe,
} from './ffmpeg';
import { AD_VO_VOICE, AD_VO_LANGUAGE, NATIVE_VOICE, sarvamSpeak, hasSarvamKey, SARVAM_MISSING_MESSAGE } from './sarvam';
import { listenToReel, type ListenResult } from './listen';
import type { CreativeScript, Shot } from './types';

export { MAX_SILENCE_GAP_SEC, MAX_SILENT_SHARE } from './listen';

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
  /**
   * The caller already applied the grade/bloom/vignette per shot — skip the whole-reel look pass
   * and only do captions, overlays and the mix.
   *
   * Why this exists: the VedicHour look (navy/gold grade + a screen-blended highlight bloom) was
   * built for DARK generated footage. Run it over a LIGHT product page and the bloom lifts the
   * page's dark body text from ~0.15 to ~0.42 luma while the cream background stays at ~0.97 —
   * measured on the 2026-07-26 sample-report capture, where the hour-slot text came out hazy and
   * half-legible. The product shot is the proof; it has to stay crisp. A caller that grades the
   * presenter shots and the screencap differently sets this and does the look itself.
   */
  preGraded?: boolean;
  /**
   * Seconds of BRANDED END CARD at the tail of `stitched` (see END_CARD / renderEndCard).
   *
   * The karaoke captions and the closing CTA are timed against `totalSec - endCardSec`, so the
   * card is a clean hold of the wordmark and `vedichour.com` rather than having the reel's own
   * CTA line composited over the top of it. Everything else — wordmark, progress bar, grain, the
   * loudness pass — deliberately still runs over the whole file, card included.
   */
  endCardSec?: number;
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
    const i = Number(j?.input_i);
    // Silent dry placeholders measure as -inf; loudnorm rejects measured_I outside [-99, 0].
    if (!Number.isFinite(i) || i < -99 || i > 0) return null;
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
  const head = o.preGraded
    ? `[0:v]setsar=1`
    : `[0:v]${GRADE},split[a][b];\n[b]${BLOOM}[glow];\n[a][glow]blend=all_mode=screen:all_opacity=0.42,vignette=PI/5:mode=backward`;
  const tail = `${wordmarkFilter(120)},${progressFilter(o.totalSec)},${GRAIN},format=yuv420p`;

  let graph: string;
  if (o.plates) {
    // Chromium-rendered caption plates, overlaid on timing.
    graph = `${head},${tail}[pbase];\n${o.plates.graph}`;
  } else {
    writeFileSync(
      resolve(o.work, 'captions.ass'),
      buildAss(o.creative.hook, o.segments, o.creative.cta, o.totalSec, {
        ...PRESENTER_LAYOUT,
        topWindows: o.productWindows,
        bodyEndSec: o.totalSec - (o.endCardSec ?? 0),
      }),
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
// The branded end card — a STANDING element of every reel
// ---------------------------------------------------------------------------

/**
 * THE END CARD.
 *
 * OWNER LAW (2026-07-26, verbatim): "at the end there should be a call to action: Try
 * VedicHour.com... because people who are listening to the reel will figure out, Oh, I found this
 * new platform, VedicHour."
 *
 * That ruling has two halves and both are load-bearing:
 *
 *   ON SCREEN — this card. Brand-dark ground, the standing gold wordmark, and `vedichour.com` as
 *     the single largest thing on the frame. It is a property of the RENDERER, not of a script:
 *     no creative can forget it, and no creative has to remember it.
 *   OUT LOUD  — the presenter names the site inside his own on-camera dialogue. Veo performs that
 *     line, so it is free, lip-synced and in the ONE voice the reel already has. Enforced for $0
 *     before any spend by preflight() in src/loops/render.ts and by the creative engine's own
 *     reject gate (SPOKEN_SITE in src/render/types.ts).
 *
 * The spoken tag below is the ONE sanctioned exception to "one reel, one narrator" (see
 * assertSingleAdVoice): it is a four-word SIGN-OFF that lands after the presenter's last word with
 * a deliberate gap, in the same male AD_VO_VOICE that was measurement-matched to the presenter's
 * pitch — not a narrator taking over the story. It is synthesized ONCE and cached on disk, so it
 * costs sub-a-cent in total and exactly $0 for every reel after the first.
 */
export const END_CARD = {
  /** Long enough to read a URL and hear the tag; short enough to not cost watch-time. */
  seconds: 2.2,
  /** Silence at the head of the card, so the tag reads as a sign-off, not an interruption. */
  tagLeadSec: 0.35,
  /** What the tag says. Spaced "Vedic Hour" so the TTS pronounces the brand, not a mangled compound. */
  tag: 'Try Vedic Hour dot com.',
  /** The hero line — must stay the largest element on the frame. */
  domain: 'vedichour.com',
  /** One short human line under the domain. */
  line: 'Apna din, ghanta by ghanta.',
  /** Brand-dark ground, per docs/DESIGN_SYSTEM.md night surfaces. */
  bg: '0x0D1426',
  /** Cream reads ~12:1 on the navy; the gold is kept for the rules and the sub-line. */
  domainColor: '0xF5E6B8',
  gold: '0xD4AF37',
  /**
   * Type sizes at 1080x1920, set by LOOKING at extracted frames, not by arithmetic. At 112 the
   * domain runs ~790px wide — dominant, and still ~145px clear of both edges, so Instagram's
   * rounded preview crop can never clip a character of the one thing this card exists to say.
   */
  domainSize: 112,
  lineSize: 44,
  /** Hairline width. Narrower than the domain, wide enough to read as a rule and not a stray dash. */
  ruleW: 660,
} as const;

/** Cached once, reused by every reel forever — the tag never changes, so neither does the file. */
const END_CARD_TAG_WAV = resolve(ROOT, 'media', 'brand', 'end-card-tag.wav');

function drawPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

/**
 * The spoken sign-off, at the reel's own −16 LUFS so it sits at the presenter's level rather than
 * arriving louder or thinner than the voice it follows.
 *
 * Cached at media/brand/end-card-tag.wav. A cache hit costs $0 and needs no API key at all, which
 * is the point: the *structure* removes the recurring cost instead of buying a cheaper voice
 * (CLAUDE.md §2). A cache MISS with no SARVAM_API_KEY fails loudly rather than shipping a silent
 * card that quietly drops half the owner's ruling.
 */
export async function endCardTagAudio(opts: { dry?: boolean; work?: string } = {}): Promise<{ path: string; seconds: number; costUsd: number; cached: boolean }> {
  const { ffmpeg, ffprobe } = resolveTools();
  if (!opts.dry && existsSync(END_CARD_TAG_WAV)) {
    const seconds = await probeDuration(ffprobe, END_CARD_TAG_WAV).catch(() => 0);
    if (seconds > 0.4) return { path: END_CARD_TAG_WAV, seconds, costUsd: 0, cached: true };
  }
  if (opts.dry) {
    const dir = opts.work ?? resolve(ROOT, 'tmp');
    mkdirSync(dir, { recursive: true });
    const silent = resolve(dir, 'end-card-tag.dry.wav');
    await run(ffmpeg, ['-y', '-f', 'lavfi', '-i', `anullsrc=r=${AUDIO.rate}:cl=stereo`, '-t', '1.6', silent]);
    const seconds = await probeDuration(ffprobe, silent).catch(() => 1.6);
    return { path: silent, seconds: seconds || 1.6, costUsd: 0, cached: false };
  }
  if (!hasSarvamKey()) throw new Error(`end card tag: ${SARVAM_MISSING_MESSAGE}`);

  mkdirSync(resolve(ROOT, 'media', 'brand'), { recursive: true });
  const raw = END_CARD_TAG_WAV.replace(/\.wav$/, '.raw.wav');
  const res = await sarvamSpeak({
    text: END_CARD.tag,
    languageCode: envStr('AD_VO_LANGUAGE') ?? AD_VO_LANGUAGE,
    voice: AD_VO_VOICE,
    outPath: raw,
  });

  // Two-pass, same target as the reel, so the tag needs no gain-riding once it is in the mix.
  const dur = await probeDuration(ffprobe, raw).catch(() => 0);
  const chain = `[0:a]aformat=sample_rates=${AUDIO.rate}:channel_layouts=stereo`;
  const meas = await measureLoudness(ffmpeg, ['-i', raw], chain, Math.max(0.5, dur));
  const ln = meas
    ? `loudnorm=${LOUDNORM_TARGET}:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true`
    : `loudnorm=${LOUDNORM_TARGET}`;
  await run(ffmpeg, ['-y', '-i', raw, '-filter_complex', `${chain},${ln},aresample=${AUDIO.rate}[a]`, '-map', '[a]', END_CARD_TAG_WAV]);

  const seconds = await probeDuration(ffprobe, END_CARD_TAG_WAV).catch(() => 0);
  return { path: END_CARD_TAG_WAV, seconds, costUsd: res.costUsd, cached: false };
}

export interface EndCardResult {
  path: string;
  seconds: number;
  /** Where the spoken tag starts, relative to the card. */
  tagStartSec: number;
  tagSec: number;
  costUsd: number;
}

/**
 * Render the end card as a normal house-format clip, so it concatenates onto the reel exactly
 * like a shot does and inherits the wordmark, the progress bar and the loudness pass in finish().
 *
 * Layout, in the order a viewer's eye takes it: the standing gold wordmark finish() draws at
 * y=120, then `vedichour.com` at 118px — nothing else on the frame comes close — bracketed by two
 * gold hairlines, with one short human line under it. Motion is a 0.4s fade up and nothing else:
 * the frame's whole job is to be read and remembered.
 */
export async function renderEndCard(work: string, outPath: string, opts: { seconds?: number; dry?: boolean } = {}): Promise<EndCardResult> {
  const { ffmpeg } = resolveTools();
  const tag = await endCardTagAudio({ dry: opts.dry, work });
  const lead = END_CARD.tagLeadSec;
  // Never clip the tag: the card is at least long enough to hold it, plus a beat to land on.
  const seconds = Math.round(Math.max(opts.seconds ?? END_CARD.seconds, lead + tag.seconds + 0.2) * 100) / 100;

  const body = drawPath(resolve(FONTS, FONT.body));
  const cta = drawPath(resolve(FONTS, FONT.cta));
  const vf = [
    // Two gold hairlines that bracket the domain and give the composition a spine.
    `drawbox=x=(iw-${END_CARD.ruleW})/2:y=762:w=${END_CARD.ruleW}:h=2:color=${END_CARD.gold}@0.45:t=fill`,
    `drawtext=fontfile='${body}':text='${END_CARD.domain}':fontcolor=${END_CARD.domainColor}:fontsize=${END_CARD.domainSize}:x=(w-text_w)/2:y=830:${TEXT_SHADOW}`,
    `drawtext=fontfile='${cta}':text='${END_CARD.line}':fontcolor=${END_CARD.gold}@0.92:fontsize=${END_CARD.lineSize}:x=(w-text_w)/2:y=1050:${TEXT_SHADOW}`,
    `drawbox=x=(iw-${END_CARD.ruleW})/2:y=1002:w=${END_CARD.ruleW}:h=2:color=${END_CARD.gold}@0.45:t=fill`,
    // Corners fall away, so the brightest thing on the frame is the domain. `forward` also
    // partially cancels the `backward` vignette finish() lays over an un-preGraded reel.
    'vignette=PI/4.6:mode=forward',
    'fade=t=in:st=0:d=0.4',
    'format=yuv420p',
  ].join(',');

  const ms = Math.round(lead * 1000);
  const graph =
    `[0:v]${vf}[v];\n` +
    `[1:a]aformat=sample_rates=${AUDIO.rate}:channel_layouts=stereo,adelay=${ms}|${ms},apad,atrim=0:${seconds},asetpts=N/SR/TB[a]`;

  await run(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', `color=c=${END_CARD.bg}:s=${FRAME.w}x${FRAME.h}:r=${FRAME.fps}:d=${seconds}`,
    '-i', tag.path,
    '-filter_complex', graph,
    '-map', '[v]', '-map', '[a]',
    '-t', String(seconds),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', String(AUDIO.rate), '-ac', String(AUDIO.channels), '-b:a', '160k',
    '-video_track_timescale', '30000',
    outPath,
  ]);

  return { path: outPath, seconds, tagStartSec: lead, tagSec: tag.seconds, costUsd: tag.costUsd };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export interface VerifyResult {
  ok: boolean;
  probe: Probe;
  problems: string[];
  frames: string[];
  listen: ListenResult;
}

/**
 * Post-render checks as a phone viewer: listen to the waveform, then look at frames.
 * An AAC stream of digital silence is not audio. Dry placeholders never pass.
 */
export async function verifyOutput(
  file: string,
  expectSec: number,
  framesDir: string,
  frameCount = 6,
  opts: { dry?: boolean } = {},
): Promise<VerifyResult> {
  const { ffmpeg, ffprobe } = resolveTools();
  const probe = await probeVideo(ffprobe, file);
  const problems: string[] = [];

  if (opts.dry) {
    problems.push(
      'dry placeholder — navy/gold storyboard cards with silent AAC. Not a watchable reel. Do not post.',
    );
  }

  if (probe.width !== FRAME.w || probe.height !== FRAME.h) problems.push(`expected ${FRAME.w}x${FRAME.h}, got ${probe.width}x${probe.height}`);
  if (Math.abs(probe.fps - FRAME.fps) > 0.6) problems.push(`expected ~${FRAME.fps}fps, got ${probe.fps}`);

  const listen = await listenToReel(file, probe.durationSec, probe.hasAudio);
  problems.push(...listen.problems);

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
  return { ok: problems.length === 0, probe, problems, frames, listen };
}
