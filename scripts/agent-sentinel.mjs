import fs from 'fs';

/**
 * Sentinel Agent
 * Validates the quality of the report JSON produced by the Inspector.
 */

const PASS = (msg) => console.log(`  ✅  ${msg}`);
const FAIL = (msg) => { console.error(`  ❌  ${msg}`); };

function validate(report) {
  let failures = 0;

  console.log('\n--- Sentinel Quality Checks ---');

  // 1. Structure
  if (!report.nativity || !report.days || !report.months || !report.weeks) {
    FAIL('Missing core sections');
    failures++;
  } else {
    PASS('Core sections present');
  }

  // 2. Nativity Grounding
  const natText = (report.nativity.lagna_analysis || '') + ' ' + (report.nativity.current_dasha_interpretation || '');
  const citations = natText.match(/\[\[SOURCE:.*?\]\]/g) || [];
  if (citations.length > 0) {
    PASS(`Classical citations found: ${citations.length}`);
  } else {
    // Note: This might happen if RAG is disabled in Analyst mode, but for Sentinel it's a warning/fail
    console.warn('  ⚠️   No classical citations [[SOURCE:...]] found');
  }

  // 3. Data Integrity
  if (report.days.length < 7) {
    FAIL(`Insufficient days: ${report.days.length}`);
    failures++;
  } else {
    PASS(`Days count valid: ${report.days.length}`);
  }

  const allSlots = report.days.flatMap(d => d.slots || []);
  const thinSlots = allSlots.filter(s => (s.commentary || '').length < 40).length;
  if (thinSlots > 10) {
    FAIL(`Too many thin slots (<40 chars): ${thinSlots}`);
    failures++;
  } else {
    PASS(`Slot commentary depth OK (thin: ${thinSlots})`);
  }

  // 4. Score Diversity
  const scores = allSlots.map(s => s.score || 50);
  const range = Math.max(...scores) - Math.min(...scores);
  if (range < 10) {
    FAIL(`Scores too homogeneous (range: ${range})`);
    failures++;
  } else {
    PASS(`Score diversity OK (range: ${range})`);
  }

  return failures;
}

async function main() {
  if (!fs.existsSync('scripts/last-report.json')) {
    console.error('[SENTINEL] No report data found from Inspector');
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync('scripts/last-report.json', 'utf8'));
  const failures = validate(report);

  if (failures === 0) {
    console.log('\n[SENTINEL] Quality Gate: PASSED');
    process.exit(0);
  } else {
    console.error(`\n[SENTINEL] Quality Gate: FAILED (${failures} issues)`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[SENTINEL] Error:', err);
  process.exit(1);
});
