import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'https://www.vedichour.com';
const checks = [];
async function check(path, verify, options) {
  const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  verify(response, text);
  checks.push({ path, status: response.status, passed: true });
}
await check('/api/geo', (r, t) => {
  assert.equal(r.status, 200);
  const data = JSON.parse(t);
  assert.equal(data.checkoutEnabled, false);
  assert.deepEqual(data.prices, {});
});
await check('/api/quiz/offer', (r, t) => {
  assert.equal(r.status, 200);
  assert.equal(JSON.parse(t).checkoutEnabled, false);
  assert.equal(JSON.parse(t).blueprintOpen, false);
});
await check('/q/not-a-configured-slug', (r, t) => {
  assert.equal(r.status, 200);
  assert(t.includes('New paid readings are currently unavailable'));
  assert(!/type="(?:date|time)"/.test(t));
});
await check('/hora', (r, t) => {
  assert.equal(r.status, 200);
  assert(!t.includes('to see a sample hour-by-hour grid for'));
  assert(t.includes('currently unavailable'));
});
await check('/llms-full.txt', (r, t) => {
  assert.equal(r.status, 200);
  assert(t.includes('New paid readings are currently unavailable'));
  assert(!t.includes('https://www.vedichour.com\r'));
});
const person = { birth_date: '1990-05-15', birth_time: '09:30:00', birth_city: 'New Delhi, India', birth_lat: 28.6139, birth_lng: 77.209 };
await check('/api/tools/chart', (r, t) => {
  assert.equal(r.status, 422);
  assert.equal(JSON.parse(t).code, 'UNKNOWN_TIME');
  assert.equal(r.headers.get('cache-control'), 'no-store');
}, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person: { ...person, birth_time_accuracy: 'unknown' } }) });
await check('/api/tools/chart', (r) => {
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('cache-control'), 'no-store');
}, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person: { ...person, birth_date: '1990-02-30', birth_time_accuracy: 'known' } }) });
const receipt = { base, executedAt: new Date().toISOString(), scope: 'Public availability and rejected fictional inputs only; no account/payment/model/lead mutations', checks };
await mkdir('artifacts/customer-experience/live', { recursive: true });
await writeFile('artifacts/customer-experience/live/server-boundaries.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ base, executed: checks.length, passed: checks.length }));
