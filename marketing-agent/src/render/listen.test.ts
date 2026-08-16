import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseMeanVolumeDb, parseSilenceDurations, MIN_AUDIBLE_MEAN_DB } from './listen';
import { verifyOutput } from './assemble';
import { resolveTools } from './ffmpeg';
import { spawnSync } from 'node:child_process';

test('volumedetect -inf / -91 dB parses as mute', () => {
  assert.equal(parseMeanVolumeDb('mean_volume: -inf dB'), Number.NEGATIVE_INFINITY);
  assert.equal(parseMeanVolumeDb('[Parsed] mean_volume: -91.0 dB'), -91);
  assert.ok((-91 as number) < MIN_AUDIBLE_MEAN_DB);
});

test('silencedetect durations parse', () => {
  const gaps = parseSilenceDurations('silence_start: 0\nsilence_end: 31.204 | silence_duration: 31.204');
  assert.deepEqual(gaps, [31.204]);
});

test('silent AAC 1080x1920 reel fails verifyOutput — stream is not audio', async () => {
  const { ffmpeg } = resolveTools();
  const dir = mkdtempSync(join(tmpdir(), 'reel-listen-'));
  const file = join(dir, 'silent.mp4');
  const frames = join(dir, 'frames');
  const made = spawnSync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'color=c=0x1a1340:s=1080x1920:d=2:r=30',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', '48000', '-ac', '2',
    '-t', '2',
    file,
  ], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr?.slice(-400));
  const v = await verifyOutput(file, 2, frames, 2);
  assert.equal(v.ok, false);
  assert.equal(v.probe.hasAudio, true);
  assert.equal(v.listen.audible, false);
  assert.ok(v.problems.some((p) => /dead air|inaudible|silent/i.test(p)));
  const dry = await verifyOutput(file, 2, join(dir, 'frames-dry'), 1, { dry: true });
  assert.ok(dry.problems.some((p) => /dry placeholder/i.test(p)));
  rmSync(dir, { recursive: true, force: true });
});
