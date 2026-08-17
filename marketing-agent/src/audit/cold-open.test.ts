import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coldOpenDefect } from './human-eye';

/**
 * The cold open is the only second the reel is guaranteed. These cases are not invented — each
 * accepted line is one a reviewer praised and each rejected line is one a reviewer actually killed,
 * so the test locks the difference between "mid-thought" and "referentially empty".
 */

test('a cold open that points at nothing is rejected', () => {
  const d = coldOpenDefect('Haan, isi baat pe atka hoon.');
  assert.ok(d, 'the 2026-08-16 winner opened on this line and scored 67 for it');
  assert.match(d!, /isi baat/);
  assert.match(d!, /antecedent/);

  assert.ok(coldOpenDefect('Yeh cheez samajh nahi aa rahi.'));
  assert.ok(coldOpenDefect('Wahi baat phir se soch raha hoon.'));
});

test('openers the reviewers already killed at second zero are rejected', () => {
  // "POV:" — "a scroll-past signal before anything plays". "Shayad" — "passive and implies
  // nothing worth watching". Both were paid for by a full scripting stage before being caught.
  for (const line of [
    'POV: parking se Mummy ko call.',
    'Shayad aaj unhe bata dena chahiye.',
    'Kya aapko pata hai din kaise chalta hai?',
    'Namaste dosto, aaj baat karte hain.',
    'Aaj main ek cheez batata hoon.',
  ]) {
    assert.ok(coldOpenDefect(line), `expected "${line}" to be rejected as a tired opener`);
  }
});

test('a complete mid-thought sentence a stranger understands is accepted', () => {
  for (const line of [
    'Teen hafte se yeh message draft mein pada hai.',
    'Last Diwali seedha bol diya tha.',
    'Resignation likh li hai, bheji nahi.',
    'Papa ka call do din se taal raha hoon.',
  ]) {
    assert.equal(coldOpenDefect(line), null, `expected "${line}" to pass`);
  }
});

test('an empty cold open is a defect, not a pass', () => {
  assert.ok(coldOpenDefect(''));
  assert.ok(coldOpenDefect('   '));
});
