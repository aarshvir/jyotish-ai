import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { resolveTools, run } from './ffmpeg';
import {
  analyzeSilence, silenceProblems, assertNoDeadAir,
  MAX_SILENCE_GAP_SEC, MAX_SILENT_SHARE,
} from './assemble';

/**
 * The 2026-08-16 defect — 15.2s of unbroken silence in a 31.2s reel, waved through because an
 * audio STREAM existed — must not be able to come back. These tests run the real silence analysis
 * over SYNTHESIZED fixtures, so they need no reel on disk and no rendered output: `dead.wav` is a
 * miniature of exactly that reel (a spoken head, a long mute middle, a spoken tail) and
 * `alive.wav` is the same shape with a bed under it.
 */

let dir: string;
const dead = () => resolve(dir, 'dead.wav');
const alive = () => resolve(dir, 'alive.wav');

/**
 * Reel-shaped fixture: 2s of "voice", 4s of nothing, 2s of "voice". 8s total, 50% silent.
 * Amplitudes are written out longhand (0.5 = −6 dBFS peak) rather than left to a source filter's
 * default, so the margin to the −35 dB silence floor is a stated fact and not a lucky one.
 */
async function buildDead(): Promise<void> {
  const { ffmpeg } = resolveTools();
  await run(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'aevalsrc=0.5*sin(2*PI*220*t):d=8:s=48000',
    '-af', "volume=enable='between(t,2,6)':volume=0,aformat=channel_layouts=stereo",
    dead(),
  ]);
}

/** The same fixture with a continuous bed 14 dB under it — the fix, in miniature. */
async function buildAlive(): Promise<void> {
  const { ffmpeg } = resolveTools();
  await run(ffmpeg, [
    '-y',
    '-i', dead(),
    '-f', 'lavfi', '-i', 'aevalsrc=0.1*sin(2*PI*110*t):d=8:s=48000',
    '-filter_complex', '[1:a]aformat=channel_layouts=stereo[bed];[0:a][bed]amix=inputs=2:duration=first',
    alive(),
  ]);
}

before(async () => {
  dir = mkdtempSync(resolve(tmpdir(), 'vh-silence-'));
  await buildDead();
  await buildAlive();
});

after(() => rmSync(dir, { recursive: true, force: true }));

test('a long mute stretch is measured, not just detected as "has audio"', async () => {
  const r = await analyzeSilence(dead());
  assert.ok(r.durationSec > 7.5 && r.durationSec < 8.5, `expected ~8s, got ${r.durationSec}`);
  assert.ok(r.longestSec > 3.5, `expected a ~4s gap, got ${r.longestSec}`);
  assert.ok(r.silentShare > 0.4, `expected ~50% silent, got ${r.silentShare}`);
  // The position is what lets the mix assertion name a shot, so it has to be right too.
  const worst = r.gaps.slice().sort((a, b) => b.durationSec - a.durationSec)[0];
  assert.ok(Math.abs(worst.startSec - 2) < 0.4, `gap should start at ~2s, got ${worst.startSec}`);
});

test('both dead-air limits fire on that stretch', async () => {
  const problems = silenceProblems(await analyzeSilence(dead()));
  assert.equal(problems.length, 2, `expected the gap AND the share limit to fire: ${problems.join(' | ')}`);
  assert.match(problems[0], new RegExp(String(MAX_SILENCE_GAP_SEC)));
  assert.match(problems[1], new RegExp(String(Math.round(MAX_SILENT_SHARE * 100))));
});

test('assertNoDeadAir names the shot the silence lands on', async () => {
  const r = await analyzeSilence(dead());
  assert.throws(
    () => assertNoDeadAir(r, {
      hasMusic: false,
      shotWindows: [
        { id: 's1-open', start: 0, end: 2 },
        { id: 's2-product', start: 2, end: 6 },
        { id: 's3-close', start: 6, end: 8 },
      ],
    }),
    /s2-product/,
  );
});

test('with a bed present the same silence is reported as a MIX BUG', async () => {
  const r = await analyzeSilence(dead());
  assert.throws(() => assertNoDeadAir(r, { hasMusic: true }), /MIX BUG/);
});

test('a bed under the gap makes the reel pass — the fix, verified', async () => {
  const r = await analyzeSilence(alive());
  assert.equal(r.longestSec, 0, `a bed should leave no gap at all, found ${r.longestSec}s`);
  assert.deepEqual(silenceProblems(r), []);
  assert.doesNotThrow(() => assertNoDeadAir(r, { hasMusic: true }));
});
