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
/** The legible insert: two hours for the same task, readable in the two seconds it is on screen. */
const PAIR = 'two hours side by side on the same day - one clearer, one heavier - for the same task';

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
 * THE ONE-BEAT SPINE — the default from 2026-08-18, and the shape that scored 76.
 *
 * The controlled experiment (identical words, identical judge, one call) put two product beats at
 * human eye 55 and ONE late beat at 76. MIN_PRODUCT_SHOTS came down to 1, which is only real if
 * the arithmetic works: the sole beat has to carry MIN_PRODUCT_SEC on its own, so it also has to
 * be allowed past SHOT_MAX_SEC. A relaxation that the spec cannot actually express is a lie the
 * writer only discovers after a whole rejected batch, which is what this asserts against.
 */
function soleHoldSpine(over: Partial<Variant> = {}): Variant {
  const shotList: Variant['shotList'] = [
    { kind: 'presenter', seconds: 3, visualPrompt: PRESENTER, dialogue: 'Resignation likh li hai.' },
    { kind: 'presenter', seconds: 5, visualPrompt: PRESENTER, dialogue: 'Pichli baar Monday bheji thi, boss ne shaam tak khola nahi.' },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Iss baar poochh ke bhejunga, tuk ke nahi.' },
    { kind: 'screencap', seconds: 4, visualPrompt: PAIR },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Kal subah bhejunga. VedicHour pe dekha.' },
  ];
  return canonical({ shotList, spokenScript: shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' '), ...over });
}

test('ONE late product beat is legal — the shape that scored 76', () => {
  assert.equal(preflight(soleHoldSpine()), null);
});

test('a closing line that says only the brand name, no ".com", passes', () => {
  const v = soleHoldSpine();
  assert.match(v.shotList[4].dialogue!, /VedicHour(?!\.com)/);
  assert.equal(preflight(v), null);
});

test('the sole product beat may not be parked early — that is an insert with the payoff deleted', () => {
  const v = soleHoldSpine();
  // Same shots, same seconds, the screen simply moved to shot 2.
  const hold = v.shotList.splice(3, 1)[0];
  v.shotList.splice(1, 0, hold);
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /only product beat starts at second/);
});

test('the sole product beat must answer a spoken line, not an atmosphere shot', () => {
  const v = soleHoldSpine();
  // An atmosphere beat wedged between the turn and the hold. Every other rule still holds — one
  // b-roll, 23s, the hold still late — so only the "it must be a REPLY" rule can catch this.
  v.shotList.splice(3, 0, { kind: 'broll', seconds: 2, visualPrompt: 'The same young Indian man in the same clothes and light, putting his phone face-down on the kitchen counter' });
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /follows a broll shot|ANSWERS the line/);
});

test('a second product beat is allowed but must be a short early insert', () => {
  const v = soleHoldSpine();
  v.shotList.splice(2, 0, { kind: 'screencap', seconds: 2, visualPrompt: GRID });
  assert.equal(preflight(v), null);
  // ...and a four-second "glance" is still the ad pivot that killed four batches.
  v.shotList[2].seconds = 4;
  v.shotList[4].seconds = 3;
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /INSERT/);
});

test('two long product shots are rejected — a reel has one hold, not two', () => {
  const v = soleHoldSpine();
  v.shotList[3].seconds = 5; // the hold, over its own ceiling...
  v.shotList.splice(2, 0, { kind: 'screencap', seconds: 5, visualPrompt: GRID }); // ...twice over
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /ONE hold|one hold/);
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
    // The remembered detail, in front of the product — the reel's one long beat.
    { kind: 'presenter', seconds: 6, visualPrompt: PRESENTER, dialogue: 'Pichli baar Monday subah bheji thi, boss ne shaam tak khola nahi.' },
    { kind: 'screencap', seconds: 2, visualPrompt: PAIR },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Iss baar poochh ke bhejunga, tuk ke nahi.' },
    { kind: 'screencap', seconds: 4, visualPrompt: SLOT },
    { kind: 'presenter', seconds: 4, visualPrompt: PRESENTER, dialogue: 'Aaj ka din VedicHour.com pe dekh liya.' },
  ];
  return canonical({ shotList, spokenScript: shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ') });
}

test('the default spine — detail first, product answering it at shot 3 — passes preflight', () => {
  assert.equal(preflight(delayedSpine()), null);
});

test('the product may not land at shot 4 — earned is not the same as eventually', () => {
  const v = delayedSpine();
  // Split the detail beat in two, so the insert slides one shot later and nothing else changes.
  v.shotList[1].seconds = 4;
  v.shotList.splice(2, 0, { kind: 'presenter', seconds: 2, visualPrompt: PRESENTER, dialogue: 'Draft khula pada hai.' });
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /by shot 3/);
});

test('the detail beat may not run so long that the proof arrives after second 9', () => {
  const v = delayedSpine();
  v.shotList[0].seconds = 3;
  v.shotList[1].seconds = 6; // legal on its own (3+6 = 9, exactly the ceiling)
  assert.equal(preflight(v), null);
  // ...but one second more and the reel is drifting back toward the 13-second failure.
  v.shotList[1].seconds = 7;
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /ceiling is 6s|second 10/);
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
  v.shotList[5].dialogue = 'Ab poochh ke bhejunga. Kal subah. VedicHour pe dekha.';
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

/**
 * THE THREE DEFECTS THAT SURVIVED AN 89. Added 2026-08-18 from a real artifact:
 * output/creative/2026-08-17-savings-poochi-maine-menu-khol-diya.json scored 89 total / 82 human
 * eye and shipped all three. Each is plain text in the creative JSON, so each is now a $0 reject.
 */
test('a hook card that repeats the cold open verbatim is rejected', () => {
  const v = soleHoldSpine();
  // The real 89-scoring artifact's own hook and cold open, byte for byte.
  v.shotList[0].dialogue = 'Savings poochi. Maine menu khol diya.';
  v.hookText = v.shotList[0].dialogue;
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ');
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /same sentence/);
});

test('a hook that merely shares a word with the cold open is fine', () => {
  const v = soleHoldSpine();
  v.hookText = 'Bheji nahi hai abhi tak.';
  assert.equal(preflight(v), null);
});

test('a long beat that restates the cold open in more words is rejected', () => {
  const v = soleHoldSpine();
  v.shotList[0].dialogue = 'Savings poochi. Menu khol diya.';
  v.shotList[1].dialogue = 'Friday dinner pe savings poochi thi; menu teen baar khola.';
  v.hookText = 'Teen baar. Same page.';
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ') + ' Ek aur baat thi jo main bolna bhool gaya tha.';
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /restates the cold open/);
});

test('a generated shot may not ask for a brand lockup — the renderer adds the end card', () => {
  const v = soleHoldSpine();
  v.shotList[4].visualPrompt = `${PRESENTER}. Subtle premium brand lockup appears at the end.`;
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /branding or text/);
});

test('"no logos" in a visual prompt is the CORRECT phrasing and must not be rejected', () => {
  const v = soleHoldSpine();
  v.shotList[4].visualPrompt = `${PRESENTER}, no logos and no legible text anywhere in frame`;
  assert.equal(preflight(v), null);
});

/**
 * THE CLOSING LINE MAY NAME THE BRAND BUT MAY NOT COMMAND THE VIEWER.
 *
 * On 2026-08-18 the five highest-scoring scripts of the day (human eye 77, 75, 73, 72, 69) were
 * all rejected on this one beat and nothing else — "the mandatory-sounding CTA kills the chai
 * payoff", "I got the payoff; the brand CTA adds nothing". The owner's law is that a LISTENER
 * HEARS THE NAME, never that the reel issues an order, and the difference is now mechanical.
 */
test('a closing line that orders the viewer to go and look is rejected', () => {
  for (const bossy of ['Kal subah bhejunga. VedicHour pe dekh lo.', 'Kal bhejunga. Aap bhi VedicHour dekhna.', 'Kal bhejunga. VedicHour try karo.']) {
    const v = soleHoldSpine();
    v.shotList[4].dialogue = bossy;
    v.spokenScript = v.shotList.map((sh) => sh.dialogue ?? '').filter(Boolean).join(' ');
    const r = preflight(v);
    assert.ok(r, `expected a reject for: ${bossy}`);
    assert.match(r!, /tells the viewer what to do/);
  }
});

test('the same line in the first person, naming the brand, passes', () => {
  const v = soleHoldSpine();
  v.shotList[4].dialogue = 'Kal subah bhejunga. VedicHour pe dekha.';
  v.spokenScript = v.shotList.map((sh) => sh.dialogue ?? '').filter(Boolean).join(' ');
  assert.equal(preflight(v), null);
});

test('a closing line that never says the site out loud is still rejected', () => {
  const v = canonical();
  v.shotList[5].dialogue = 'Iss baar poochh ke bhejunga.';
  v.spokenScript = v.shotList.map((s) => s.dialogue ?? '').filter(Boolean).join(' ');
  const r = preflight(v);
  assert.ok(r);
  assert.match(r!, /site out loud/);
});
