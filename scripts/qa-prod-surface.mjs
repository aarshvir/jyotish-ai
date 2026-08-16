/**
 * Production surface QA — curl-style checks for live vedichour.com
 * Usage: node scripts/qa-prod-surface.mjs
 */
const BASE = 'https://www.vedichour.com';

const PERSON = {
  birth_date: '1990-06-15',
  birth_time: '08:30:00',
  birth_city: 'Mumbai, India',
  birth_lat: 28.6139,
  birth_lng: 77.2090,
};

const PARTNER_A = { ...PERSON, birth_lat: 19.0760, birth_lng: 72.8777 };
const PARTNER_B = {
  birth_date: '1992-09-10',
  birth_time: '14:00:00',
  birth_city: 'Delhi, India',
  birth_lat: 28.6139,
  birth_lng: 77.2090,
};

const HTML_PAGES = [
  { path: '/', keyword: 'Vedic', label: 'Home' },
  { path: '/free-kundli', keyword: 'Free Kundli', label: 'Free Kundli' },
  { path: '/kundali', keyword: 'Kundli Analysis', label: 'Kundali' },
  { path: '/synastry', keyword: 'Gun Milan', label: 'Synastry' },
  { path: '/pricing', keyword: 'Free Kundli', label: 'Pricing' },
  { path: '/manglik-dosha-calculator', keyword: 'Manglik Dosha Calculator', label: 'Manglik calc' },
  { path: '/sade-sati-calculator', keyword: 'Sade Sati Calculator', label: 'Sade Sati calc' },
  { path: '/vimshottari-dasha-calculator', keyword: 'Vimshottari Dasha Calculator', label: 'Dasha calc' },
  { path: '/nakshatra-finder', keyword: 'Nakshatra Finder', label: 'Nakshatra finder' },
  { path: '/moon-sign-calculator', keyword: 'Moon Sign', label: 'Moon sign calc' },
  { path: '/lagna-calculator', keyword: 'Lagna', label: 'Lagna calc' },
  { path: '/kaal-sarp-dosha-calculator', keyword: 'Kaal Sarp', label: 'Kaal Sarp calc' },
  { path: '/horoscope/aries', keyword: 'aries', label: 'Horoscope Aries' },
  { path: '/transit/jupiter/cancer', keyword: 'Jupiter', label: 'Transit Jupiter Cancer' },
  { path: '/privacy', keyword: 'Privacy Policy', label: 'Privacy' },
  { path: '/terms', keyword: 'Terms of Service', label: 'Terms' },
  { path: '/refund', keyword: 'Refund Policy', label: 'Refund' },
];

const NOINDEX_PAGES = [
  '/kundali/test-id',
  '/synastry/test-id',
  '/report/test-id',
];

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

async function main() {
  // Health
  try {
    const { status, text } = await fetchText(`${BASE}/api/health`);
    const json = JSON.parse(text);
    const ok =
      status === 200 &&
      (json.status === 'healthy' || json.status === 'degraded') &&
      Array.isArray(json.blockers) &&
      json.blockers.length === 0;
    record('GET /api/health', ok, ok ? `status=${json.status}` : `HTTP ${status} ${text.slice(0, 120)}`);
  } catch (e) {
    record('GET /api/health', false, e.message);
  }

  // Static files
  for (const p of ['/sitemap.xml', '/robots.txt', '/llms.txt']) {
    try {
      const { status, text } = await fetchText(`${BASE}${p}`);
      record(`GET ${p}`, status === 200 && text.length > 10, `HTTP ${status}, len=${text.length}`);
    } catch (e) {
      record(`GET ${p}`, false, e.message);
    }
  }

  // API teasers
  try {
    const res = await fetch(`${BASE}/api/kundali/teaser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person: PERSON }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json();
    const ok = res.status === 200 && json.lagna && json.moon_sign;
    record('POST /api/kundali/teaser', ok, ok ? `lagna=${json.lagna} moon=${json.moon_sign}` : JSON.stringify(json).slice(0, 150));
  } catch (e) {
    record('POST /api/kundali/teaser', false, e.message);
  }

  try {
    const res = await fetch(`${BASE}/api/synastry/teaser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerA: PARTNER_A, partnerB: PARTNER_B }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json();
    const total = json.total ?? json.ashtakoot?.total;
    const ok = res.status === 200 && typeof total === 'number';
    record('POST /api/synastry/teaser', ok, ok ? `total=${total}/36` : JSON.stringify(json).slice(0, 150));
  } catch (e) {
    record('POST /api/synastry/teaser', false, e.message);
  }

  try {
    const res = await fetch(`${BASE}/api/tools/chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person: PERSON }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json();
    // Anonymous callers get the free facts; the three dosha verdicts are soft-gated
    // behind an email (see src/lib/kundli/doshaGate.ts), so `doshas` must be null here.
    const ok = res.status === 200 && json.current_dasha && json.doshas === null && json.doshas_locked === true;
    record('POST /api/tools/chart', ok, ok ? 'facts free, doshas gated' : JSON.stringify(json).slice(0, 150));
  } catch (e) {
    record('POST /api/tools/chart', false, e.message);
  }

  // HTML pages
  for (const page of HTML_PAGES) {
    try {
      const { status, text } = await fetchText(`${BASE}${page.path}`);
      const hasKw = text.toLowerCase().includes(page.keyword.toLowerCase());
      const ok = status === 200 && hasKw;
      record(`GET ${page.path} H1`, ok, ok ? `keyword "${page.keyword}" found` : `HTTP ${status}, keyword missing`);
    } catch (e) {
      record(`GET ${page.path} H1`, false, e.message);
    }
  }

  // noindex private pages
  for (const path of NOINDEX_PAGES) {
    try {
      const { status, text } = await fetchText(`${BASE}${path}`);
      const hasNoindex = /noindex/i.test(text);
      const ok = status === 200 && hasNoindex;
      record(`GET ${path} noindex`, ok, ok ? 'noindex present' : `HTTP ${status}, noindex=${hasNoindex}`);
    } catch (e) {
      record(`GET ${path} noindex`, false, e.message);
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.log('Failures:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
