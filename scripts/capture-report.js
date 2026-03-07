const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function captureReport() {
  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(900000); // 15 min

  // Go to onboard
  console.log('Opening onboard form at', BASE_URL, '...');
  await page.goto(`${BASE_URL}/onboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('text=Who Are You?', { timeout: 30000 });
  await page.waitForTimeout(2000);
  const nameInput = page.locator('input[type="text"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });

  // Step 1: Name and email
  console.log('Step 1: Filling name and email...');
  await nameInput.fill('Aarsh Vir Gupta');
  await page.locator('input[type="email"]').fill('aarsh@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1000);

  // Step 2: Birth and location
  console.log('Step 2: Filling birth date, time, cities...');
  await page.locator('input[type="date"]').fill('1991-01-05');
  await page.locator('input[type="time"]').fill('19:45');
  await page.getByPlaceholder('Lucknow, India').fill('Lucknow, India');
  await page.waitForTimeout(2500); // geocode
  const lucknowSuggestion = page.locator('text=Lucknow').first();
  if (await lucknowSuggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
    await lucknowSuggestion.click();
    await page.waitForTimeout(500);
  }
  await page.getByPlaceholder(/Dubai|same as birth/).fill('Dubai, UAE');
  await page.waitForTimeout(2500); // geocode
  const dubaiSuggestion = page.locator('text=Dubai').first();
  if (await dubaiSuggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dubaiSuggestion.click();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(1000);

  // Step 3: Select 7-Day and submit
  console.log('Step 3: Selecting 7-Day Forecast and submitting...');
  await page.locator('button:has-text("7-Day Forecast")').first().click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Generate Report' }).click();

  // Wait for report to load
  console.log('Waiting for report to generate (up to 12 minutes)...');
  await page.waitForURL(/\/report\//, { timeout: 120000 });
  console.log('Report page loaded, waiting for full generation...');

  // Wait for synthesis section with real content (100+ words)
  await page.waitForFunction(() => {
    const synth = document.querySelector('#synthesis');
    if (!synth) return false;
    const text = synth.innerText || '';
    return text.split(/\s+/).length > 100;
  }, { timeout: 900000 });

  console.log('Report fully generated! Saving HTML...');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  const html = await page.content();
  fs.writeFileSync('scripts/last-report.html', html);
  console.log('Saved to scripts/last-report.html');

  await page.screenshot({
    path: 'scripts/report-screenshot.png',
    fullPage: true
  });
  console.log('Screenshot saved to scripts/report-screenshot.png');

  const metrics = await page.evaluate(() => {
    const getText = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerText.trim() : '';
    };
    const scoreEls = document.querySelectorAll('[data-day-score], .day-score');
    const scores = Array.from(scoreEls).map(el =>
      parseInt(el.innerText || el.getAttribute('data-day-score') || '0', 10)
    ).filter(s => s > 0);
    const firstOverview = getText('.day-overview, [data-testid="day-overview"]');
    const synthEl = document.querySelector('#synthesis');
    const synthOpening = synthEl ? synthEl.innerText.trim() : '';
    const monthCards = document.querySelectorAll('.month-card, [data-month]');
    const hourlyRows = document.querySelectorAll('tr[data-slot], .hourly-row');
    return {
      dayScores: scores,
      firstOverviewWords: firstOverview.split(/\s+/).length,
      firstOverviewSample: firstOverview.substring(0, 200),
      synthOpeningWords: synthOpening.split(/\s+/).length,
      synthOpeningSample: synthOpening.substring(0, 200),
      monthCardCount: monthCards.length,
      hourlyRowCount: hourlyRows.length,
    };
  });

  console.log('\n=== RENDER QUALITY METRICS ===');
  console.log('Day scores:', metrics.dayScores);
  console.log('First overview words:', metrics.firstOverviewWords);
  console.log('First overview sample:', metrics.firstOverviewSample);
  console.log('Synthesis opening words:', metrics.synthOpeningWords);
  console.log('Hourly rows found:', metrics.hourlyRowCount);

  await browser.close();
  console.log('\nDone. Check scripts/last-report.html');
}

captureReport().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
