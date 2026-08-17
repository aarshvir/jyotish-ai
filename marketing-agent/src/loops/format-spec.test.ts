import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preflight, type Variant } from './creative';

/**
 * THE FORMAT SPEC IS SATISFIABLE — the test that matters most here.
 *
 * preflight() is a chain of ~20 hard rejects that the writer must thread in one shot, and a run
 * costs about 90 minutes of CLI time. A spec with one contradictory rule in it does not fail
 * loudly; it produces an empty batch and looks like the model had a bad day. So the canonical
 * spine from formatSpecBlock() is written out here exactly as the prompt describes it and asserted
 * to PASS, and each individual rule is then asserted to reject when broken.
 */

const PRESENTER = 'Warm natural young Indian man in his late twenties in a parked car at night, speaking to camera, soft available light, no signs or legible screens';
const GRID = "the report's 18-hour day grid scrolling on a phone, clearer windows glowing amber, heavier ones dim";
const SLOT = 'one hour slot tapped open, showing its plain-English line about what that window suits';

/** The spine the prompt tells the writer to produce: 6 shots, 23s, insert then hold, no narration. */
function canonical(over: Partial<Variant> = {}): Variant {
  const shotList: Variant['shotList'] = [
    { kind: 'presenter', seconds: 3, visualPrompt: PRESENTER, dialogue: 'Resignation likh li hai.' },
    { kind: 'screencap', seconds: 2, visualPrompt: GRID },
    { kind: 'presenter', seconds: 6, visualPrompt: PRESENTER, dialogue: 'Pichli baar Monday subah bheji thi, boss ne shaam tak khola nahi.' },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Iss baar poochh ke bhejunga, tuk ke nahi.' },
    { kind: 'screencap', seconds: 4, visualPrompt: SLOT },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Aaj ka din VedicHour.com pe dekh liya.' },
  ];
  const v: Variant = {
    ideaId: 'resignation-timing',
    family: 'decision_moment',
    angle: 'the resignation he keeps rewriting',
    variantIndex: 1,
    hookText: 'Bheji nahi hai abhi tak.',
    spokenScript: shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' '),
    shotList,
    onScreenCaptions: ['Resignation likh li hai.', 'Bheji nahi.', 'Aaj kaunsa ghanta.'],
    cta: 'vedichour.com',
    hashtags: ['#vedichour'],
    youtubeTitle: 'Bheji nahi hai abhi tak',
    youtubeDescription: 'https://www.vedichour.com/sample-report',
    language: 'hinglish',
    tags: { hookFamily: 'question_dilemma', decisionDomain: 'work', emotionalRegister: 'practical', durationTargetSec: 23 },
    explore: false,
    ...over,
  };
  return v;
}

test('the canonical spine from the prompt passes preflight', () => {
  assert.equal(preflight(canonical()), null);
});

test('a narrated product beat is rejected — this format has no narrator', () => {
  const v = canonical();
  v.shotList[1].narration = 'Har ghanta samjhaya hai.';
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /off camera|narrat/i);
});

test('a wordless product beat is NOT rejected — the music bed makes silence a cut', () => {
  const v = canonical();
  v.shotList[4].seconds = 4;
  v.shotList[4].narration = undefined;
  assert.equal(preflight(v), null);
});

test('a long product screen at second three is rejected as an ad pivot', () => {
  const v = canonical();
  v.shotList[1].seconds = 4; // insert becomes a demo
  v.shotList[2].seconds = 4; // keep the reel inside its duration window
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /INSERT|insert/);
});

test('a reel with no later product HOLD is rejected', () => {
  const v = canonical();
  // Three flashes and no hold: still 5s+ of product on screen, so only the HOLD rule can catch it.
  v.shotList[4].seconds = 2;
  v.shotList.splice(5, 0, { kind: 'screencap', seconds: 2, visualPrompt: GRID });
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /HOLD|hold/);
});

test('strict face/screen alternation is rejected as a metronome', () => {
  const v = canonical();
  // Swap the second presenter beat for a product beat, so no two presenter shots are adjacent.
  v.shotList[3] = { kind: 'screencap', seconds: 4, visualPrompt: GRID };
  v.shotList[2].dialogue = 'Pichli baar Monday subah bheji thi, boss ne shaam tak khola hi nahi.';
  v.shotList[5].dialogue = 'Ab poochh ke bhejunga, tuk ke nahi. VedicHour.com dekho.';
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ');
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /BACK TO BACK|back to back|metronome/i);
});

test('a cold open that points at nothing is rejected before any model sees it', () => {
  const v = canonical();
  v.shotList[0].dialogue = 'Haan, isi baat pe atka hoon.';
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ');
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /isi baat/);
});

test('a closing line that never says the site out loud is still rejected', () => {
  const v = canonical();
  v.shotList[5].dialogue = 'Iss baar poochh ke bhejunga.';
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ');
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /site out loud/);
});
