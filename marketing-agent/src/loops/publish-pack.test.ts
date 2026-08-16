import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPublishPack, reelPublishStatus, verifyNoteFrom } from './publish-pack';
import type { CreativeScript } from '../render/types';
import type { VerifyResult } from '../render/assemble';

const creative: CreativeScript = {
  slug: 'same-tuesday-two-windows',
  title: 'HR sent two slots',
  product: 'forecast',
  status: 'ready_to_render',
  hook: 'HR sent two slots.',
  cta: 'See the sample — VedicHour.com',
  shots: [
    { id: 's1', role: 'presenter', seconds: 8, dialogue: 'HR sent 10am and 5pm. Same Tuesday. Same call. Not the same hour.' },
    { id: 's5', role: 'presenter_close', seconds: 6, dialogue: 'See both windows on VedicHour.com. Free to start.' },
  ],
};

test('dry or failed verify never becomes ready_to_post_manually', () => {
  assert.equal(reelPublishStatus(true, true), 'dry_placeholder_do_not_post');
  assert.equal(reelPublishStatus(false, false), 'failed_verification');
  assert.equal(reelPublishStatus(false, true), 'ready_to_post_manually');
});

test('forecast pack lands on /sample-report, not /pricing, and uses spoken lines', () => {
  const pack = buildPublishPack(creative, '/tmp/final.mp4', 31.2, 2.92, { dry: false, verified: false });
  assert.equal(pack.status, 'failed_verification');
  for (const url of Object.values(pack.links)) {
    assert.match(url, /\/sample-report/);
    assert.doesNotMatch(url, /\/pricing/);
  }
  assert.match(pack.caption, /HR sent 10am and 5pm/);
  assert.doesNotMatch(pack.caption, /Aapka din ek mood/i);
  assert.doesNotMatch(pack.description, /\/pricing/);
});

test('verify note never says audio present on a mute listen', () => {
  const v: VerifyResult = {
    ok: false,
    probe: { width: 1080, height: 1920, fps: 30, durationSec: 31.2, hasAudio: true, codec: 'h264' },
    problems: ['inaudible: mean volume -91.0 dB'],
    frames: [],
    listen: {
      hasAudioStream: true,
      meanVolumeDb: -91,
      maxVolumeDb: -91,
      longestSilenceSec: 31.2,
      silentShare: 1,
      totalSilentSec: 31.2,
      audible: false,
      problems: ['inaudible: mean volume -91.0 dB'],
    },
  };
  const note = verifyNoteFrom(v);
  assert.match(note, /PROBLEMS/);
  assert.doesNotMatch(note, /audio present/i);
});
