import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hardRules } from './hardrules';
import { resolvePlayableVideo } from './watchable';
import type { ReelArtifacts } from './artifacts';

function art(over: Partial<ReelArtifacts> = {}): ReelArtifacts {
  return {
    slug: 'same-tuesday-two-windows',
    dir: '/tmp/missing-reel',
    video: null,
    durationSec: 31.2,
    publish: {},
    creative: null,
    creativeFile: null,
    audioReport: '',
    captions: '',
    frames: [],
    probe: { hasAudio: true, width: 1080, height: 1920, fps: 30, durationSec: 31.2, codec: 'h264' },
    shotBoundaries: '',
    ...over,
  };
}

test('dead air of 1s+ is a blocker, including whole-reel silence', () => {
  const r = hardRules(art({
    audioReport: 'silence_start: 0\nsilence_end: 31.204 | silence_duration: 31.204',
  }));
  assert.equal(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.severity === 'blocker' && /dead air/i.test(f.issue)));
});

test('dry placeholder is a blocker', () => {
  const r = hardRules(art({ publish: { dryRun: true, status: 'ready_to_post_manually' } }));
  assert.equal(r.verdict, 'block');
  assert.ok(r.findings.some((f) => /DRY PLACEHOLDER/i.test(f.issue)));
});

test('/pricing in reel links is a blocker', () => {
  const r = hardRules(art({
    publish: {
      links: { instagram: 'https://www.vedichour.com/pricing?utm_source=instagram' },
    },
  }));
  assert.equal(r.verdict, 'block');
  assert.ok(r.findings.some((f) => /pricing/i.test(f.issue)));
});

test('stub Hinglish caption is a blocker', () => {
  const r = hardRules(art({
    publish: { caption: 'Aapka din ek mood nahi hai. Same Tuesday, do alag windows.' },
  }));
  assert.equal(r.verdict, 'block');
  assert.ok(r.findings.some((f) => /Stub Hinglish/i.test(f.issue)));
});

test('verification silence problems are blockers not majors', () => {
  const r = hardRules(art({
    publish: { verification: { ok: false, problems: ['inaudible: mean volume -91.0 dB'] } },
  }));
  assert.equal(r.verdict, 'block');
  assert.ok(r.findings.every((f) => f.severity === 'blocker' || !/verification/i.test(f.issue)));
  assert.ok(r.findings.some((f) => f.severity === 'blocker' && /inaudible/i.test(f.issue)));
});

test('resolvePlayableVideo ignores a Windows path that is not on this machine', () => {
  const hit = resolvePlayableVideo('/tmp/does-not-exist-reel-dir', {
    video: 'C:\\Users\\aarsh\\Downloads\\jyotish-ai\\marketing-agent\\output\\reels\\same-tuesday-two-windows\\final.mp4',
  });
  assert.equal(hit.path, null);
  assert.ok(hit.tried.some((p) => /final\.mp4$/.test(p)));
});
