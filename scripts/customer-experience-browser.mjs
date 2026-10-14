import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:3100';
const phase = process.argv[3] || 'after';
const out = path.resolve('artifacts/customer-experience', phase);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const journeys = [];
const routes = ['/', '/free-kundli', '/moon-sign-calculator', '/synastry', '/kundali', '/pricing', '/sample-report', '/start', '/login', '/privacy', '/chart-privacy', '/methodology', '/blog/kundli-without-birth-time', '/help', '/help/free-birth-chart', '/help/birth-time', '/help/compatibility'];

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await context.route(/google-analytics|googletagmanager|connect\.facebook|facebook\.com\/tr|posthog\.com/, (route) => route.abort());
  for (const route of routes) {
    const errors = [];
    const capture = (err) => errors.push(err.message);
    page.on('pageerror', capture);
    try {
      const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.screenshot({ path: path.join(out, `${viewport.width}-${route.replaceAll('/', '_') || 'home'}.png`), fullPage: true });
      if (['/', '/free-kundli', '/help', '/pricing'].includes(route)) await page.screenshot({ path: path.join(out, `${viewport.width}-${route.replaceAll('/', '_') || 'home'}-viewport.png`) });
      const info = await page.evaluate(() => ({
        title: document.title,
        headings: [...document.querySelectorAll('h1')].map((h) => h.textContent?.trim()),
        main: document.querySelectorAll('main').length,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        timeDefaults: [...document.querySelectorAll('input[type=time]')].map((e) => e.value),
        buttons: [...document.querySelectorAll('button')].map((e) => e.textContent?.trim()).filter(Boolean),
        brokenImages: [...document.images].filter((e) => e.complete && e.naturalWidth === 0).map((e) => e.getAttribute('src')),
      }));
      journeys.push({ id: `${phase}-${viewport.width}-${route}`, type: 'public-route-navigation', viewport, route, finalUrl: page.url(), status: response?.status(), ...info, errors, passed: response?.ok() && !info.overflow && !errors.length });
    } catch (err) {
      journeys.push({ id: `${phase}-${viewport.width}-${route}`, route, viewport, error: String(err), passed: false });
    } finally { page.off('pageerror', capture); }
  }
  await context.close();
}

// Synthetic chart information only. No account, payment, lead or model-generation mutations.
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${base}/free-kundli`, { waitUntil: 'domcontentloaded' });
const api = await page.evaluate(async () => {
  const response = await fetch('/api/tools/chart', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person: { birth_date: '1990-05-15', birth_time: '09:30:00', birth_city: 'New Delhi, India', birth_lat: 28.6139, birth_lng: 77.209, birth_time_precision: 'exact' } }),
  });
  return { status: response.status, body: await response.json() };
});
journeys.push({ id: `${phase}-public-chart-api`, type: 'browser-api-calculation', fictionalInputs: true, ...api, passed: api.status === 200 });
await context.close();
await browser.close();
await writeFile(path.join(out, 'journeys.json'), JSON.stringify({ base, phase, executedAt: new Date().toISOString(), browser: 'Playwright Chromium', journeys, counts: { executed: journeys.length, passed: journeys.filter((j) => j.passed).length, realUsers: 0, accountMutations: 0, paymentMutations: 0, modelGenerationCalls: 0 } }, null, 2));
console.log(JSON.stringify({ out, executed: journeys.length, passed: journeys.filter((j) => j.passed).length, failures: journeys.filter((j) => !j.passed).map((j) => ({ id: j.id, status: j.status, overflow: j.overflow, errors: j.errors, error: j.error })) }, null, 2));
