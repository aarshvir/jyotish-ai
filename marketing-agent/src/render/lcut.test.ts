import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCreative, LCUT_MAX_SEC } from './types';

/**
 * THE L-CUT CONTRACT — Shot.audioExtendsSec.
 *
 * The renderer carries a presenter's own Veo audio over the following picture. Everything that
 * makes that legal is decidable from the JSON, so it is decided for $0 (CLAUDE.md §1) — these
 * assert that the gate actually refuses each illegal shape rather than discovering it in $3 of
 * rendered pixels.
 */

const PRESENTER = 'Warm natural young Indian man in a parked car at dusk, speaking to camera';

/** The canonical L-cut: his turn line runs on over the hold, then the hold reads on its own. */
function creative(over: Partial<Record<string, unknown>> = {}, shotOver: Record<string, unknown>[] = []) {
  const shots: any[] = [
    { id: 's1', role: 'presenter', seconds: 3, prompt: PRESENTER, dialogue: 'Ex ka naam dekha, phone rakha.', voice: 'veo_native' },
    { id: 's2', role: 'presenter_close', seconds: 4, prompt: PRESENTER, dialogue: 'Ab wording nahi, bhejne ka waqt soch raha hoon.', voice: 'veo_native', audioExtendsSec: 1.5 },
    { id: 's3', role: 'product', seconds: 3, capture: { url: 'https://www.vedichour.com/sample-report' } },
    { id: 's4', role: 'presenter_close', seconds: 4, prompt: PRESENTER, dialogue: 'Ab hi final hai. VedicHour pe dekha.', voice: 'veo_native' },
  ];
  shotOver.forEach((o, i) => Object.assign(shots[i], o));
  return { slug: 'lcut', title: 't', product: 'forecast', status: 'ready_to_render', hook: 'Hi se hey?', cta: 'vedichour.com', shots, ...over };
}

const errors = (c: any) => validateCreative(c).issues.filter((i) => i.level === 'error').map((i) => i.message);

test('a presenter L-cut over a silent product shot is legal', () => {
  const r = validateCreative(creative());
  assert.equal(r.ok, true, errors(creative()).join(' | '));
});

test('a creative with no L-cut at all is unaffected', () => {
  assert.equal(validateCreative(creative({}, [{}, { audioExtendsSec: undefined }])).ok, true);
});

test('only a presenter may declare an L-cut — a product shot has no voice of its own', () => {
  const c = creative({}, [{}, { audioExtendsSec: undefined }, { audioExtendsSec: 1 }]);
  assert.match(errors(c).join(' '), /only a presenter shot may declare audioExtendsSec/);
});

test('an L-cut longer than the ceiling is refused', () => {
  const c = creative({}, [{}, { seconds: 8, audioExtendsSec: LCUT_MAX_SEC + 1 }]);
  assert.match(errors(c).join(' '), /exceeds the 3s ceiling/);
});

test('an L-cut on the last shot has nothing to play over', () => {
  const c: any = creative();
  c.shots = c.shots.slice(0, 2);
  assert.match(errors(c).join(' '), /nothing after it for the voice to play over/);
});

test('an L-cut into another presenter is refused — his lips would move to someone else’s words', () => {
  const c = creative({}, [{}, {}, {}]);
  (c.shots as any)[2] = { id: 's3', role: 'presenter_close', seconds: 3, prompt: PRESENTER, dialogue: 'Kuch aur.', voice: 'veo_native' };
  assert.match(errors(c).join(' '), /which is another presenter/);
});

test('an L-cut over a shot that carries its own narration is two voices at once', () => {
  const c = creative({}, [{}, {}, { role: 'broll', prompt: PRESENTER, vo: 'Do windows.', voice: 'bulbul:v3:male', capture: undefined }]);
  assert.match(errors(c).join(' '), /has its own narration/);
});

test('an L-cut longer than the shot it plays over is refused', () => {
  const c = creative({}, [{}, { seconds: 6, audioExtendsSec: 2.5 }, { seconds: 2 }]);
  assert.match(errors(c).join(' '), /longer than the following shot/);
});

test('an L-cut that would carry the WHOLE line is refused', () => {
  // Four words is about 1.7s of speech; a 2s L-cut leaves nothing said on camera.
  const c = creative({}, [{}, { dialogue: 'Ab waqt soch raha.', audioExtendsSec: 2 }]);
  assert.match(errors(c).join(' '), /would carry the WHOLE line/);
});

test('an L-cut that would leave a flash frame instead of a beat is refused', () => {
  // Six words ~2.6s of speech: a 2s L-cut still leaves a tail to carry, but only ~0.9s of picture.
  const c = creative({}, [{}, { seconds: 5, dialogue: 'Ab wording nahi, waqt soch raha.', audioExtendsSec: 2 }]);
  assert.match(errors(c).join(' '), /flash frame, not a beat/);
});

test('the reel’s reported length is its ON-SCREEN length — an L-cut shortens it', () => {
  // 1 + 4 + 2 + 2 = 9s of clips, but 1.5s of that is HEARD over the next picture, never seen
  // twice — so the reel runs 7.5s and trips the short-reel warning that 9s would not.
  const short = creative({}, [
    { seconds: 1, dialogue: 'Phone rakha.' },
    {},
    { seconds: 2 },
    { seconds: 2, dialogue: 'VedicHour pe dekha.' },
  ]);
  const warn = validateCreative(short).issues.find((i) => /too short/.test(i.message));
  assert.ok(warn, 'expected the length warning to be computed from on-screen seconds');
  assert.match(warn!.message, /7\.5s total/);
});
