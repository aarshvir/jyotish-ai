import { randomUUID } from 'crypto';
import fs from 'fs';

const BASE        = 'http://localhost:3000';
const BYPASS      = 'VEDICADMIN2026';
const HEADERS     = { 'Content-Type': 'application/json', 'x-bypass-token': BYPASS };

const CITIES = [
  { name: 'Mumbai, India', lat: 19.076, lng: 72.877, tz: 330 },
  { name: 'New York, USA', lat: 40.7128, lng: -74.006, tz: -240 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, tz: 60 },
  { name: 'Tokyo, Japan', lat: 35.6895, lng: 139.6917, tz: 540 },
  { name: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, tz: 240 }
];

function getRandomDate() {
  const start = new Date(1960, 0, 1);
  const end = new Date(2005, 11, 31);
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

async function main() {
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const birthDate = getRandomDate();
  const birthTime = `${String(Math.floor(Math.random()*24)).padStart(2,'0')}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}:00`;
  const reportId = randomUUID();

  const body = {
    reportId,
    name: 'Scout Native',
    birth_date: birthDate,
    birth_time: birthTime,
    birth_city: city.name,
    birth_lat: city.lat,
    birth_lng: city.lng,
    timezone_offset: city.tz,
    plan_type: '7day',
    payment_status: 'bypass',
    forceRestart: true
  };

  console.log(`[SCOUT] Triggering report ${reportId} for ${birthDate} ${birthTime} at ${city.name}`);
  
  const res = await fetch(`${BASE}/api/reports/start`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error(`[SCOUT] Failed to trigger: ${res.status}`);
    process.exit(1);
  }

  // Save the reportId for the Inspector
  fs.writeFileSync('scripts/last-scout-id.txt', reportId);
  console.log(`[SCOUT] Successfully triggered ${reportId}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[SCOUT] Error:', err);
  process.exit(1);
});
