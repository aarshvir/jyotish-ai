import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { listenToReel } from '../render/listen';
import { probeVideo, resolveTools } from '../render/ffmpeg';
import type { Finding, LensReport } from './types';
import type { ReelArtifacts } from './artifacts';

/**
 * Resolve a file a human could actually press play on. A Windows path in publish.json is not
 * a viewing. Prefer the copy sitting next to the pack (`final.mp4`) so review works after the
 * pack is copied between machines.
 */
export function resolvePlayableVideo(dir: string, publish: { video?: unknown } | null | undefined): { path: string | null; tried: string[] } {
  const tried: string[] = [];
  const local = resolve(dir, 'final.mp4');
  tried.push(local);
  if (existsSync(local)) return { path: local, tried };
  const claimed = typeof publish?.video === 'string' ? publish.video : '';
  if (claimed) {
    tried.push(claimed);
    if (existsSync(claimed)) return { path: claimed, tried };
  }
  return { path: null, tried };
}

function add(
  findings: Finding[],
  issue: string,
  fix: string,
  timestamp = 'n/a',
): void {
  findings.push({
    timestamp,
    severity: 'blocker',
    issue,
    fix,
    lens: 'human-view',
    stage: 'deterministic',
  });
}

/**
 * Mandatory play + listen gate. LLM lenses attach still frames and cannot hear the file.
 * If this pass blocks, review must not run vision/audio models — they would rubber-stamp mute
 * placeholders the way `hasAudio: true` already did.
 */
export async function humanViewLens(a: ReelArtifacts): Promise<LensReport> {
  const findings: Finding[] = [];
  const { path, tried } = resolvePlayableVideo(a.dir, a.publish);

  if (a.publish?.dryRun) {
    add(
      findings,
      'DRY PLACEHOLDER — navy/gold storyboard cards with a silent AAC track. A viewer opening this on Instagram would see empty PRESENTER FRAME boxes, not a person, and would hear nothing.',
      'Do not post. Paid render only after `npm run approve` → `loop:render` on a machine with marketing-agent/.env (FAL_KEY + SARVAM_API_KEY). Then watch the new final.mp4 with sound on.',
    );
  }

  if (!path) {
    add(
      findings,
      `Cannot watch this reel like a human. No playable final.mp4. Looked at: ${tried.join(' · ')}. Reading publish.json is not viewing — that is how a mute dry card shipped as "PASS — audio present".`,
      'Render a live presenter reel, keep final.mp4 next to publish.json, play it with sound on, then re-run `npm run loop:review`. Never mark ready_to_post from metadata.',
    );
  } else {
    const { ffprobe } = resolveTools();
    const probe = await probeVideo(ffprobe, path);
    const listen = await listenToReel(path, probe.durationSec, probe.hasAudio);
    for (const p of listen.problems) {
      add(
        findings,
        p,
        'Re-render with audible presenter speech (Veo native audio) and a music bed under product/b-roll. Then play the mp4. An audio STREAM of digital silence is not a watchable reel.',
        '0s',
      );
    }
    if (a.publish?.verification?.ok && !listen.audible) {
      add(
        findings,
        'Legacy verification claimed PASS / audio present while the waveform is mute or full of dead air. hasAudio on the container is not a listen.',
        'Trust listenToReel / verifyOutput, not an old publish.json probe.',
      );
    }
  }

  const blocker = findings.length > 0;
  return {
    lens: 'human-view (play + listen)',
    stage: 'deterministic',
    source: 'ffmpeg',
    verdict: blocker ? 'block' : 'ship',
    findings,
    oneLiner: blocker
      ? `Unwatchable as a phone viewer: ${findings.length} listen/watch blocker(s).`
      : 'Playable file exists and the waveform is audible — still watch the mp4 before posting.',
    ok: true,
    costUsd: 0,
    durationMs: 0,
  };
}
