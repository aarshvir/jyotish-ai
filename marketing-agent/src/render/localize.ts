import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain } from '../brain/index';
import { envStr, envNum } from './env';
import { resolveTools, run, probeDuration } from './ffmpeg';
import { FRAME, PRESENTER_LAYOUT } from './assemble';
import type { CreativeScript, Shot } from './types';

/**
 * LOCALIZATION — real dubbed audio per language, not translated captions.
 *
 * Runs only for WINNER assets (explicitly requested via --languages or a `languages` array in
 * the creative JSON). Default is none: dubbing a reel nobody watched is wasted money.
 *
 * Pipeline per language:
 *   1. TRANSLATE  — brain() router, $0. Natural spoken register, native script output.
 *   2. TTS        — Sarvam AI Bulbul v3 (₹30/10k chars).
 *   3. LIP-SYNC   — sync.so lipsync-2, presenter shots only. Degrades to dub-over if no key.
 *   4. REASSEMBLE — same grade/overlay machinery, captions in the target script.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY LOCALIZED CAPTIONS DO NOT USE ASS/libass
 * ---------------------------------------------------------------------------------------------
 * The bundled libass in this ffmpeg build performs NO Indic complex shaping. Verified against
 * Chromium (HarfBuzz) as ground truth on the same font (Nirmala UI):
 *   - pre-base i-matra never reorders:  "दिन"  renders as  "दनि"
 *   - reph never lifts to a superscript: "धर्म" renders with an inline half-ra
 *   - conjuncts never ligate:            "क्षण" / "स्वागत" render with visible viramas
 * Every Devanagari caption would look broken to a native reader. So for non-Latin scripts we
 * render caption plates in headless Chromium (which shapes all of these correctly) and overlay
 * them as timed PNGs. Latin-script reels keep the ASS karaoke path, which is unaffected.
 * The tradeoff: localized captions get a clean fade instead of the per-word gold sweep.
 */

// ---------------------------------------------------------------------------
// Language table
// ---------------------------------------------------------------------------

export interface LangSpec {
  code: string;
  /** Sarvam BCP-47 target_language_code. */
  sarvam: string;
  label: string;
  nativeName: string;
  /** Consistent voice per language so a viewer hears the same "person" across reels. */
  voiceFemale: string;
  voiceMale: string;
  /** Does this script need the Chromium caption path? */
  nonLatin: boolean;
}

/**
 * Sarvam Bulbul v3 supports exactly 11 codes; note Odia is `od-IN`, NOT the ISO `or-IN`.
 * Speaker names verified from Sarvam's speaker docs (37 v3 voices).
 */
export const LANGUAGES: Record<string, LangSpec> = {
  hi: { code: 'hi', sarvam: 'hi-IN', label: 'Hindi', nativeName: 'हिन्दी', voiceFemale: 'ritu', voiceMale: 'shubh', nonLatin: true },
  bn: { code: 'bn', sarvam: 'bn-IN', label: 'Bengali', nativeName: 'বাংলা', voiceFemale: 'priya', voiceMale: 'aditya', nonLatin: true },
  ta: { code: 'ta', sarvam: 'ta-IN', label: 'Tamil', nativeName: 'தமிழ்', voiceFemale: 'kavitha', voiceMale: 'gokul', nonLatin: true },
  te: { code: 'te', sarvam: 'te-IN', label: 'Telugu', nativeName: 'తెలుగు', voiceFemale: 'shreya', voiceMale: 'rahul', nonLatin: true },
  mr: { code: 'mr', sarvam: 'mr-IN', label: 'Marathi', nativeName: 'मराठी', voiceFemale: 'neha', voiceMale: 'rohan', nonLatin: true },
  gu: { code: 'gu', sarvam: 'gu-IN', label: 'Gujarati', nativeName: 'ગુજરાતી', voiceFemale: 'pooja', voiceMale: 'amit', nonLatin: true },
  kn: { code: 'kn', sarvam: 'kn-IN', label: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceFemale: 'roopa', voiceMale: 'mani', nonLatin: true },
  ml: { code: 'ml', sarvam: 'ml-IN', label: 'Malayalam', nativeName: 'മലയാളം', voiceFemale: 'ishita', voiceMale: 'dev', nonLatin: true },
  pa: { code: 'pa', sarvam: 'pa-IN', label: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', voiceFemale: 'simran', voiceMale: 'kabir', nonLatin: true },
  od: { code: 'od', sarvam: 'od-IN', label: 'Odia', nativeName: 'ଓଡ଼ିଆ', voiceFemale: 'tanya', voiceMale: 'varun', nonLatin: true },
};

export function parseLanguages(spec: string | string[] | undefined): LangSpec[] {
  if (!spec) return [];
  const list = Array.isArray(spec) ? spec : spec.split(',');
  const out: LangSpec[] = [];
  for (const raw of list) {
    const k = raw.trim().toLowerCase();
    if (!k) continue;
    if (!LANGUAGES[k]) {
      console.warn(`[localize] unknown language "${k}" — Bulbul v3 supports: ${Object.keys(LANGUAGES).join(', ')}`);
      continue;
    }
    out.push(LANGUAGES[k]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * Localization price table. Same rule as src/render/providers.ts: verified numbers only, and
 * where the published rate depends on a plan we budget the CONSERVATIVE (higher) figure.
 */
export const LOCALIZE_PRICING = {
  /** Sarvam Bulbul v3: ₹30 per 10,000 characters. Beta pricing, charged per request rounded up.
   *  Source: https://docs.sarvam.ai/api/getting-started/pricing.md */
  sarvamInrPer10kChars: 30,
  /** ₹ -> $ conversion used for the budget ledger; override with INR_PER_USD. */
  inrPerUsd: 87,
  /**
   * sync.so lipsync-2. The widely-quoted $0.04/s is the SCALE-PLAN rate ($249/mo); the base
   * (Hobbyist/Creator) rate is $0.05/s. Billing counts OUTPUT FRAMES against a 25fps reference,
   * so a 30fps render costs ~1.2x the quoted per-second rate. 0.05 * 1.2 = 0.06.
   * Source: https://sync.so/docs/product/billing, https://sync.so/pricing
   */
  syncUsdPerSecond: 0.06,
  /** lipsync-2 renders at 512x512 — a real quality ceiling. lipsync-2-pro is $0.083/s base. */
  syncModel: 'lipsync-2',
} as const;

export function sarvamCostUsd(chars: number): number {
  const inr = (chars / 10000) * LOCALIZE_PRICING.sarvamInrPer10kChars;
  return Math.round((inr / envNum('INR_PER_USD', LOCALIZE_PRICING.inrPerUsd)) * 100000) / 100000;
}

export function syncCostUsd(seconds: number): number {
  return Math.round(seconds * envNum('SYNC_USD_PER_SECOND', LOCALIZE_PRICING.syncUsdPerSecond) * 10000) / 10000;
}

export function hasSarvamKey(): boolean {
  return envStr('SARVAM_API_KEY') !== null;
}
export function hasSyncKey(): boolean {
  return envStr('SYNC_API_KEY') !== null;
}

/** Predicted cost of one localized variant, before anything is called. */
export function estimateLocalization(creative: CreativeScript, lipsyncRoles: string[]): { chars: number; ttsUsd: number; lipsyncSec: number; lipsyncUsd: number; totalUsd: number } {
  const chars = creative.shots.map((s) => s.dialogue ?? s.vo ?? '').join(' ').length;
  const lipsyncSec = creative.shots.filter((s) => lipsyncRoles.includes(s.role)).reduce((a, s) => a + s.seconds, 0);
  const ttsUsd = sarvamCostUsd(chars);
  const lipsyncUsd = hasSyncKey() ? syncCostUsd(lipsyncSec) : 0;
  return { chars, ttsUsd, lipsyncSec, lipsyncUsd, totalUsd: Math.round((ttsUsd + lipsyncUsd) * 10000) / 10000 };
}

// ---------------------------------------------------------------------------
// 1. Translate
// ---------------------------------------------------------------------------

export interface LocalizedScript {
  lang: string;
  /** shot id -> spoken line in the target language, NATIVE script. */
  lines: Record<string, string>;
  hook: string;
  cta: string;
  youtubeTitle: string;
  description: string;
  hashtags: string[];
}

function translationPrompt(c: CreativeScript, l: LangSpec): string {
  const lines = c.shots.map((s) => `  "${s.id}": ${JSON.stringify(s.dialogue ?? s.vo ?? '')}`).join(',\n');
  return `Translate this short-form video script into ${l.label} (${l.nativeName}) for an Indian audience.

RULES — follow exactly:
- Write in NATURAL SPOKEN ${l.label}, the way a real person talks to camera. NOT a literal or formal translation. It must sound like it was written in ${l.label} first.
- Output MUST be in the NATIVE ${l.label} script (${l.nativeName}). Do NOT romanise. A text-to-speech engine reads this directly and needs native script.
- Keep these brand terms UNTRANSLATED and in Latin script: VedicHour, hora, Kundli, Swiss Ephemeris, Lahiri.
- Keep each line roughly the same SPOKEN LENGTH as the original — these are timed to video shots.
- Calm and factual. Never promise outcomes, luck, or certainty. Say "clearer"/"heavier" windows, never "best"/"worst".

ORIGINAL LINES (keep the same keys):
{
${lines}
}

ALSO translate:
  hook: ${JSON.stringify(c.hook)}
  cta: ${JSON.stringify(c.cta)}
  youtubeTitle: ${JSON.stringify(c.publish?.youtubeTitle ?? `${c.hook} | VedicHour`)}
  description: a 2-3 sentence ${l.label} video description

Output STRICT JSON and nothing else:
{"lines":{"<shot id>":"<${l.label} line>", ...},"hook":"...","cta":"...","youtubeTitle":"...","description":"...","hashtags":["#...","..."]}
Hashtags: 8-10, mixing ${l.label} and English terms.`;
}

export async function translateCreative(c: CreativeScript, l: LangSpec): Promise<LocalizedScript> {
  const res = await brain(translationPrompt(c, l), { tier: 'smart', loop: 'localize' });
  const m = res.text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`translation for ${l.label} returned no JSON`);
  const j = JSON.parse(m[0]);
  if (!j.lines || typeof j.lines !== 'object') throw new Error(`translation for ${l.label} has no lines`);
  return {
    lang: l.code,
    lines: j.lines,
    hook: String(j.hook ?? c.hook),
    cta: String(j.cta ?? c.cta),
    youtubeTitle: String(j.youtubeTitle ?? c.title),
    description: String(j.description ?? ''),
    hashtags: Array.isArray(j.hashtags) ? j.hashtags.slice(0, 12) : [],
  };
}

// ---------------------------------------------------------------------------
// 2. Sarvam TTS
// ---------------------------------------------------------------------------

const SARVAM_MAX_CHARS = 2500;

/**
 * Synthesize one line with Bulbul v3. Auth is `api-subscription-key` (NOT Bearer). The response
 * is JSON with base64 WAV in `audios[]`. Long text is chunked at the 2500-char REST limit and
 * the parts are concatenated — note Sarvam rounds each REQUEST up when billing, so we chunk on
 * sentence boundaries rather than making many tiny calls.
 */
export async function sarvamTts(text: string, l: LangSpec, voice: string, outPath: string): Promise<{ path: string; chars: number; costUsd: number }> {
  const key = envStr('SARVAM_API_KEY');
  if (!key) throw new Error('SARVAM_API_KEY is not set');
  const chunks = chunkText(text, SARVAM_MAX_CHARS);
  const parts: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: chunks[i],
        target_language_code: l.sarvam,
        model: 'bulbul:v3',
        speaker: voice,
        speech_sample_rate: 24000,
        // pitch/loudness are v2-only fields — sending them with v3 is an error.
      }),
    });
    if (!res.ok) throw new Error(`Sarvam HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j: any = await res.json();
    const b64 = j?.audios?.[0];
    if (!b64) throw new Error(`Sarvam returned no audio: ${JSON.stringify(j).slice(0, 200)}`);
    const part = outPath.replace(/\.wav$/, `.part${i}.wav`);
    writeFileSync(part, Buffer.from(b64, 'base64'));
    parts.push(part);
  }

  if (parts.length === 1) {
    writeFileSync(outPath, readFileSync(parts[0]));
  } else {
    const { ffmpeg } = resolveTools();
    const list = outPath.replace(/\.wav$/, '.parts.txt');
    writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n') + '\n');
    await run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outPath]);
  }
  return { path: outPath, chars: text.length, costUsd: sarvamCostUsd(text.length) };
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

// ---------------------------------------------------------------------------
// 3. sync.so lip-sync
// ---------------------------------------------------------------------------

/**
 * Lip-sync a presenter clip to dubbed audio. Uses sync.so's multipart route so LOCAL files work
 * directly (files must be under 20MB; larger ones need /v2/assets/upload). Async: submit, then
 * poll GET /v2/generate/{id} until COMPLETED | FAILED | REJECTED.
 *
 * Caveat worth knowing before you rely on this: lipsync-2 outputs 512x512, so the dubbed
 * presenter is upscaled into a 1080x1920 frame and will be visibly softer than the original Veo
 * shot. Set SYNC_MODEL=lipsync-2-pro ($0.083/s base) if that matters more than the cost.
 */
export async function syncLipsync(videoPath: string, audioPath: string, outPath: string, onProgress?: (m: string) => void): Promise<{ path: string; seconds: number; costUsd: number }> {
  const key = envStr('SYNC_API_KEY');
  if (!key) throw new Error('SYNC_API_KEY is not set');
  const model = envStr('SYNC_MODEL') ?? LOCALIZE_PRICING.syncModel;

  const form = new FormData();
  form.append('video', new Blob([readFileSync(videoPath)]), 'presenter.mp4');
  form.append('audio', new Blob([readFileSync(audioPath)]), 'dub.wav');
  // In multipart mode nested fields must be JSON STRINGS.
  form.append('model', model);
  form.append('options', JSON.stringify({ sync_mode: 'remap' }));

  const sub = await fetch('https://api.sync.so/v2/generate', { method: 'POST', headers: { 'x-api-key': key }, body: form });
  if (!sub.ok) throw new Error(`sync.so HTTP ${sub.status}: ${(await sub.text()).slice(0, 200)}`);
  const job: any = await sub.json();
  const id = job?.id;
  if (!id) throw new Error(`sync.so returned no job id: ${JSON.stringify(job).slice(0, 200)}`);
  onProgress?.(`sync.so job ${id} submitted (${model})`);

  const deadline = Date.now() + 15 * 60 * 1000;
  let status = '';
  let result: any = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 10000));
    const st = await fetch(`https://api.sync.so/v2/generate/${id}`, { headers: { 'x-api-key': key } });
    if (!st.ok) throw new Error(`sync.so poll HTTP ${st.status}`);
    result = await st.json();
    status = String(result?.status ?? '');
    if (['COMPLETED', 'FAILED', 'REJECTED'].includes(status)) break;
    onProgress?.(`sync.so ${status}`);
  }
  if (status !== 'COMPLETED') throw new Error(`sync.so job ${id} ended ${status || 'TIMEOUT'}: ${String(result?.error ?? '').slice(0, 160)}`);

  const url = result?.outputUrl ?? result?.output_url;
  if (!url) throw new Error('sync.so returned no outputUrl');
  const dl = await fetch(url);
  if (!dl.ok) throw new Error(`sync.so download HTTP ${dl.status}`);
  writeFileSync(outPath, Buffer.from(await dl.arrayBuffer()));

  const { ffprobe } = resolveTools();
  const seconds = await probeDuration(ffprobe, outPath).catch(() => 0);
  return { path: outPath, seconds, costUsd: syncCostUsd(seconds) };
}

// ---------------------------------------------------------------------------
// 4. Caption plates rendered in Chromium (correct Indic shaping)
// ---------------------------------------------------------------------------

export interface CaptionPlate {
  text: string;
  start: number;
  end: number;
  kind: 'hook' | 'caption' | 'cta';
  png: string;
}

const PLATE_CSS = `
  html,body{margin:0;padding:0;background:transparent}
  .plate{width:1080px;display:flex;align-items:center;justify-content:center;text-align:center;
         box-sizing:border-box;padding:0 80px}
  /* Indic scripts set noticeably wider than Latin at the same px size, so these run a little
     smaller than the ASS styles (104/76) to keep two-line hooks inside the safe margins. */
  .hook{font:600 92px "Nirmala UI","Cormorant Garamond",serif;color:#F5E6B8;line-height:1.12;
        text-shadow:0 3px 10px rgba(0,0,0,.75),0 0 4px rgba(0,0,0,.9)}
  .caption{font:700 68px "Nirmala UI","DM Sans",sans-serif;color:#D4AF37;line-height:1.2;
        text-shadow:0 3px 10px rgba(0,0,0,.8),0 0 5px rgba(0,0,0,.95)}
  .cta{font:600 46px "Nirmala UI","DM Sans",sans-serif;color:#D4AF37;line-height:1.3;
        text-shadow:0 2px 8px rgba(0,0,0,.8)}
`;

/**
 * Render each caption line to a transparent PNG using headless Chromium, which shapes
 * Devanagari/Tamil/Telugu/Bengali correctly (libass does not — see the note at the top).
 * All plates are produced in ONE browser session.
 */
export async function renderCaptionPlates(plates: Omit<CaptionPlate, 'png'>[], dir: string): Promise<CaptionPlate[]> {
  const pw: any = await import('playwright');
  mkdirSync(dir, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  const out: CaptionPlate[] = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: FRAME.w, height: 600 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i];
      const png = resolve(dir, `plate${String(i).padStart(3, '0')}.png`);
      await page.setContent(
        `<meta charset="utf-8"><style>${PLATE_CSS}</style>` +
          `<div class="plate ${p.kind}" id="p">${escapeHtml(p.text)}</div>`,
        { waitUntil: 'load' },
      );
      const el = await page.$('#p');
      await el!.screenshot({ path: png, omitBackground: true });
      out.push({ ...p, png });
    }
    await ctx.close();
  } finally {
    await browser.close();
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Split a dubbed line into on-screen chunks, timed proportionally across the shot. */
export function planPlates(script: LocalizedScript, shots: { shot: Shot; startSec: number; seconds: number }[], totalSec: number, hookHold = 2.6, ctaHold = 2.6): Omit<CaptionPlate, 'png'>[] {
  const plates: Omit<CaptionPlate, 'png'>[] = [{ text: script.hook, start: 0, end: hookHold, kind: 'hook' }];
  const capEnd = totalSec - ctaHold;

  for (const { shot, startSec, seconds } of shots) {
    const line = script.lines[shot.id];
    if (!line?.trim()) continue;
    const words = line.trim().split(/\s+/);
    const per = 6;
    const groups: string[] = [];
    for (let i = 0; i < words.length; i += per) groups.push(words.slice(i, i + per).join(' '));
    const each = seconds / Math.max(1, groups.length);
    groups.forEach((g, gi) => {
      const start = Math.max(hookHold - 0.1, startSec + gi * each);
      const end = Math.min(capEnd, startSec + (gi + 1) * each);
      if (end > start + 0.25) plates.push({ text: g, start, end, kind: 'caption' });
    });
  }
  plates.push({ text: script.cta, start: Math.max(0, totalSec - ctaHold), end: totalSec, kind: 'cta' });
  return plates;
}

/**
 * ffmpeg filter_complex overlaying the timed caption plates onto a graded stream.
 * `[base]` is the input label; returns the graph body and the extra `-i` arguments.
 */
export function plateOverlayGraph(plates: CaptionPlate[], baseLabel: string, outLabel: string): { inputs: string[]; graph: string } {
  const inputs: string[] = [];
  const steps: string[] = [];
  let cur = baseLabel;
  plates.forEach((p, i) => {
    inputs.push('-i', p.png);
    const y = p.kind === 'hook' ? PRESENTER_LAYOUT.hookY : p.kind === 'cta' ? PRESENTER_LAYOUT.ctaY : PRESENTER_LAYOUT.captionY;
    const next = i === plates.length - 1 ? outLabel : `ov${i}`;
    // inputIndex is +1 because input 0 is the stitched video.
    steps.push(
      `[${cur}][${i + 1}:v]overlay=x=(W-w)/2:y=${y}-h/2:` +
        `enable='between(t,${p.start.toFixed(2)},${p.end.toFixed(2)})'[${next}]`,
    );
    cur = next;
  });
  return { inputs, graph: steps.join(';\n') };
}

/** Fonts that actually cover the target script must exist on this machine. */
export function indicFontAvailable(): boolean {
  return existsSync('C:/Windows/Fonts/Nirmala.ttc') || existsSync('/usr/share/fonts/truetype/lohit-devanagari');
}
