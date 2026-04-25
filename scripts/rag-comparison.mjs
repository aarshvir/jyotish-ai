/**
 * BPHS RAG Impact Study
 * A/B comparison of nativity output with RAG off vs hybrid.
 *
 * Usage:
 *   node scripts/rag-comparison.mjs          # full pipeline (slow, ~10 min per run)
 *   node scripts/rag-comparison.mjs --direct  # direct nativity route only (fast, ~60s total)
 *
 * --direct mode bypasses the full report pipeline and calls /api/agents/nativity
 * directly with a hardcoded natal chart. Use this to debug RAG without pipeline noise.
 *
 * Requires dev server running on localhost:3000 and BYPASS_SECRET env var set.
 * Auto-writes results to scripts/rag-comparison-results.md.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIRECT_MODE = process.argv.includes('--direct');

const BASE   = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
const BYPASS = process.env.BYPASS_SECRET ?? 'VEDICADMIN2026';
// HEADERS is built lazily after BYPASS is validated in main()
const buildHeaders = () => ({ 'Content-Type': 'application/json', 'x-bypass-token': BYPASS });
let HEADERS = {};

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

// ── Direct mode: call /api/agents/nativity with a hardcoded natal chart ──────
// Bypasses the full pipeline — useful to diagnose whether nativity+RAG works
// independently of ephemeris, grids, commentary, and pipeline auth complexity.

// Virgo lagna chart with Jupiter in Kendra (Cancer, house 11→kendra) and
// Sun+Mercury in same sign → triggers Gajakesari + Budhaditya + Raja Yoga
// so yogaDetector returns multiple yogas → rich RAG context.
const DIRECT_NATAL_CHART = {
  lagna: 'Virgo',
  lagna_degree: 12.4,
  moon_nakshatra: 'Bharani',
  current_dasha: {
    mahadasha: 'Jupiter',
    antardasha: 'Mercury',
    start_date: '2024-01-01',
    end_date: '2026-06-01',
  },
  planets: {
    Sun:     { sign: 'Taurus', house: 9,  degree: 5.2,  nakshatra: 'Krittika',   nakshatra_pada: 4, is_retrograde: false },
    Moon:    { sign: 'Aries',  house: 8,  degree: 14.7, nakshatra: 'Bharani',    nakshatra_pada: 2, is_retrograde: false },
    Mars:    { sign: 'Cancer', house: 11, degree: 20.1, nakshatra: 'Pushya',     nakshatra_pada: 3, is_retrograde: false },
    Mercury: { sign: 'Taurus', house: 9,  degree: 22.3, nakshatra: 'Rohini',     nakshatra_pada: 1, is_retrograde: false },
    Jupiter: { sign: 'Cancer', house: 11, degree: 8.5,  nakshatra: 'Pushya',     nakshatra_pada: 1, is_retrograde: false },
    Venus:   { sign: 'Gemini', house: 10, degree: 3.1,  nakshatra: 'Mrigashira', nakshatra_pada: 4, is_retrograde: false },
    Saturn:  { sign: 'Scorpio',house: 3,  degree: 17.6, nakshatra: 'Jyeshtha',   nakshatra_pada: 2, is_retrograde: true  },
    Rahu:    { sign: 'Pisces', house: 7,  degree: 25.0, nakshatra: 'Revati',     nakshatra_pada: 4, is_retrograde: true  },
    Ketu:    { sign: 'Virgo',  house: 1,  degree: 25.0, nakshatra: 'Chitra',     nakshatra_pada: 2, is_retrograde: true  },
  },
  functional_lord_groups: {
    yogakarakas: ['Venus'],
    functional_benefics: ['Mercury', 'Venus'],
    functional_malefics: ['Mars', 'Jupiter'],
  },
};

async function runDirectNativity(tag, ragMode) {
  console.log(`\n[${tag}] Calling /api/agents/nativity directly (jyotishRagMode=${ragMode})`);
  const start = Date.now();

  let res;
  try {
    res = await fetch(`${BASE}/api/agents/nativity`, {
      method: 'POST',
      headers: { ...HEADERS },
      body: JSON.stringify({
        natalChart: DIRECT_NATAL_CHART,
        jyotishRagMode: ragMode,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error(`[${tag}] Fetch error:`, err.message);
    throw err;
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[${tag}] HTTP ${res.status} after ${elapsed}s: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const profile = data.data ?? data;
  console.log(`[${tag}] Done in ${elapsed}s — lagna_analysis: ${(profile?.lagna_analysis ?? '').length} chars, yogas: ${(profile?.yogas ?? []).length}`);
  return profile;
}

function buildDirectMarkdown(noRag, rag) {
  const noRagLA    = noRag?.lagna_analysis ?? '';
  const ragLA      = rag?.lagna_analysis ?? '';
  const noRagDasha = noRag?.current_dasha_interpretation ?? '';
  const ragDasha   = rag?.current_dasha_interpretation ?? '';
  const noRagYogas = noRag?.yogas ?? [];
  const ragYogas   = rag?.yogas ?? [];

  const yogaDescText = (yogas) =>
    yogas.map(y => typeof y === 'string' ? y : (y.description ?? '')).join(' ');

  const allNoRag = [noRagLA, noRagDasha, yogaDescText(noRagYogas)].join(' ');
  const allRag   = [ragLA,   ragDasha,   yogaDescText(ragYogas)].join(' ');

  const metrics = [
    ['Citations [[SOURCE:CH:V]]',     countCitations(allNoRag),         countCitations(allRag)],
    ['Scripture richness score',       scriptureRichness(allNoRag),       scriptureRichness(allRag)],
    ['Lagna analysis length (chars)',  noRagLA.length,                    ragLA.length],
    ['Dasha interpretation (chars)',   noRagDasha.length,                 ragDasha.length],
    ['Yogas returned',                 noRagYogas.length,                 ragYogas.length],
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

  const yogaLine = (yogas) => yogas.length
    ? yogas.map(y => typeof y === 'string' ? `- ${y}` : `- **${y.name}** (${y.strength}): ${y.description ?? ''}`).join('\n')
    : '(none)';

  return `# BPHS RAG Impact Analysis (direct nativity test)

${table}

## Lagna Analysis

### [BASELINE] RAG off
${snippet(noRagLA || '(empty)')}

### [AUGMENTED] Hybrid RAG
${snippet(ragLA || '(empty)')}

---

## Yoga Descriptions

### [BASELINE] RAG off
${yogaLine(noRagYogas)}

### [AUGMENTED] Hybrid RAG
${yogaLine(ragYogas)}
`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!BYPASS) {
    console.error('BYPASS_SECRET is empty. Set it or check .env.local.');
    process.exit(1);
  }
  HEADERS = buildHeaders();

  if (DIRECT_MODE) {
    console.log('=== BPHS RAG Impact Study (--direct mode) ===\n');
    console.log('Calling /api/agents/nativity directly with a hardcoded Virgo lagna chart.');
    console.log('This bypasses the full pipeline — fast diagnostic for RAG vs no-RAG.\n');

    let noRag, rag;
    try {
      noRag = await runDirectNativity('NO-RAG (off)', 'off');
    } catch (err) {
      console.error('NO-RAG direct call failed:', err.message);
      process.exit(1);
    }

    try {
      rag = await runDirectNativity('WITH-RAG (hybrid)', 'hybrid');
    } catch (err) {
      console.error('WITH-RAG direct call failed:', err.message);
      process.exit(1);
    }

    console.log('\n=== KEY DIFF ===');
    console.log('\nNO-RAG lagna_analysis (first 500 chars):');
    console.log((noRag?.lagna_analysis ?? '(empty)').slice(0, 500));
    console.log('\nWITH-RAG lagna_analysis (first 500 chars):');
    console.log((rag?.lagna_analysis ?? '(empty)').slice(0, 500));

    const md = buildDirectMarkdown(noRag, rag);
    const outPath = path.join(__dirname, 'rag-comparison-results.md');
    fs.writeFileSync(outPath, md, 'utf8');
    console.log(`\nResults written → ${outPath}`);
    return;
  }

  console.log('=== BPHS RAG Impact Study (full pipeline) ===\n');

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
