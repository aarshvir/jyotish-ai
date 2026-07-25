import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { envStr } from './env';
import type { ShotProvider } from './types';

/**
 * Video generation providers, ALL behind fal.ai as a single gateway.
 *
 * Deliberate architecture choice: one API key (`FAL_KEY`) reaches Google Veo, Kuaishou Kling,
 * Alibaba Wan and ByteDance Seedance. The owner manages one key, one invoice, one place to
 * revoke. We do NOT build on OpenAI Sora 2 — its API is scheduled to sunset September 2026.
 *
 * Every price below was read off fal's own model pages / llms.txt in July 2026 and each row
 * carries its source. Where fal's page was unreachable the row is marked `priceVerified: false`
 * and is priced at the CONSERVATIVE (higher) sibling rate, because a budget guard that
 * under-estimates is worse than one that over-estimates.
 */

export interface ProviderSpec {
  /** Routing key used in creative JSON. */
  key: ShotProvider;
  /** fal endpoint id. NOTE: prefixes are NOT uniform — Veo/Kling use `fal-ai/`, Wan 2.6 and
   *  Seedance are top-level namespaces. Do not "normalise" these. */
  endpoint: string;
  label: string;
  /** USD per second of generated video, at the settings we actually use (see `notes`). */
  costPerSecond: number;
  /** Durations the endpoint accepts. Requests are snapped to one of these before billing. */
  allowedSeconds: number[];
  /** Does the model produce its own synchronized dialogue/lip-sync? */
  nativeAudio: boolean;
  priceVerified: boolean;
  source: string;
  notes: string;
}

/**
 * THE PRICE TABLE — single auditable source of truth. Nothing else in this repo may hardcode
 * a per-second video price.
 *
 * Corrections to earlier internal assumptions, all verified July 2026:
 *  - Kling v3 is NOT natively 4K. Native 4K is a separate, far pricier line (`kling-video/o3/4k`
 *    at $0.42/s — 5x the standard route). We deliberately do not use it.
 *  - Wan 2.6 is $0.10/s @720p and $0.15/s @1080p — NOT ~$0.05/s. It is not the cheapest option.
 *  - Seedance 2.0 Fast is $0.2419/s — NOT ~$0.09/s. It is the MOST expensive of the four, so it
 *    is a correctness fallback (when another route fails), never a cost-saving one.
 *  - The cheapest verified route is actually Kling v3 Standard with audio disabled, $0.084/s.
 */
export const PRICE_TABLE: Record<ShotProvider, ProviderSpec> = {
  veo31_fast: {
    key: 'veo31_fast',
    endpoint: 'fal-ai/veo3.1/fast',
    label: 'Google Veo 3.1 Fast',
    costPerSecond: 0.15, // 720p/1080p WITH audio. Audio-off is $0.10/s; 4K is $0.35/s (unused).
    allowedSeconds: [4, 6, 8],
    nativeAudio: true,
    priceVerified: true,
    source: 'https://fal.ai/models/fal-ai/veo3.1/fast',
    notes: 'Native synchronized dialogue + lip-sync, native 9:16. The ONLY presenter route. Put the spoken line in quotes inside the prompt; keep the prompt 150-300 chars.',
  },
  kling30: {
    key: 'kling30',
    endpoint: 'fal-ai/kling-video/v3/standard/text-to-video',
    label: 'Kling 3.0 Standard',
    costPerSecond: 0.084, // audio OFF. Audio-on is $0.126/s, voice-control $0.154/s.
    allowedSeconds: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    nativeAudio: false, // we run it audio-off on purpose — b-roll takes the VO track
    priceVerified: true,
    source: 'https://fal.ai/models/fal-ai/kling-video/v3/standard/text-to-video/llms.txt',
    notes: 'Best cinematic motion + subject consistency. Cheapest verified per-second route. fal does not publish its output resolution; we upscale to 1080x1920 in assembly regardless.',
  },
  wan26: {
    key: 'wan26',
    endpoint: 'wan/v2.6/text-to-video',
    label: 'Wan 2.6',
    costPerSecond: 0.15, // CONSERVATIVE: see priceVerified below.
    allowedSeconds: [5, 10, 15],
    nativeAudio: false,
    priceVerified: false,
    source: 'https://fal.ai/models/wan/v2.6/image-to-video/llms.txt (sibling endpoint)',
    notes: 'fal 404s on the text-to-video page, so its price is INFERRED from the image-to-video and reference-to-video siblings ($0.10/s @720p, $0.15/s @1080p). Budgeted at the 1080p rate so we can never under-estimate. Prefer wan27 — same family, verified, cheaper.',
  },
  wan27: {
    key: 'wan27',
    endpoint: 'fal-ai/wan/v2.7/text-to-video',
    label: 'Wan 2.7',
    costPerSecond: 0.1, // flat, all endpoints, all resolutions
    allowedSeconds: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    nativeAudio: false,
    priceVerified: true,
    source: 'https://fal.ai/wan-2.7',
    notes: 'Newer and strictly better than 2.6: flat $0.10/s at every resolution, native 1080p by default. Default filler-B-roll route.',
  },
  seedance2_fast: {
    key: 'seedance2_fast',
    endpoint: 'bytedance/seedance-2.0/fast/text-to-video',
    label: 'Seedance 2.0 Fast',
    costPerSecond: 0.2419,
    allowedSeconds: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    nativeAudio: true,
    priceVerified: true,
    source: 'https://fal.ai/models/bytedance/seedance-2.0/fast/text-to-video/llms.txt',
    notes: 'FALLBACK ONLY. At $0.2419/s it is 1.6x Veo Fast and 2.9x Kling Standard — it is a resiliency route, not a budget route. Max 720p. Cost is identical whether audio is generated or not.',
  },
  screencap: {
    key: 'screencap',
    endpoint: 'local:playwright',
    label: 'Product screen capture',
    costPerSecond: 0,
    allowedSeconds: [],
    nativeAudio: false,
    priceVerified: true,
    source: 'local',
    notes: 'FREE. Real VedicHour UI — the honest proof shot. See src/render/screencap.ts.',
  },
  placeholder: {
    key: 'placeholder',
    endpoint: 'local:ffmpeg',
    label: 'Dry-run placeholder',
    costPerSecond: 0,
    allowedSeconds: [],
    nativeAudio: false,
    priceVerified: true,
    source: 'local',
    notes: 'FREE. lavfi stand-in used by --dry so the whole assembly path runs for real.',
  },
};

/** Default role -> provider routing. A shot may override with its own `provider`. */
export const ROLE_ROUTING = {
  presenter: 'veo31_fast',
  presenter_close: 'veo31_fast',
  broll_hero: 'kling30',
  broll: 'wan27',
  product: 'screencap',
} as const;

/** Snap a requested duration to the nearest billable duration the endpoint accepts (never down to 0). */
export function quantizeSeconds(spec: ProviderSpec, seconds: number): number {
  if (!spec.allowedSeconds.length) return Math.max(1, Math.round(seconds * 100) / 100);
  // Prefer the smallest allowed duration that still covers the request; else the largest available.
  const covering = spec.allowedSeconds.filter((s) => s >= seconds);
  return covering.length ? Math.min(...covering) : Math.max(...spec.allowedSeconds);
}

/** Predicted USD for a shot, using the billable (quantized) duration. */
export function estimateCost(key: ShotProvider, seconds: number): { seconds: number; usd: number; spec: ProviderSpec } {
  const spec = PRICE_TABLE[key];
  const billed = quantizeSeconds(spec, seconds);
  return { seconds: billed, usd: Math.round(billed * spec.costPerSecond * 10000) / 10000, spec };
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface GenerateOpts {
  /** Absolute path the finished mp4 must be written to. */
  outPath: string;
  aspectRatio?: '9:16' | '16:9';
  resolution?: '720p' | '1080p';
  /** Ask the model for its own audio (only meaningful where `nativeAudio` is true). */
  audio?: boolean;
  /** Reference image for image-to-video subject consistency. */
  imageUrl?: string;
  seed?: number;
  /** Called with progress lines so the loop can show something during a 2-3 minute generation. */
  onProgress?: (msg: string) => void;
}

export interface GenerateResult {
  localPath: string;
  costUsd: number;
  /** Billable seconds actually requested. */
  seconds: number;
  model: string;
}

export interface VideoProvider {
  name: ShotProvider;
  costPerSecond: number;
  generate(prompt: string, seconds: number, opts: GenerateOpts): Promise<GenerateResult>;
}

export function hasFalKey(): boolean {
  return envStr('FAL_KEY') !== null;
}

// ---------------------------------------------------------------------------
// fal.ai queue client
// ---------------------------------------------------------------------------

const QUEUE_BASE = 'https://queue.fal.run';

interface FalSubmit {
  request_id: string;
  status_url: string;
  response_url: string;
  cancel_url?: string;
  queue_position?: number;
}

async function falFetch(url: string, init: RequestInit = {}): Promise<any> {
  const key = envStr('FAL_KEY');
  if (!key) throw new Error('FAL_KEY is not set');
  const res = await fetch(url, {
    ...init,
    headers: {
      // fal uses the literal word `Key`, NOT `Bearer`.
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`fal HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`fal returned non-JSON: ${text.slice(0, 200)}`);
  }
}

/** Submit -> poll -> fetch result. Uses the status/response URLs fal hands back rather than
 *  reconstructing them, because endpoint-id path shapes differ between model families. */
async function falRun(endpoint: string, input: Record<string, any>, onProgress?: (m: string) => void, timeoutMs = 15 * 60 * 1000): Promise<any> {
  const sub: FalSubmit = await falFetch(`${QUEUE_BASE}/${endpoint}`, { method: 'POST', body: JSON.stringify(input) });
  onProgress?.(`queued ${sub.request_id}${sub.queue_position != null ? ` (position ${sub.queue_position})` : ''}`);

  const deadline = Date.now() + timeoutMs;
  let delay = 2000;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`fal ${endpoint} timed out after ${Math.round(timeoutMs / 1000)}s`);
    await sleep(delay);
    delay = Math.min(delay * 1.25, 10000);
    const st = await falFetch(sub.status_url);
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED' || st.error) throw new Error(`fal ${endpoint} failed: ${JSON.stringify(st.error ?? st).slice(0, 300)}`);
    onProgress?.(`${st.status}${st.queue_position != null ? ` (position ${st.queue_position})` : ''}`);
  }
  return falFetch(sub.response_url);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadTo(url: string, outPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
}

/** Pull the mp4 URL out of fal's response. All four families return `{ video: { url } }`. */
function videoUrlOf(result: any): string {
  const url = result?.video?.url ?? result?.videos?.[0]?.url ?? result?.output?.video?.url;
  if (typeof url !== 'string' || !url) throw new Error(`no video url in fal response: ${JSON.stringify(result).slice(0, 300)}`);
  return url;
}

/** Build the per-family request body. The four APIs are NOT interchangeable. */
function buildInput(spec: ProviderSpec, prompt: string, seconds: number, opts: GenerateOpts): Record<string, any> {
  const aspect = opts.aspectRatio ?? '9:16';
  const base: Record<string, any> = { prompt };
  if (opts.seed != null) base.seed = opts.seed;

  switch (spec.key) {
    case 'veo31_fast':
      // Veo takes duration as a STRING enum, and 9:16 natively.
      return {
        ...base,
        duration: `${seconds}s`,
        aspect_ratio: aspect,
        resolution: opts.resolution ?? '720p',
        generate_audio: opts.audio !== false,
        ...(opts.imageUrl ? { image_url: opts.imageUrl } : {}),
      };
    case 'kling30':
      return {
        ...base,
        duration: String(seconds),
        aspect_ratio: aspect,
        // audio off keeps this at $0.084/s instead of $0.126/s
        generate_audio: opts.audio === true,
        ...(opts.imageUrl ? { image_url: opts.imageUrl } : {}),
      };
    case 'wan26':
    case 'wan27':
      return {
        ...base,
        duration: seconds,
        resolution: opts.resolution ?? '1080p',
        aspect_ratio: aspect,
        ...(opts.imageUrl ? { image_url: opts.imageUrl } : {}),
      };
    case 'seedance2_fast':
      return {
        ...base,
        duration: seconds,
        resolution: opts.resolution ?? '720p',
        aspect_ratio: aspect,
        ...(opts.imageUrl ? { image_url: opts.imageUrl } : {}),
      };
    default:
      return base;
  }
}

/** A real, paid fal.ai provider. */
export function falProvider(key: ShotProvider): VideoProvider {
  const spec = PRICE_TABLE[key];
  return {
    name: key,
    costPerSecond: spec.costPerSecond,
    async generate(prompt, seconds, opts) {
      const billed = quantizeSeconds(spec, seconds);
      opts.onProgress?.(`${spec.label} · ${billed}s · $${(billed * spec.costPerSecond).toFixed(2)}`);
      const result = await falRun(spec.endpoint, buildInput(spec, prompt, billed, opts), opts.onProgress);
      await downloadTo(videoUrlOf(result), opts.outPath);
      return {
        localPath: opts.outPath,
        costUsd: Math.round(billed * spec.costPerSecond * 10000) / 10000,
        seconds: billed,
        model: spec.endpoint,
      };
    },
  };
}

/** Resolve the provider for a shot: real fal client, or the free placeholder in dry mode. */
export function providerFor(key: ShotProvider, dry: boolean): VideoProvider {
  if (dry || key === 'placeholder' || key === 'screencap') {
    // placeholder generation lives in assemble.ts (it is pure ffmpeg); this is the accounting shell.
    return {
      name: dry ? 'placeholder' : key,
      costPerSecond: 0,
      async generate() {
        throw new Error('placeholder/screencap generation is handled by the render loop, not this provider');
      },
    };
  }
  return falProvider(key);
}
