import { writeFileSync, readFileSync } from 'node:fs';
import { envStr, envNum } from './env';
import { resolveTools, run } from './ffmpeg';

/**
 * Sarvam AI Bulbul v3 — the ONLY text-to-speech allowed in a VedicHour ad reel.
 *
 * Extracted from src/render/localize.ts so BOTH callers share one client:
 *   - src/render/assemble.ts  — English/Hinglish ad narration (this file's AD_VO_VOICE)
 *   - src/render/localize.ts  — per-language dubbing of winner assets
 *
 * OWNER LAW (2026-07-26, verbatim): "the second voice, when it comes, looks very AI-generated,
 * the woman's voice... the first 6 seconds are good". The first 6 seconds are the Veo presenter's
 * NATIVE in-shot voice; the drop-off is the edge-tts en-IN-NeerjaNeural narrator taking over.
 * So the voice ladder for an ad reel is now exactly:
 *
 *   1. Veo native in-shot dialogue  — free, and the quality bar. Never overdub it.
 *   2. Sarvam Bulbul v3, AD_VO_VOICE — one consistent MALE voice, ~$0.01/reel.
 *   3. (nothing)                    — a missing SARVAM_API_KEY FAILS THE RENDER LOUDLY.
 *
 * There is no cheap fallback rung by design: CLAUDE.md §2 — "if a quality-critical component is
 * unavailable, fail loudly. Never silently degrade to a cheaper path."
 */

/**
 * The single male ad voice. Every narrated shot in every ad reel uses this id, so a viewer hears
 * one person across the whole reel and across the whole account.
 *
 * CHOSEN ON MEASUREMENT, not on vibes. The same Hinglish ad line was synthesized with each male
 * v3 speaker and analysed for median F0 (autocorrelation over voiced frames) and speaking rate
 * (tmp/pick-voice.ts, 2026-07-26):
 *
 *     aditya   114.8 Hz   2.17 words/s
 *     rohan    169.0 Hz   2.59 words/s   <- far too high; reads as a different, lighter person
 *     shubh    114.3 Hz   2.52 words/s   <- CHOSEN
 *     kabir    112.1 Hz   2.29 words/s
 *     rahul    123.7 Hz   2.77 words/s
 *
 * The presenter these reels generate is "a warm, natural Indian presenter in their late 20s"
 * (see presenterPrompt()), whose speaking F0 sits around 110-125 Hz — so `shubh` matches the
 * face, and its 2.52 words/s runs just ABOVE the 2.3 words/s the narration budget assumes, which
 * means a line that passes pre-flight always finishes inside its shot instead of being cut.
 * `shubh` is also the Hindi male voice in the localization table, so a Hindi dub and an English
 * reel sound like the same person.
 *
 * NOTE: bulbul:v3 accepts only 37 of the 44 recognized speakers — `karun`, `abhilash`, `hitesh`,
 * `anushka`, `manisha`, `vidya` and `arya` are v2-only and 400 on v3. The API enumerates the
 * valid set in its error body if this ever needs re-checking.
 */
export const AD_VO_VOICE = 'shubh';

/** Bulbul language code for ad narration. Hinglish is written in Latin script, so en-IN. */
export const AD_VO_LANGUAGE = 'en-IN';

/**
 * Sentinel voice id for a shot whose audio is the video model's own in-shot performance.
 * It is NOT a TTS voice — it means "do not synthesize anything for this shot".
 */
export const NATIVE_VOICE = 'veo_native';

/** Every voice id an ad reel may legally speak with. Anything else is a pre-flight block. */
export const APPROVED_AD_VOICES = [NATIVE_VOICE, AD_VO_VOICE] as const;

export const SARVAM_PRICING = {
  /** Bulbul v3: Rs.30 per 10,000 characters. Beta pricing, charged per request rounded up.
   *  Source: https://docs.sarvam.ai/api/getting-started/pricing.md */
  inrPer10kChars: 30,
  /** Rs. -> $ for the budget ledger; override with INR_PER_USD. */
  inrPerUsd: 87,
  model: 'bulbul:v3',
} as const;

export function sarvamCostUsd(chars: number): number {
  const inr = (chars / 10000) * SARVAM_PRICING.inrPer10kChars;
  return Math.round((inr / envNum('INR_PER_USD', SARVAM_PRICING.inrPerUsd)) * 100000) / 100000;
}

export function hasSarvamKey(): boolean {
  return envStr('SARVAM_API_KEY') !== null;
}

/** The message the owner (or a 3am unattended run) sees when the key is missing. */
export const SARVAM_MISSING_MESSAGE =
  'SARVAM_API_KEY is not set — this reel needs narration and the only approved narration voice is ' +
  `Sarvam Bulbul v3 "${AD_VO_VOICE}". Refusing to render rather than falling back to edge-tts ` +
  '(en-IN-NeerjaNeural), which the owner rejected as sounding AI-generated. Fixes, in order of ' +
  'preference: (1) rewrite the shot so the PRESENTER says the line on camera — Veo native audio ' +
  'is free and is the quality bar; (2) put SARVAM_API_KEY in marketing-agent/.env (sarvam.ai, new ' +
  'accounts get Rs.100 free credit).';

/** REST body limit for one call. Longer text is split on sentence boundaries. */
const SARVAM_MAX_CHARS = 2500;

export interface SarvamResult {
  path: string;
  chars: number;
  costUsd: number;
  voice: string;
}

/**
 * Synthesize one line with Bulbul v3. Auth is `api-subscription-key` (NOT Bearer); the response
 * is JSON with base64 WAV in `audios[]`. Sarvam rounds each REQUEST up when billing, so long text
 * is chunked on sentence boundaries rather than into many tiny calls.
 */
export async function sarvamSpeak(opts: {
  text: string;
  languageCode: string;
  voice: string;
  outPath: string;
}): Promise<SarvamResult> {
  const key = envStr('SARVAM_API_KEY');
  if (!key) throw new Error(SARVAM_MISSING_MESSAGE);
  const chunks = chunkText(opts.text, SARVAM_MAX_CHARS);
  const parts: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: chunks[i],
        target_language_code: opts.languageCode,
        model: SARVAM_PRICING.model,
        speaker: opts.voice,
        speech_sample_rate: 24000,
        // pitch/loudness are v2-only fields — sending them with v3 is an error.
      }),
    });
    if (!res.ok) throw new Error(`Sarvam HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`);
    const j: any = await res.json();
    const b64 = j?.audios?.[0];
    if (!b64) throw new Error(`Sarvam returned no audio: ${JSON.stringify(j).slice(0, 200)}`);
    const part = opts.outPath.replace(/\.wav$/, `.part${i}.wav`);
    writeFileSync(part, Buffer.from(b64, 'base64'));
    parts.push(part);
  }

  if (parts.length === 1) {
    writeFileSync(opts.outPath, readFileSync(parts[0]));
  } else {
    const { ffmpeg } = resolveTools();
    const list = opts.outPath.replace(/\.wav$/, '.parts.txt');
    writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n') + '\n');
    await run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', opts.outPath]);
  }
  return { path: opts.outPath, chars: opts.text.length, costUsd: sarvamCostUsd(opts.text.length), voice: opts.voice };
}

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let cur = '';
  for (const sentence of text.split(/(?<=[.!?।])\s+/)) {
    if (cur && (cur + ' ' + sentence).length > max) {
      out.push(cur);
      cur = sentence;
    } else cur = cur ? `${cur} ${sentence}` : sentence;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * OWNER LAW: never mix timbres inside one reel. Throws if the shots that actually speak use
 * more than one synthesized voice id. `NATIVE_VOICE` is excluded — Veo's own performance is the
 * presenter's real voice, and mixing it with ONE matched TTS voice is the approved plan.
 */
export function assertSingleAdVoice(shots: { id: string; voice: string | null }[]): void {
  const synthesized = shots.filter((s) => s.voice && s.voice !== NATIVE_VOICE) as { id: string; voice: string }[];
  const distinct = [...new Set(synthesized.map((s) => s.voice))];
  if (distinct.length > 1) {
    throw new Error(
      `voice plan violation — this reel would speak in ${distinct.length} different voices ` +
        `(${synthesized.map((s) => `${s.id}:${s.voice}`).join(', ')}). One reel = one narrator.`,
    );
  }
  const illegal = synthesized.filter((s) => s.voice !== AD_VO_VOICE);
  if (illegal.length) {
    throw new Error(
      `voice plan violation — ${illegal.map((s) => `${s.id} uses "${s.voice}"`).join(', ')}; ` +
        `the only approved ad narration voice is Sarvam "${AD_VO_VOICE}".`,
    );
  }
}
