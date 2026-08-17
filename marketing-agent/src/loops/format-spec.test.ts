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

/**
 * THE EARNED PROOF DEADLINE — the change of 2026-08-17, and the reason it needs its own spine.
 *
 * "Shot 2 is the product" was a fixed slot, and the taste lens rejected it on every batch ("the
 * grid cuts in before any question forms in my head"). The product may now wait one presenter beat
 * so that beat can turn the cold open into a question. Both spines are legal, so BOTH must be
 * asserted to pass — a rule change that only relaxes the prompt and not preflight() produces an
 * empty batch and looks like the model had a bad day.
 */
function delayedSpine(): Variant {
  const shotList: Variant['shotList'] = [
    { kind: 'presenter', seconds: 3, visualPrompt: PRESENTER, dialogue: 'Resignation likh li hai.' },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Bhejne ka time abhi tak nahi mila.' },
    { kind: 'screencap', seconds: 2, visualPrompt: GRID },
    { kind: 'presenter', seconds: 6, visualPrompt: PRESENTER, dialogue: 'Pichli baar Monday subah bheji thi, boss ne shaam tak khola nahi.' },
    { kind: 'screencap', seconds: 4, visualPrompt: SLOT },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Aaj ka din VedicHour.com pe dekh liya.' },
  ];
  return canonical({ shotList, spokenScript: shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ') });
}

test('the product may wait one presenter beat and land at shot 3', () => {
  assert.equal(preflight(delayedSpine()), null);
});

test('the product may not land at shot 4 — earned is not the same as eventually', () => {
  const v = delayedSpine();
  // Split the delaying beat in two, so the insert slides one shot later and nothing else changes.
  v.shotList.splice(2, 0, { kind: 'presenter', seconds: 2, visualPrompt: PRESENTER, dialogue: 'Draft khula pada hai.' });
  v.shotList[4].seconds = 4;
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ');
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /by shot 3/);
});

test('the delaying beat may not run so long that the proof arrives after second 8', () => {
  const v = delayedSpine();
  v.shotList[1].seconds = 6; // the long beat moves up front: proof now starts at second 9
  v.shotList[3].seconds = 4;
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /second 9/);
});

test('only the presenter may delay the proof — b-roll before it is throat-clearing', () => {
  // The canonical spine with an atmosphere beat wedged in front of the insert. Every other rule
  // still holds — the product is still at shot 3 and still starts well inside the ceiling — so
  // this can only be caught by the rule about WHAT is allowed to stand there.
  const v = canonical();
  v.shotList.splice(1, 0, { kind: 'broll', seconds: 2, visualPrompt: 'The same young Indian man in the same clothes and light, putting his phone face-down on the dashboard' });
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /only the presenter may delay/i);
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
