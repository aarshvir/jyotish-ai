/**
 * BPHS / RAG A/B: run two full reports (jyotishRagMode=off vs hybrid), write JSON artifacts + markdown table.
 *
 * Requires: dev server, ephemeris, LLM keys, E2E bypass — same as test-report-e2e.mjs.
 *
 * Usage:
 *   E2E_BYPASS=secret node scripts/rag-compare.mjs [BASE_URL]
 *
 * Output: artifacts/rag-compare/<timestamp>/
 *   report-off.json, report-hybrid.json, metrics.json, table.md, excerpts.json
 */

import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { runReportUntilComplete } from './lib/e2e-pipeline.mjs';
import { sleep } from './lib/e2e-http.mjs';
import { computeRagMetrics, excerpt } from './lib/rag-metrics.mjs';

const envPath = resolve('.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

const BASE = process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:3000';
const BYPASS = process.env.E2E_BYPASS || process.env.BYPASS_SECRET || '';

const HEADERS = {
  'Content-Type': 'application/json',
  ...(BYPASS ? { 'x-bypass-token': BYPASS } : {}),
};

function baseBody(reportId) {
  return {
    reportId,
    name: 'RAG Compare User',
    birth_date: '1990-06-15',
    birth_time: '08:30:00',
    birth_city: 'Mumbai',
    birth_lat: '19.0760',
    birth_lng: '72.8777',
    current_city: 'Mumbai',
    current_lat: '19.0760',
    current_lng: '72.8777',
    timezone_offset: 330,
    plan_type: '7day',
    payment_status: 'bypass',
    forceRestart: true,
  };
}

/** Delete prior incomplete row if needed — force new id per mode. */
async function main() {
  if (!BYPASS) {
    console.error('E2E_BYPASS or BYPASS_SECRET is required.');
    process.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join('artifacts', 'rag-compare', ts);
  mkdirSync(outDir, { recursive: true });

  const modes = [
    { key: 'off', label: 'RAG off' },
    { key: 'hybrid', label: 'RAG hybrid (BPHS pgvector + keyword fallback)' },
  ];

  const runs = [];
  for (const { key, label } of modes) {
    const reportId = randomUUID();
    const input = { ...baseBody(reportId), jyotishRagMode: key };
    console.log(`\n--- Generating ${label} (${reportId}) — may take several minutes ---\n`);
    const { report, pollSeconds } = await runReportUntilComplete(BASE, HEADERS, input);
    const metrics = computeRagMetrics(report);
    const path = join(outDir, `report-${key}.json`);
    writeFileSync(path, JSON.stringify(report, null, 2), 'utf8');
    runs.push({ key, label, reportId, report, metrics, pollSeconds, path });
    // small gap so two parallel Inngest runs do not fight if reusing same server
    await sleep(2000);
  }

  const [offRun, hyRun] = runs;

  const tableRows = [
    ['Area', 'Metric', 'RAG off', 'RAG hybrid', 'Note'],
    [
      'Nativity',
      '[[...]] citations in lagna_analysis',
      offRun.metrics.nativity_lagna_citations,
      hyRun.metrics.nativity_lagna_citations,
      'Classical inline cites (prompt-driven); hybrid should access corpus.',
    ],
    [
      'Nativity',
      'unique citation keys (lagna)',
      offRun.metrics.nativity_lagna_unique_cites,
      hyRun.metrics.nativity_lagna_unique_cites,
      'Diversity of [[SOURCE:CH:VS]] tags',
    ],
    [
      'Nativity',
      'dasha text citations',
      offRun.metrics.nativity_dasha_citations,
      hyRun.metrics.nativity_dasha_citations,
      '',
    ],
    [
      'Synthesis',
      'opening_paragraph [[...]] count',
      offRun.metrics.synthesis_opening_citations,
      hyRun.metrics.synthesis_opening_citations,
      'Usually lower — synthesis may not echo cites',
    ],
    [
      'Days',
      'first day overview [[...]]',
      offRun.metrics.first_day_overview_citations,
      hyRun.metrics.first_day_overview_citations,
      'Daily overviews are mostly LLM+panchang (limited RAG in pipeline)',
    ],
    [
      'Hourly',
      'all slot [[...]] citations',
      offRun.metrics.all_slot_citations,
      hyRun.metrics.all_slot_citations,
      'Transitive / classical refs if model echoes them',
    ],
    [
      'Hourly',
      'identical slot blurb rate (0–1)',
      offRun.metrics.slot_identical_commentary_rate,
      hyRun.metrics.slot_identical_commentary_rate,
      'Should not get worse in hybrid; fallback leak detector',
    ],
  ];

  const md = [
    `# RAG compare (${ts})`,
    '',
    '| ' + tableRows[0].join(' | ') + ' |',
    '| ' + tableRows[0].map(() => '---').join(' | ') + ' |',
    ...tableRows.slice(1).map((row) => '| ' + row.join(' | ') + ' |'),
    '',
    '## Report IDs',
    `- off: \`${offRun.reportId}\``,
    `- hybrid: \`${hyRun.reportId}\``,
    '',
  ].join('\n');

  const firstDay0 = (r) => (r.report?.days && r.report.days[0]) || {};
  const slot0 = (r) => {
    const d = firstDay0(r);
    const s = d.slots && d.slots[0];
    return s;
  };
  const excerpts = {
    nativity_lagna: {
      off: excerpt(offRun.report?.nativity?.lagna_analysis, 450),
      hybrid: excerpt(hyRun.report?.nativity?.lagna_analysis, 450),
    },
    first_day_overview: {
      off: excerpt(firstDay0(offRun).overview, 450),
      hybrid: excerpt(firstDay0(hyRun).overview, 450),
    },
    first_slot_commentary: {
      off: excerpt(slot0(offRun)?.commentary, 450),
      hybrid: excerpt(slot0(hyRun)?.commentary, 450),
    },
  };

  writeFileSync(join(outDir, 'table.md'), md, 'utf8');
  writeFileSync(
    join(outDir, 'metrics.json'),
    JSON.stringify(
      { off: offRun.metrics, hybrid: hyRun.metrics, pollSeconds: { off: offRun.pollSeconds, hybrid: hyRun.pollSeconds } },
      null,
      2,
    ),
    'utf8',
  );
  writeFileSync(join(outDir, 'excerpts.json'), JSON.stringify(excerpts, null, 2), 'utf8');
  writeFileSync(join(outDir, 'README.txt'), 'See table.md, metrics.json, report-off.json, report-hybrid.json\n', 'utf8');

  console.log(`\nDone. Artifacts: ${outDir}\n`);
  console.log(md);
  console.log('\nexcerpts.json (nativity lagna, truncated):\n', JSON.stringify(excerpts.nativity_lagna, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
