import { resolveTools, runCapture, type Probe } from './ffmpeg';

/**
 * A reel is consumed with sound on a phone. Silence reads as a broken file long before it
 * reads as "atmosphere". 1.0s is about the longest pause that still feels like a beat rather
 * than a fault; 25% caps the cumulative total so many short gaps cannot add up to a mute reel.
 *
 * Digital silence (`anullsrc`, a mute AAC track) measures about -91 dB. Speech after loudnorm
 * sits near -16 LUFS. Anything below MIN_AUDIBLE_MEAN_DB is inaudible to a viewer.
 */
export const MAX_SILENCE_GAP_SEC = 1.0;
export const MAX_SILENT_SHARE = 0.25;
export const MIN_AUDIBLE_MEAN_DB = -50;

export interface ListenResult {
  hasAudioStream: boolean;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  longestSilenceSec: number;
  silentShare: number;
  totalSilentSec: number;
  audible: boolean;
  problems: string[];
}

export function parseMeanVolumeDb(blob: string): number | null {
  if (/mean_volume:\s*-inf/i.test(blob)) return Number.NEGATIVE_INFINITY;
  const m = /mean_volume:\s*(-?[\d.]+)\s*dB/i.exec(blob);
  return m ? Number(m[1]) : null;
}

export function parseMaxVolumeDb(blob: string): number | null {
  if (/max_volume:\s*-inf/i.test(blob)) return Number.NEGATIVE_INFINITY;
  const m = /max_volume:\s*(-?[\d.]+)\s*dB/i.exec(blob);
  return m ? Number(m[1]) : null;
}

export function parseSilenceDurations(blob: string): number[] {
  return [...blob.matchAll(/silence_duration:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
}

function finiteDb(n: number | null): boolean {
  return n !== null && Number.isFinite(n);
}

/**
 * Play the file the way a phone would: measure the waveform, not the container.
 * An AAC stream of digital silence is not audio.
 */
export async function listenToReel(file: string, durationSec: number, hasAudioStream: boolean): Promise<ListenResult> {
  const problems: string[] = [];
  if (!hasAudioStream) {
    problems.push('no audio stream — the file is mute');
    return {
      hasAudioStream: false,
      meanVolumeDb: null,
      maxVolumeDb: null,
      longestSilenceSec: durationSec,
      silentShare: 1,
      totalSilentSec: durationSec,
      audible: false,
      problems,
    };
  }

  const { ffmpeg } = resolveTools();
  const sil = await runCapture(ffmpeg, ['-i', file, '-af', 'silencedetect=n=-35dB:d=0.6', '-f', 'null', '-']);
  const vol = await runCapture(ffmpeg, ['-i', file, '-af', 'volumedetect', '-f', 'null', '-']);
  const silBlob = sil.stderr + sil.stdout;
  const volBlob = vol.stderr + vol.stdout;

  const gaps = parseSilenceDurations(silBlob);
  const longest = gaps.length ? Math.max(...gaps) : 0;
  const totalSilent = gaps.reduce((a, b) => a + b, 0);
  const silentShare = durationSec > 0 ? totalSilent / durationSec : 0;
  const meanVolumeDb = parseMeanVolumeDb(volBlob);
  const maxVolumeDb = parseMaxVolumeDb(volBlob);

  if (longest >= MAX_SILENCE_GAP_SEC) {
    problems.push(
      `dead air: a single ${longest.toFixed(1)}s silence (limit ${MAX_SILENCE_GAP_SEC}s). ` +
        'A phone viewer leaves. Either the shot needs a spoken line or the reel needs a music bed under it.',
    );
  }
  if (silentShare >= MAX_SILENT_SHARE) {
    problems.push(
      `${Math.round(silentShare * 100)}% of the reel is silent (limit ${Math.round(MAX_SILENT_SHARE * 100)}%), ` +
        `${totalSilent.toFixed(1)}s of ${durationSec.toFixed(1)}s.`,
    );
  }
  if (meanVolumeDb === Number.NEGATIVE_INFINITY || (finiteDb(meanVolumeDb) && (meanVolumeDb as number) < MIN_AUDIBLE_MEAN_DB)) {
    const shown = meanVolumeDb === Number.NEGATIVE_INFINITY ? '-inf' : `${(meanVolumeDb as number).toFixed(1)}`;
    problems.push(
      `inaudible: mean volume ${shown} dB (limit ${MIN_AUDIBLE_MEAN_DB} dB). ` +
        'A mute AAC track is not audio — digital silence muxed as stereo still "has an audio stream".',
    );
  }

  return {
    hasAudioStream: true,
    meanVolumeDb,
    maxVolumeDb,
    longestSilenceSec: longest,
    silentShare,
    totalSilentSec: totalSilent,
    audible: problems.length === 0,
    problems,
  };
}

export function listenSummary(probe: Pick<Probe, 'width' | 'height' | 'fps' | 'durationSec' | 'codec'>, listen: ListenResult, extra?: string): string {
  const mean =
    listen.meanVolumeDb === Number.NEGATIVE_INFINITY
      ? '-inf'
      : listen.meanVolumeDb === null
        ? 'n/a'
        : `${listen.meanVolumeDb.toFixed(1)}`;
  const core = `${probe.width}x${probe.height}, ${probe.fps}fps, ${probe.durationSec.toFixed(2)}s, ${probe.codec}`;
  if (!listen.audible) {
    return `PROBLEMS: ${listen.problems.join('; ')}${extra ? `; ${extra}` : ''} (${core}, mean ${mean} dB).`;
  }
  return (
    `PASS — ${core}, audible (mean ${mean} dB, longest silence ${listen.longestSilenceSec.toFixed(1)}s, ` +
    `silent share ${Math.round(listen.silentShare * 100)}%). ` +
    'Play the mp4 and listen before posting; extracted frames are not a substitute for watching.' +
    (extra ? ` ${extra}` : '')
  );
}
