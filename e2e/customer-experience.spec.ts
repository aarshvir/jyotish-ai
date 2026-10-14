import { test, expect, type Page, type Locator } from '@playwright/test';

async function fillBirth(page: Page | Locator) {
  await page.getByLabel('Birth date', { exact: true }).fill('1990-05-15');
  await page.getByLabel('Birth time certainty').selectOption('known');
  await page.getByLabel('Birth time (24-hour)').fill('09:30:00');
  await page.getByLabel('Birth city and country').fill('New Delhi, India');
  await page.getByRole('button', { name: 'Search city', exact: true }).click();
  await page.getByRole('radio').first().click();
  await expect(page.getByText(/^Selected:/)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route(/google-analytics|googletagmanager|connect\.facebook|facebook\.com\/tr|posthog\.com/, route => route.abort());
});

test('free chart task, optional save, refresh, edit and clear', async ({ page }, testInfo) => {
  let computation = 0;
  page.on('request', request => { if (request.url().includes('/api/tools/chart') && request.method() === 'POST') computation++; });
  await page.goto('/free-kundli');
  await expect(page.getByLabel('Birth time (24-hour)')).toHaveValue('');
  await fillBirth(page);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
  const result = page.getByRole('region', { name: 'Calculation result' });
  await expect(result).toBeVisible({ timeout: 45_000 });
  await expect(result).toContainText('Gemini');
  await expect(result).toContainText('Sagittarius');
  await expect(result).toContainText('Manglik');
  await expect(page.locator('input[type=email]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeTruthy();
  await page.screenshot({ path: `artifacts/customer-experience/${testInfo.project.name}-chart-result.png`, fullPage: true });
  await page.reload();
  await expect(result).toBeVisible();
  expect(computation).toBe(1);
  await page.getByRole('button', { name: 'Edit birth details' }).click();
  await expect(result).toHaveCount(0);
  await expect(page.getByLabel('Birth date', { exact: true })).toHaveValue('1990-05-15');
  await page.getByRole('button', { name: 'Clear details and saved result' }).click();
  await expect(page.getByLabel('Birth date', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeNull();
});

test('unknown birth time sends no calculation and offers recovery help', async ({ page }) => {
  let computation = 0;
  page.on('request', request => { if (request.url().includes('/api/tools/chart') && request.method() === 'POST') computation++; });
  await page.goto('/moon-sign-calculator');
  await page.getByLabel('Birth time certainty').selectOption('unknown');
  await expect(page.getByText('We do not substitute noon.', { exact: false }).first()).toBeVisible();
  await expect(page.locator('input[type=time]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Calculate free' }).click();
  expect(computation).toBe(0);
  await expect(page.getByRole('link', { name: /birth.time help/i }).first()).toBeVisible();
});

test('ambiguous city requires a choice and edits invalidate coordinates', async ({ page }) => {
  await page.route('**/api/geocode?*', route => route.fulfill({ json: [
    { lat: '39.7817', lon: '-89.6501', display_name: 'Springfield, Illinois, United States' },
    { lat: '42.1015', lon: '-72.5898', display_name: 'Springfield, Massachusetts, United States' },
  ] }));
  await page.goto('/free-kundli');
  await page.getByLabel('Birth city and country').fill('Springfield');
  await page.getByRole('button', { name: 'Search city', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await expect(page.getByText(/^Selected:/)).toHaveCount(0);
  await page.getByRole('radio', { name: /Massachusetts/ }).click();
  await expect(page.getByText(/^Selected:/)).toContainText('Massachusetts');
  await page.getByLabel('Birth city and country').fill('London');
  await expect(page.getByText(/^Selected:/)).toHaveCount(0);
});

test('failed calculation preserves inputs and can be retried', async ({ page }) => {
  await page.goto('/free-kundli');
  await fillBirth(page);
  await page.route('**/api/tools/chart', route => route.fulfill({ status: 504, json: { error: 'Provider timeout' } }));
  await page.getByRole('button', { name: 'Calculate free' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'unchanged' })).toBeVisible();
  await expect(page.getByLabel('Birth date', { exact: true })).toHaveValue('1990-05-15');
  await page.unroute('**/api/tools/chart');
  await page.getByRole('button', { name: 'Calculate free' }).click();
  await expect(page.getByRole('region', { name: 'Calculation result' })).toBeVisible({ timeout: 45_000 });
  expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeNull();
});

test('help search, no-result recovery and device clear stay scoped', async ({ page }) => {
  await page.goto('/help');
  await page.getByLabel('Search help').fill('birth time');
  await expect(page.getByRole('link', { name: /birth time/i }).first()).toBeVisible();
  await page.getByLabel('Search help').fill('zzzz-no-such-task');
  await expect(page.getByText('No matching articles')).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await expect(page.getByLabel('Search help')).toHaveValue('');
  await page.goto('/chart-privacy');
  await page.evaluate(() => { localStorage.setItem('vh_calculator_v1', 'synthetic-test-draft'); localStorage.setItem('unrelated_test_key', 'keep'); });
  await page.getByRole('button', { name: 'Clear device drafts', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear drafts', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Device drafts cleared' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated_test_key'))).toBe('keep');
});

test('closed offers and assistant metadata agree, private routes preserve auth', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText(/new paid readings.*unavailable/i).first()).toBeVisible();
  await page.goto('/start');
  await expect(page.getByRole('heading', { name: 'Start with your free birth chart' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  const offers = await page.request.get('/api/quiz/offer');
  expect(await offers.json()).toMatchObject({ checkoutEnabled: false, blueprintOpen: false });
  const metadata = await page.request.get('/llms.txt');
  expect(await metadata.text()).toContain('New paid readings are currently unavailable');
});

test('navigation and real product visual fit at this viewport', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'VedicHour', exact: true })).toBeVisible();
  if (testInfo.project.name !== 'desktop') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('link', { name: 'Help', exact: true }).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await page.screenshot({ path: `artifacts/customer-experience/${testInfo.project.name}-home-viewport.png` });
});

test('optional analytics starts off, honors a choice and can be withdrawn', async ({ page }) => {
  let optionalRequests = 0;
  await page.route(/\/api\/(track|events)(\?|$)/, route => { optionalRequests++; return route.fulfill({ json: { success: true } }); });
  await page.goto('/privacy');
  const settings = page.locator('#analytics-preferences');
  await expect(settings).toContainText('optional usage analytics off');
  expect(optionalRequests).toBe(0);
  await settings.getByRole('checkbox').check();
  await settings.getByRole('button', { name: 'Save choice' }).click();
  await expect(settings.getByRole('checkbox')).toBeChecked();
  await expect(settings.getByRole('status')).toContainText(/analytics enabled/i);
  await expect.poll(() => optionalRequests).toBeGreaterThan(0);
  expect(await page.locator('script[src*="facebook.net"],script[src*="googletagmanager"]').count()).toBe(0);
  await settings.getByRole('button', { name: 'Turn off optional tracking' }).click();
  await expect(settings.getByRole('checkbox')).not.toBeChecked();
  const requestsAtWithdrawal = optionalRequests;
  await page.goto('/help');
  expect(optionalRequests).toBe(requestsAtWithdrawal);
  expect(await page.evaluate(() => localStorage.getItem('vh_sid'))).toBeNull();
});

test('responsive walkthrough loads actual video, captions and transcript', async ({ page }, testInfo) => {
  await page.goto('/help/free-birth-chart');
  const video = page.getByLabel('Free birth-chart calculation walkthrough');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  const info = await video.evaluate((element: HTMLVideoElement) => ({ src: element.currentSrc, duration: element.duration, width: element.videoWidth, height: element.videoHeight, tracks: element.querySelectorAll('track').length }));
  expect(info.duration).toBeGreaterThan(25);
  expect(info.tracks).toBe(1);
  expect(info.src).toContain(testInfo.project.name === 'desktop' ? 'desktop.mp4' : 'mobile.mp4');
  expect(info.width).toBe(testInfo.project.name === 'desktop' ? 1280 : 390);
  await video.evaluate(async (element: HTMLVideoElement) => { await element.play(); });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0);
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  await page.getByText('Read the walkthrough transcript', { exact: true }).click();
  await expect(page.getByText(/Gemini rising and a Sagittarius Moon/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test('Kundli facts do not trigger a generated full reading', async ({ page }) => {
  let fullRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/kundali/compute')) fullRequests++; });
  await page.goto('/kundali');
  await fillBirth(page);
  await page.getByRole('button', { name: 'See my chart', exact: false }).click();
  await expect(page.getByText('Your chart at a glance')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText('Gemini', { exact: true })).toBeVisible();
  expect(fullRequests).toBe(0);
  await expect(page.getByRole('button', { name: 'Create full reading with existing access' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test('compatibility free score is qualified and never invokes a generated reading', async ({ page }) => {
  let fullRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/synastry/compute')) fullRequests++; });
  await page.goto('/synastry');
  await fillBirth(page.getByRole('heading', { name: 'You', exact: true }).locator('..'));
  await fillBirth(page.getByRole('heading', { name: 'Your partner', exact: true }).locator('..'));
  await page.getByRole('button', { name: /See our compatibility/ }).click();
  await expect(page.getByText('Your Gun Milan score')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/A traditional compatibility measure, not a verdict/)).toBeVisible();
  expect(fullRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});
