/**
 * BPHS RAG Impact Study
 * A/B comparison of nativity output with RAG off vs hybrid to measure the
 * "Grandmaster" scripture-grounding improvement.
 *
 * Usage:
 *   node scripts/rag-comparison.mjs
 *
 * Requires dev server running on localhost:3000 and a valid BYPASS_SECRET.
 * Auto-writes results to scripts/rag-comparison-results.md.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE   = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
const BYPASS = process.env.BYPASS_SECRET ?? 'VEDICADMIN2026';
const HEADERS = { 'Content-Type': 'application/json', 'x-bypass-token': BYPASS };

// Sagittarius lagna (1985-05-20 14:20 Delhi) — Mercury-Venus dasha active.
// Expect Gajakesari, Budhaditya, Raja Yoga from yogaDetector → rich RAG context.
const BIRTH = {
  name:            'Impact Analysis Native',
  birth_date:      '1985-05-20',
  birth_time:      '14:20:00',
  birth_city:      'Delhi, India',
  birth_lat:       28.6139,
  birth_lng:       77.2090,
  current_city:    'New York, USA',
  current_lat:     40.7128,
  current_lng:     -74.0060,
  timezone_offset: -240,
  plan_type:       '7day',
  payment_status:  'bypass',
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts.headers ?? {}) } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Trigger a report with the given RAG mode and poll until complete.
 * Returns the full report_data object from the DB.
 *
 * @param {string} tag   - label for log output
 * @param {'off'|'keyword'|'hybrid'} ragMode
 */
async function runReport(tag, ragMode) {
  const reportId = randomUUID();
  console.log(`\n[${tag}] Starting report ${reportId}  (jyotishRagMode=${ragMode})`);

  await fetchJSON(`${BASE}/api/reports/start`, {
    method: 'POST',
    body: JSON.stringify({
      reportId,
      ...BIRTH,
      forceRestart: true,
      jyotishRagMode: ragMode,
    }),
  });

  const MAX_WAIT_MS = 12 * 60 * 1000;
  const POLL_MS     = 6_000;
  const start       = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_MS));
    const poll = await fetchJSON(`${BASE}/api/reports/${reportId}/status`);

    if (poll.status === 'complete' && poll.report) {
      const la = poll.report?.nativity?.lagna_analysis ?? '';
      console.log(`[${tag}] Done — lagna_analysis: ${la.length} chars`);
      return poll.report;
    }

    if (poll.status === 'error') {
      throw new Error(`[${tag}] Report ${reportId} errored on server`);
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[${tag}] Still generating… (${elapsed}s)`);
  }

  throw new Error(`[${tag}] Timed out after ${MAX_WAIT_MS / 60_000} minutes`);
}

// ── Metrics helpers ──────────────────────────────────────────────────────────

/** Count [[BPHS:X:Y]] / [[PHAL:...]] inline scripture citations. */
function countCitations(text = '') {
  return (text.match(/\[\[(?:BPHS|PHAL|JAIMINI|UPADESHA):[^\]]+\]\]/g) ?? []).length;
}

const SCRIPTURE_MARKERS = [
  'classical', 'ancient', 'scripture', 'vedic text', 'bphs', 'brihat parashara',
  'phaladeepika', 'jaimini', 'shastra', 'verse', 'chapter', 'parashari',
  'authoritative', 'texts single', 'texts describe',
];

/** Count how many distinct scripture-referencing phrases appear. */
function scriptureRichness(text = '') {
  const lo = text.toLowerCase();
  return SCRIPTURE_MARKERS.filter(m => lo.includes(m)).length;
}

/** Is this the hardcoded fallback produced when the LLM failed? */
function isFallback(text = '') {
  return (
    text.includes("shapes the native's fundamental disposition. The") &&
    text.length < 350
  );
}

/**
 * Pull the yoga array from wherever the report stored it.
 * NativityProfile.yogas lives under nativity.profile.yogas (full structured).
 * Simpler string list may be under nativity.key_yogas.
 */
function getYogas(report) {
  return report?.nativity?.profile?.yogas ?? report?.nativity?.key_yogas ?? [];
}

// ── Results markdown builder ─────────────────────────────────────────────────

function buildMarkdown(noRagReport, ragReport) {
  const noRagLA    = noRagReport?.nativity?.lagna_analysis ?? '';
  const ragLA      = ragReport?.nativity?.lagna_analysis ?? '';
  const noRagDasha = noRagReport?.nativity?.current_dasha_interpretation ?? '';
  const ragDasha   = ragReport?.nativity?.current_dasha_interpretation ?? '';

  const noRagYogas = getYogas(noRagReport);
  const ragYogas   = getYogas(ragReport);

  const yogaText = (yogas) => yogas
    .map(y => typeof y === 'string' ? y : `**${y.name ?? '?'}** (${y.strength ?? '?'}): ${y.description ?? ''}`)
    .join('\n- ');

  const allNoRagText = [noRagLA, noRagDasha, ...noRagYogas.map(y => y?.description ?? y ?? '')].join(' ');
  const allRagText   = [ragLA,   ragDasha,   ...ragYogas.map(y => y?.description ?? y ?? '')].join(' ');

  const metrics = [
    ['Citations [[SOURCE:CH:V]]',     countCitations(allNoRagText),        countCitations(allRagText)],
    ['Scripture richness score',       scriptureRichness(allNoRagText),      scriptureRichness(allRagText)],
    ['Lagna analysis length (chars)',  noRagLA.length,                       ragLA.length],
    ['Dasha interpretation (chars)',   noRagDasha.length,                    ragDasha.length],
    ['Yogas returned',                 noRagYogas.length,                    ragYogas.length],
    ['Is fallback text',               isFallback(noRagLA) ? 'YES ⚠' : 'No', isFallback(ragLA) ? 'YES ⚠' : 'No'],
  ];

  const table = [
    '| Metric | Baseline (RAG off) | Augmented (BPHS hybrid RAG) | Delta |',
    '| :--- | :--- | :--- | :--- |',
    ...metrics.map(([label, a, b]) => {
      const delta = typeof a === 'number' && typeof b === 'number'
        ? (b - a >= 0 ? `+${b - a}` : String(b - a))
        : '—';
      return `| **${label}** | ${a} | ${b} | ${delta} |`;
    }),
  ].join('\n');

  const snippet = (text, maxChars = 500) =>
    `> "${text.slice(0, maxChars)}${text.length > maxChars ? '…' : ''}"`;

  return `# BPHS RAG Impact Analysis

${table}

## Output Demonstration

### [BASELINE] Lagna Analysis (RAG off)
${snippet(noRagLA || '(empty)')}

### [AUGMENTED] Lagna Analysis (hybrid RAG)
${snippet(ragLA || '(empty)')}

---

### [BASELINE] Yoga Descriptions
${noRagYogas.length ? `- ${yogaText(noRagYogas)}` : '(none)'}

### [AUGMENTED] Yoga Descriptions
${ragYogas.length ? `- ${yogaText(ragYogas)}` : '(none)'}
`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== BPHS RAG Impact Study ===\n');

  let noRagReport, ragReport;

  try {
    noRagReport = await runReport('NO-RAG (off)', 'off');
  } catch (err) {
    console.error('NO-RAG run failed:', err.message);
    process.exit(1);
  }

  try {
    ragReport = await runReport('WITH-RAG (hybrid)', 'hybrid');
  } catch (err) {
    console.error('WITH-RAG run failed:', err.message);
    process.exit(1);
  }

  console.log('\n=== KEY DIFF ===');
  console.log('\nNO-RAG lagna_analysis (first 400 chars):');
  console.log((noRagReport?.nativity?.lagna_analysis ?? '(empty)').slice(0, 400));
  console.log('\nWITH-RAG lagna_analysis (first 400 chars):');
  console.log((ragReport?.nativity?.lagna_analysis ?? '(empty)').slice(0, 400));

  console.log('\nNO-RAG yogas:');
  console.log(JSON.stringify(getYogas(noRagReport), null, 2));
  console.log('\nWITH-RAG yogas:');
  console.log(JSON.stringify(getYogas(ragReport), null, 2));

  const md = buildMarkdown(noRagReport, ragReport);
  const outPath = path.join(__dirname, 'rag-comparison-results.md');
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`\nResults written → ${outPath}`);
}

main();
