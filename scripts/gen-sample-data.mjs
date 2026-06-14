/**
 * Generates REAL, verified astrological data for the public "sample" surfaces
 * (landing forecast + timing grid + nativity + dasha) by calling the live
 * deterministic ephemeris. Output is hand-baked into the sample components so
 * what visitors see is accurate engine output, not invented numbers.
 *
 *   node scripts/gen-sample-data.mjs
 */
const EPH = (process.env.SAMPLE_EPH_URL || 'https://jyotish-ai-feb-26-production.up.railway.app').replace(/\/$/, '');
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

async function natal(input) {
  const res = await fetch(`${EPH}/natal-chart`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`natal HTTP ${res.status}: ${(await res.text()).slice(0,200)}`);
  return res.json();
}
async function grid(body) {
  const res = await fetch(`${EPH}/generate-daily-grid`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`grid HTTP ${res.status}: ${(await res.text()).slice(0,200)}`);
  return res.json();
}

// Fixed sample birthplace/date; sweep birth time to land a clean Cancer lagna.
const BASE = { birth_date: '1992-06-15', birth_city: 'New Delhi, India', birth_lat: 28.6139, birth_lng: 77.2090 };

async function findCancerLagna() {
  const hits = [];
  for (let mins = 5 * 60; mins <= 13 * 60; mins += 20) {
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const t = `${hh}:${mm}:00`;
    try {
      const c = await natal({ ...BASE, birth_time: t });
      if (c.lagna === 'Cancer') hits.push({ t, deg: c.lagna_degree, chart: c });
      process.stdout.write(`${t}=${c.lagna}(${(c.lagna_degree||0).toFixed(1)}) `);
    } catch (e) { process.stdout.write(`${t}=ERR `); }
  }
  console.log('');
  if (!hits.length) throw new Error('No Cancer lagna found in sweep window');
  // Pick the hit with degree closest to 15 (solidly mid-sign).
  hits.sort((a, b) => Math.abs(a.deg - 15) - Math.abs(b.deg - 15));
  return hits[0];
}

const pick = (p) => ({ sign: p.sign, house: p.house, nakshatra: p.nakshatra, pada: p.nakshatra_pada, degree: p.degree });

const run = async () => {
  console.log(`EPH=${EPH}`);
  const best = await findCancerLagna();
  const c = best.chart;
  console.log(`\nLOCKED sample birth: ${BASE.birth_date} ${best.t} ${BASE.birth_city}  → Lagna Cancer ${best.deg.toFixed(2)}°`);

  const facts = {
    birth: { ...BASE, birth_time: best.t },
    lagna: c.lagna, lagna_degree: round2(c.lagna_degree),
    moon: pick(c.planets.Moon), sun: pick(c.planets.Sun),
    lagnaLord_moon_house: c.planets.Moon.house,
    current_dasha: c.current_dasha,
    dasha_sequence: c.dasha_sequence.map((d) => ({
      planet: d.planet, start: d.start_date, end: d.end_date,
      start_year: d.start_date.slice(0, 4), end_year: d.end_date.slice(0, 4),
    })),
  };
  console.log('\n=== NATAL FACTS ===');
  console.log(JSON.stringify(facts, null, 2));

  // Representative daily grid for Bangalore (current city), fixed sample day.
  const gridDate = '2026-06-15';
  const g = await grid({
    date: gridDate, current_lat: 12.9716, current_lng: 77.5946,
    timezone_offset_minutes: 330, natal_lagna_sign_index: SIGNS.indexOf(c.lagna),
  });
  const slots = g.slots.map((s) => ({
    label: s.display_label, hora: s.dominant_hora, chog: s.dominant_choghadiya, score: s.score,
  }));
  console.log(`\n=== DAILY GRID (Bangalore ${gridDate}, day_score=${g.day_score}) ===`);
  console.log(JSON.stringify({ day_score: g.day_score, panchang: g.panchang, slots }, null, 2));
};

function round2(n) { return Math.round((n || 0) * 100) / 100; }
run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
