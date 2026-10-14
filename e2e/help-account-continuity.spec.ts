import { test, expect } from '@playwright/test';

test.use({ channel: process.env.CONTINUITY_BROWSER_CHANNEL || undefined });

test.beforeEach(async ({ page, baseURL }) => {
  const host = new URL(baseURL!).host;
  // Public-page checks cannot contact real auth, mail, analytics or generation providers.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.host !== host || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
});

test('help search, empty recovery, article routes and task anchors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/help');
  await expect(page.getByRole('heading', { name: 'Help', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '13 articles' })).toBeVisible();
  await page.getByLabel('Search help').fill('no-such-task-zyx');
  await expect(page.getByRole('heading', { name: 'No matching articles' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await expect(page.getByLabel('Search help')).toBeFocused();
  await page.getByLabel('Search help').fill('rectification');
  await page.getByRole('link', { name: /My birth time is missing or uncertain/ }).click();
  await expect(page).toHaveURL(/\/help\/birth-time$/);
  await expect(page.getByRole('heading', { level: 1, name: 'My birth time is missing or uncertain' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View example reading', exact: true })).toBeVisible();
  await page.goto('/help#compatibility');
  await expect(page.locator('#compatibility')).toBeInViewport();
  await page.goto('/help#birth-time');
  await expect(page.locator('#birth-time')).toBeInViewport();
  expect(errors).toEqual([]);
});

test('privacy clear requires confirmation and preserves auth and unrelated records', async ({ page }) => {
  await page.goto('/chart-privacy');
  await page.evaluate(() => {
    localStorage.setItem('vh_calculator_v1', 'fictional-birth-record');
    localStorage.setItem('vh_q_state_v1:test-a', 'fictional-quiz');
    localStorage.setItem('vh_q_state_v1:test-b', 'fictional-quiz');
    localStorage.setItem('sb-test-auth-token', 'fictional-session');
    localStorage.setItem('vh_currency', 'AED');
    sessionStorage.setItem('vh_onboard_draft', 'fictional-draft');
    sessionStorage.setItem('vh_quiz_state_v1', 'fictional-quiz');
    sessionStorage.setItem('ziina_report_id', 'fictional-existing-report');
  });
  await page.getByRole('button', { name: 'Clear device drafts', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Confirm clearing device drafts' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBe('fictional-birth-record');
  await page.getByRole('button', { name: 'Clear device drafts', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear drafts' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Device drafts cleared.' })).toBeVisible();
  const records = await page.evaluate(() => ({ calculator: localStorage.getItem('vh_calculator_v1'), q1: localStorage.getItem('vh_q_state_v1:test-a'), q2: localStorage.getItem('vh_q_state_v1:test-b'), onboard: sessionStorage.getItem('vh_onboard_draft'), quiz: sessionStorage.getItem('vh_quiz_state_v1'), auth: localStorage.getItem('sb-test-auth-token'), currency: localStorage.getItem('vh_currency'), payment: sessionStorage.getItem('ziina_report_id') }));
  expect(records).toEqual({ calculator: null, q1: null, q2: null, onboard: null, quiz: null, auth: 'fictional-session', currency: 'AED', payment: 'fictional-existing-report' });
});

test('denied storage reports failure without claiming successful clearing', async ({ page }) => {
  await page.goto('/chart-privacy');
  await page.evaluate(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage denied', 'SecurityError'); } });
  });
  await page.getByRole('button', { name: 'Clear device drafts', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear drafts' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Some browser storage could not be cleared.' })).toBeVisible();
});

test('logged-out dashboard redirects to secure sign-in and keeps requested tab', async ({ page }) => {
  await page.goto('/dashboard?tab=reports');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%3Ftab%3Dreports/);
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Free chart without sign-in' })).toBeVisible();
});

test('login handles a literal percent in an error and mocked credential failure', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/auth/v1/token?**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) }));
  await page.goto('/login?error_description=literal%25value');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Sign-in could not be completed');
  await page.getByLabel('Email', { exact: true }).fill('synthetic@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Forgot password');
  expect(errors).toEqual([]);
});

test('password recovery catches mocked network failure without sending mail', async ({ page }) => {
  await page.route('**/auth/v1/recover**', route => route.abort('failed'));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('synthetic@example.test');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('internet connection', { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeEnabled();
});

test('owned public surfaces fit the viewport and render nonblank screenshots', async ({ page }, testInfo) => {
  for (const path of ['/help', '/help/birth-time', '/chart-privacy', '/login']) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `${path} overflows`).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll('/', '-') || 'home'}.png`), fullPage: true });
  }
});
