/**
 * Generates REAL Gun Milan (Ashtakoot) for two sample partners + the sample
 * seeker's real doshas (Manglik, Sade Sati), using the SAME engine + scoring the
 * product uses. Output is baked into the Matchmaking + Kundli sample surfaces.
 *
 *   npx tsx scripts/gen-sample-synastry.ts
 */
import { computeAshtakoot, longitudeToNakshatraIndex } from '../src/lib/synastry/ashtakoot';

const EPH = 'https://jyotish-ai-feb-26-production.up.railway.app';
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

async function natal(input: Record<string, unknown>) {
  const res = await fetch(`${EPH}/natal-chart`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`natal HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const A = { name: 'Aarav', birth_date: '1992-06-15', birth_time: '09:00:00', birth_city: 'New Delhi, India', birth_lat: 28.6139, birth_lng: 77.2090 };

function moonLon(chart: any): number {
  return SIGNS.indexOf(chart.planets.Moon.sign) * 30 + chart.planets.Moon.degree;
}

const run = async () => {
  const ca = await natal(A);
  const aArgs = {
    moonNakshatraIndexA: longitudeToNakshatraIndex(moonLon(ca)),
    moonSignIndexA: SIGNS.indexOf(ca.planets.Moon.sign),
  };

  // Sweep partner birth date (~1 nakshatra/day) to find a genuinely compatible
  // pair — still 100% real engine output, just a better-chosen example.
  let best: any = null;
  for (let d = 0; d < 28; d++) {
    const day = String(1 + (d % 28)).padStart(2, '0');
    const Bc = { name: 'Diya', birth_date: `1994-02-${day}`, birth_time: '18:30:00', birth_city: 'Mumbai, India', birth_lat: 19.0760, birth_lng: 72.8777 };
    try {
      const cb = await natal(Bc);
      const res = computeAshtakoot({
        ...aArgs,
        moonNakshatraIndexB: longitudeToNakshatraIndex(moonLon(cb)),
        moonSignIndexB: SIGNS.indexOf(cb.planets.Moon.sign),
      });
      process.stdout.write(`${Bc.birth_date}=${res.total} `);
      if (!best || res.total > best.res.total) best = { Bc, cb, res };
    } catch { process.stdout.write(`${Bc.birth_date}=ERR `); }
  }
  console.log('\n');

  const { Bc, cb, res } = best;
  console.log('=== SYNASTRY (Gun Milan) — best example pair ===');
  console.log(`A ${A.name}: ${A.birth_date} → Moon ${ca.planets.Moon.sign} ${ca.planets.Moon.nakshatra}`);
  console.log(`B ${Bc.name}: ${Bc.birth_date} → Moon ${cb.planets.Moon.sign} ${cb.planets.Moon.nakshatra}`);
  console.log(JSON.stringify(res, null, 2));

  // Sample-seeker (A) doshas — same rules the deep-Kundali engine uses.
  const today = new Date().toISOString().slice(0, 10);
  const nowA = await natal({ ...A, birth_date: today, birth_time: '12:00:00' });
  const moonIdx = SIGNS.indexOf(ca.planets.Moon.sign);
  const satIdx = SIGNS.indexOf(nowA.planets.Saturn.sign);
  const diff = (satIdx - moonIdx + 12) % 12;
  const sadeSati = diff === 11 || diff === 0 || diff === 1;
  const marsHouse = ca.planets.Mars.house;

  console.log('\n=== KUNDLI DOSHAS (sample seeker A) ===');
  console.log(JSON.stringify({
    lagna: ca.lagna,
    mars: { sign: ca.planets.Mars.sign, house: marsHouse },
    manglik: MANGLIK_HOUSES.has(marsHouse),
    saturn_now: nowA.planets.Saturn.sign,
    sade_sati: sadeSati ? `yes (phase ${diff === 11 ? 'rising' : diff === 0 ? 'peak' : 'setting'})` : 'no',
    jupiter: { sign: ca.planets.Jupiter.sign, house: ca.planets.Jupiter.house },
    saturn_natal: { sign: ca.planets.Saturn.sign, house: ca.planets.Saturn.house },
    rahu: { sign: ca.planets.Rahu.sign, house: ca.planets.Rahu.house },
  }, null, 2));
};

run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
