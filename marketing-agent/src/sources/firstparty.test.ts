/**
 * The privacy property is the reason this module is allowed to exist, so it is asserted
 * mechanically, not reviewed by eye.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, classify, CATEGORIES, demandDigest, type Category } from './firstparty';

/**
 * Deliberately awful inputs: real-shaped personal context carrying names, a phone number, a birth
 * date and an email. Every one of these tokens is a thing that must never reach disk.
 */
const SENSITIVE = [
  'My father Rajesh Kumar has heart surgery booked on 14 March, should we move it',
  'shaadi ke liye rishta aaya hai, ladka Bangalore mein hai, call me on 9876543210',
  'I want to resign from Infosys before the appraisal, my manager Priya knows already',
  'born 1994-08-02 in Kanpur, reach me at anita.sharma@example.com about the flat loan EMI',
  'breakup ke baad ex ko message karun ya nahi',
  'JEE exam is in April and my son is not studying',
];

const SECRET_TOKENS = [
  'Rajesh',
  'Priya',
  'Anita',
  'anita.sharma@example.com',
  '9876543210',
  '1994-08-02',
  'Kanpur',
  'Infosys',
  'Bangalore',
  'shaadi ke liye',
  'heart surgery booked',
];

test('nothing verbatim survives aggregation', () => {
  const out = aggregate(SENSITIVE);
  const json = JSON.stringify(out);
  for (const token of SECRET_TOKENS) {
    assert.ok(!json.toLowerCase().includes(token.toLowerCase()), `persisted payload leaked "${token}"`);
  }
});

test('every string in the persisted payload is a category name or a fixed label', () => {
  const out = aggregate(SENSITIVE);
  const allowed = new Set<string>([...CATEGORIES, 'reports.personal_context', out.ts]);
  const strings: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(out);
  for (const s of strings) assert.ok(allowed.has(s), `unexpected string in persisted payload: ${JSON.stringify(s)}`);
});

test('the payload is counts, and the counts add up', () => {
  const out = aggregate(SENSITIVE);
  assert.equal(out.total, SENSITIVE.length);
  assert.equal(
    out.categories.reduce((a, c) => a + c.n, 0),
    out.total,
  );
  for (const c of out.categories) assert.equal(typeof c.n, 'number');
});

test('buckets are the eight required ones and specific beats broad', () => {
  const cases: [string, Category][] = [
    ['should I resign before the appraisal at work', 'career'],
    ['shaadi ki date nikalwani hai', 'marriage'],
    ['breakup ke baad dobara message karun', 'relationships'],
    ['my mother is upset with the whole family', 'family'],
    ['father surgery scheduled next week', 'health'],
    ['home loan EMI aur property ka decision', 'money'],
    ['college admission and the entrance exam', 'study'],
    ['just curious about the app honestly', 'other'],
  ];
  for (const [text, expected] of cases) assert.equal(classify(text), expected, text);
  assert.deepEqual([...CATEGORIES].sort(), ['career', 'family', 'health', 'marriage', 'money', 'other', 'relationships', 'study']);
});

test('a father with surgery is health, not family — specific rule wins', () => {
  assert.equal(classify('papa ki surgery hai'), 'health');
  assert.equal(classify('papa se baat karni hai'), 'family');
});

test('trivial entries are not counted as demand', () => {
  const out = aggregate(['ok', '-', 'test', 'na']);
  assert.equal(out.total, 0);
  assert.deepEqual(out.categories, []);
});

test('the digest quotes nobody', () => {
  const digest = demandDigest();
  // Whether or not state/firstparty.json exists locally, the digest may never carry a quote.
  assert.ok(!/["“”]/.test(digest.replace(/never claim[^\n]*/i, '')), digest);
});
