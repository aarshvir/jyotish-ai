/**
 * Accuracy QA (Phase 4). Calls the deterministic ephemeris service for a few
 * neutral reference charts and prints the facts to cross-check against AstroSage /
 * Jagannatha Hora: Lagna, Moon sign + nakshatra, current Vimshottari dasha, and the
 * Manglik / Sade Sati flags (same rules the deep-Kundali engine uses).
 *   node --env-file=.env.local --env-file=.env.vercel.production.local scripts/qa-charts.mjs
 */
// The local prod-env snapshot has a literal "\r\n" (escaped) appended — strip both
// the escaped sequence and real control chars/quotes before using the URL.
const EPH = (process.env.EPHEMERIS_SERVICE_URL || process.env.EPHEMERIS_API_URL || '')
  .replace(/\\[rn]/g, '').replace(/[\r\n"']/g, '').trim().replace(/\/$/, '');
if (!EPH) { console.error('No EPHEMERIS_SERVICE_URL set'); process.exit(1); }

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]); // Mars from Lagna (classical)

const CHARTS = [
  { name: 'Ref 1', birth_date: '1990-01-15', birth_time: '08:30:00', birth_city: 'New Delhi, India', birth_lat: 28.6139, birth_lng: 77.2090 },
  { name: 'Ref 2', birth_date: '1985-07-20', birth_time: '14:45:00', birth_city: 'Mumbai, India',     birth_lat: 19.0760, birth_lng: 72.8777 },
  { name: 'Ref 3', birth_date: '2000-11-05', birth_time: '23:10:00', birth_city: 'Chennai, India',    birth_lat: 13.0827, birth_lng: 80.2707 },
  { name: 'Ref 4', birth_date: '1995-03-22', birth_time: '06:15:00', birth_city: 'Kolkata, India',    birth_lat: 22.5726, birth_lng: 88.3639 },
];

async function natal(input) {
  const res = await fetch(`${EPH}/natal-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const todayISO = new Date().toISOString().slice(0, 10);

for (const c of CHARTS) {
  console.log('\n' + '='.repeat(64));
  console.log(`${c.name}: ${c.birth_date} ${c.birth_time} — ${c.birth_city}`);
  console.log('='.repeat(64));
  try {
    const chart = await natal(c);
    const moon = chart.planets?.Moon;
    const mars = chart.planets?.Mars;
    const moonIdx = SIGNS.indexOf(moon?.sign);

    // Sade Sati: today's Saturn sign vs Moon sign (Saturn in moon-1 / moon / moon+1)
    let sadeSati = 'unknown';
    try {
      const now = await natal({ ...c, birth_date: todayISO, birth_time: '12:00:00' });
      const satIdx = SIGNS.indexOf(now.planets?.Saturn?.sign);
      if (moonIdx >= 0 && satIdx >= 0) {
        const diff = ((satIdx - moonIdx + 12) % 12);
        sadeSati = (diff === 11 || diff === 0 || diff === 1)
          ? `YES (Saturn in ${now.planets.Saturn.sign}, phase ${diff === 11 ? '1st' : diff === 0 ? '2nd/peak' : '3rd'})`
          : `no (Saturn in ${now.planets.Saturn.sign})`;
      }
    } catch (e) { sadeSati = 'transit fetch failed'; }

    const manglik = mars ? (MANGLIK_HOUSES.has(mars.house) ? `YES (Mars in house ${mars.house} from Lagna)` : `no (Mars in house ${mars.house})`) : 'n/a';

    console.log(`  Lagna (Ascendant) : ${chart.lagna}  (${(chart.lagna_degree ?? 0).toFixed?.(2) ?? chart.lagna_degree}°)`);
    console.log(`  Moon sign (Rashi) : ${moon?.sign}`);
    console.log(`  Moon nakshatra    : ${moon?.nakshatra} (pada ${moon?.nakshatra_pada}) [chart.moon_nakshatra=${chart.moon_nakshatra}]`);
    console.log(`  Current dasha     : ${chart.current_dasha?.mahadasha} / ${chart.current_dasha?.antardasha}  (${chart.current_dasha?.start_date} → ${chart.current_dasha?.end_date})`);
    console.log(`  Sun sign          : ${chart.planets?.Sun?.sign}`);
    console.log(`  Manglik (Mangal)  : ${manglik}`);
    console.log(`  Sade Sati (now)   : ${sadeSati}`);
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}
console.log('\nCompare Lagna / Moon nakshatra / current dasha against AstroSage free Kundli for each.\n');
