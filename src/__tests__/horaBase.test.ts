/**
 * Parity tests for `computeHoraBaseForLagna` / `getBadhakaLord` vs Python `ephemeris-service/main.py`.
 *
 * Run: npx tsx src/__tests__/horaBase.test.ts
 */

import { computeHoraBaseForLagna, getBadhakaLord } from '../lib/engine/horaBase';

/** Snapshot from Python `compute_hora_base_for_lagna(i)` (2026-04). */
const PYTHON_HORA_BASE: Record<number, Record<string, number>> = {
  0: { Sun: 54, Moon: 46, Mars: 56, Mercury: 40, Jupiter: 62, Venus: 46, Saturn: 42 },
  1: { Sun: 46, Moon: 40, Mars: 46, Mercury: 54, Jupiter: 28, Venus: 56, Saturn: 62 },
  2: { Sun: 40, Moon: 46, Mars: 42, Mercury: 56, Jupiter: 42, Venus: 54, Saturn: 28 },
  3: { Sun: 46, Moon: 56, Mars: 62, Mercury: 34, Jupiter: 62, Venus: 42, Saturn: 28 },
  4: { Sun: 56, Moon: 34, Mars: 62, Mercury: 46, Jupiter: 28, Venus: 46, Saturn: 46 },
  5: { Sun: 34, Moon: 42, Mars: 28, Mercury: 56, Jupiter: 42, Venus: 54, Saturn: 54 },
  6: { Sun: 42, Moon: 46, Mars: 46, Mercury: 62, Jupiter: 40, Venus: 56, Saturn: 62 },
  7: { Sun: 46, Moon: 42, Mars: 56, Mercury: 28, Jupiter: 54, Venus: 46, Saturn: 46 },
  8: { Sun: 54, Moon: 28, Mars: 54, Mercury: 42, Jupiter: 56, Venus: 42, Saturn: 46 },
  9: { Sun: 28, Moon: 46, Mars: 42, Mercury: 62, Jupiter: 34, Venus: 62, Saturn: 56 },
  10: { Sun: 46, Moon: 38, Mars: 46, Mercury: 28, Jupiter: 46, Venus: 62, Saturn: 56 },
  11: { Sun: 38, Moon: 54, Mars: 54, Mercury: 42, Jupiter: 56, Venus: 28, Saturn: 42 },
};

const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(msg);
    console.error(`  FAIL: ${msg}`);
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n  ${name}`);
  try {
    fn();
  } catch (e) {
    failed++;
    const m = e instanceof Error ? e.message : String(e);
    failures.push(`${name}: threw ${m}`);
    console.error(`  FAIL (throw): ${name}: ${m}`);
  }
}

test('Python parity: all 12 lagnas × 7 grahas', () => {
  for (let lagna = 0; lagna < 12; lagna++) {
    const ts = computeHoraBaseForLagna(lagna);
    const py = PYTHON_HORA_BASE[lagna]!;
    for (const p of GRAHAS) {
      assert(
        ts[p] === py[p],
        `lagna=${lagna} ${p}: TS=${ts[p]} Python=${py[p]}`
      );
    }
  }
});

test('Cancer (3) — key references', () => {
  const b = computeHoraBaseForLagna(3);
  assert(b.Moon === 56, 'Moon lagna lord');
  assert(b.Mars === 62, 'Mars yogakaraka');
  assert(b.Sun === 46, 'Sun 2nd lord');
  assert(b.Saturn === 28, 'Saturn 8th involvement');
  assert(b.Jupiter === 62, 'Jupiter 9th+6th special');
  assert(b.Mercury === 34, 'Mercury 3+12 dusthana pair');
});

test('Scorpio (7)', () => {
  const b = computeHoraBaseForLagna(7);
  assert(b.Mars === 56, 'Mars lagna lord');
  assert(b.Mercury === 28, 'Mercury 8th');
  assert(b.Saturn === 46, 'Saturn kendra');
});

test('Taurus (1) — Saturn yogakaraka', () => {
  const b = computeHoraBaseForLagna(1);
  assert(b.Saturn === 62, 'Saturn yogakaraka');
  assert(b.Venus === 56, 'Venus lagna lord');
});

test('Badhaka lords (Python)', () => {
  assert(getBadhakaLord(3) === 'Venus', 'Cancer movable → 11th');
  assert(getBadhakaLord(7) === 'Moon', 'Scorpio fixed → 9th');
  assert(getBadhakaLord(1) === 'Saturn', 'Taurus fixed → 9th (Capricorn)');
});

test('All lagnas: scores in [28, 62]', () => {
  for (let i = 0; i < 12; i++) {
    const base = computeHoraBaseForLagna(i);
    for (const p of GRAHAS) {
      assert(base[p] >= 28 && base[p] <= 62, `lagna ${i} ${p}=${base[p]} out of range`);
    }
  }
});

console.log('\n────────────────────────────────────────');
console.log(`horaBase tests: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
process.exit(0);
