import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { makeChartResult } from '@/lib/tools/chart';
import { syntheticNatal } from '@/lib/tools/test-fixtures';

const base = process.env.CALCULATOR_BASE_URL;
const result = makeChartResult(syntheticNatal, undefined, 'known', new Date('2026-10-15T12:00:00Z'));
const cities = [{ lat: 51.5, lon: 0, display_name: 'London, England, United Kingdom' }, { lat: 42.98, lon: -81.25, display_name: 'London, Ontario, Canada' }];

describe.runIf(Boolean(base))('calculator browser regressions (all APIs mocked)', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let chartCalls: Array<{ person: Record<string, unknown> }>;

  beforeAll(async () => { browser = await chromium.launch({ headless: true, channel: process.env.CALCULATOR_BROWSER_CHANNEL }); }, 30_000);
  beforeEach(async () => {
    chartCalls = [];
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(base!).origin) { await route.abort(); return; }
      if (url.pathname === '/api/geocode') { await route.fulfill({ json: cities }); return; }
      if (url.pathname === '/api/tools/chart') {
        chartCalls.push(route.request().postDataJSON());
        await route.fulfill({ json: result }); return;
      }
      if (url.pathname.startsWith('/api/')) { await route.fulfill({ json: {} }); return; }
      await route.continue();
    });
    page = await context.newPage();
    await page.goto(`${base}/free-kundli`, { waitUntil: 'networkidle' });
    await page.getByLabel('Birth date', { exact: true }).waitFor();
  }, 60_000);
  afterEach(async () => { await context?.close(); });
  afterAll(async () => { await browser?.close(); }, 30_000);

  async function fill() {
    await page.getByLabel('Birth date', { exact: true }).fill('2000-02-29');
    await page.getByLabel('Birth time certainty').selectOption('known');
    await page.getByLabel('Birth time (24-hour)', { exact: true }).fill('06:30:00');
    await page.getByLabel('Birth city and country').fill('London');
    await page.getByRole('button', { name: 'Search city', exact: true }).click();
    await page.getByRole('radio', { name: cities[0].display_name, exact: true }).waitFor();
  }
  async function calculate() {
    await fill();
    await page.getByRole('radio', { name: cities[0].display_name, exact: true }).check();
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    await page.getByRole('region', { name: 'Calculation result' }).waitFor();
  }

  it('requires deliberate time and explicit city choice, returns all free facts and never saves by default', async () => {
    expect(await page.getByLabel('Birth time (24-hour)', { exact: true }).inputValue()).toBe('');
    await fill();
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    expect(chartCalls).toHaveLength(0);
    expect(await page.locator('form').getByRole('alert').textContent()).toMatch(/city/);
    await page.getByRole('radio', { name: cities[0].display_name, exact: true }).check();
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    const output = page.getByRole('region', { name: 'Calculation result' });
    await output.waitFor();
    expect(await output.textContent()).toMatch(/Gemini/);
    expect(await output.textContent()).toMatch(/Sagittarius/);
    expect(await output.textContent()).toMatch(/Unavailable/);
    expect(await output.textContent()).not.toMatch(/Enter your email|locked|Unlock my/);
    expect(chartCalls[0].person).toMatchObject({ birth_time: '06:30:00', birth_lng: 0, birth_time_accuracy: 'known' });
    expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeNull();
    expect(await page.getByRole('link', { name: 'View a sample', exact: true }).getAttribute('href')).toBe('/sample-report');
    if (process.env.CALCULATOR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.CALCULATOR_SCREENSHOT_DIR, 'calculator-desktop.png'), fullPage: true });
  }, 60_000);

  it('supports opt-in restore, invalidates saved results immediately on edit and clears only calculator storage', async () => {
    await page.getByRole('checkbox', { name: /Save my draft/ }).check();
    await calculate();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vh_calculator_v1') ?? '{}').result?.lagna)).toBe('Gemini');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('region', { name: 'Calculation result' }).waitFor();
    expect(await page.getByLabel('Birth time (24-hour)', { exact: true }).inputValue()).toBe('06:30:00');
    await page.getByLabel('Birth time (24-hour)', { exact: true }).fill('07:30:00');
    expect(await page.getByRole('region', { name: 'Calculation result' }).count()).toBe(0);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vh_calculator_v1') ?? '{}').result)).toBeNull();
    await page.evaluate(() => localStorage.setItem('synthetic-unrelated', 'preserved'));
    await page.getByRole('button', { name: 'Clear details and saved result' }).click();
    expect(await page.getByLabel('Birth date', { exact: true }).inputValue()).toBe('');
    expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('synthetic-unrelated'))).toBe('preserved');
  }, 60_000);

  it('never calculates unknown time and keeps mobile text inside the viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Birth time certainty').selectOption('unknown');
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    expect(chartCalls).toHaveLength(0);
    expect(await page.getByLabel('Birth time (24-hour)', { exact: true }).count()).toBe(0);
    expect(await page.getByText(/We do not substitute noon/).count()).toBeGreaterThan(0);
    await calculate();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const overflowing = await page.locator('form input, form select, form button, [aria-label="Calculation result"] dt, [aria-label="Calculation result"] dd').evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent));
    expect(overflowing).toEqual([]);
    if (process.env.CALCULATOR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.CALCULATOR_SCREENSHOT_DIR, 'calculator-mobile.png'), fullPage: true });
  }, 60_000);

  it('suppresses a late calculation after edits and permits a fresh submit', async () => {
    let release: (() => void) | undefined;
    let started = false;
    await page.route('**/api/tools/chart', async route => {
      started = true;
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: result }).catch(() => undefined);
    });
    await fill();
    await page.getByRole('radio', { name: cities[0].display_name, exact: true }).check();
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    await expect.poll(() => started).toBe(true);
    await page.getByLabel('Birth time (24-hour)', { exact: true }).fill('07:30:00');
    release?.();
    await page.unroute('**/api/tools/chart');
    expect(await page.getByRole('region', { name: 'Calculation result' }).count()).toBe(0);
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    await page.getByRole('region', { name: 'Calculation result' }).waitFor();
    expect(chartCalls.at(-1)?.person.birth_time).toBe('07:30:00');
  }, 60_000);

  it('suppresses a late city search after editing, without overwriting other fields', async () => {
    let release: (() => void) | undefined;
    let started = false;
    await page.route('**/api/geocode*', async route => {
      started = true;
      await new Promise<void>(resolve => { release = resolve; });
      await route.fulfill({ json: cities }).catch(() => undefined);
    });
    await page.getByLabel('Birth city and country').fill('London');
    await page.getByLabel('Birth city and country').press('Enter');
    await expect.poll(() => started).toBe(true);
    await page.getByLabel('Birth date', { exact: true }).fill('2001-01-01');
    await page.getByLabel('Birth city and country').fill('Delhi');
    release?.();
    await page.unroute('**/api/geocode*');
    expect(await page.getByLabel('Birth city and country').inputValue()).toBe('Delhi');
    expect(await page.getByLabel('Birth date', { exact: true }).inputValue()).toBe('2001-01-01');
    expect(await page.getByRole('radio').count()).toBe(0);
  }, 60_000);

  it('recovers from provider errors without echoing private text or losing entered details', async () => {
    let attempts = 0;
    await page.route('**/api/tools/chart', async route => {
      attempts++;
      await route.fulfill(attempts === 1 ? { status: 503, json: { error: 'private@example.test provider-secret' } } : { json: result });
    });
    await fill();
    await page.getByRole('radio', { name: cities[0].display_name, exact: true }).check();
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    const error = page.locator('form').getByRole('alert');
    await error.waitFor();
    expect(await error.textContent()).toMatch(/temporarily unavailable/);
    expect(await page.locator('body').textContent()).not.toMatch(/private@example|provider-secret/);
    expect(await page.getByLabel('Birth time (24-hour)', { exact: true }).inputValue()).toBe('06:30:00');
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    await page.getByRole('region', { name: 'Calculation result' }).waitFor();
    expect(attempts).toBe(2);
  }, 60_000);

  it('labels approximate results provisional and removes saved data when consent is withdrawn', async () => {
    await page.route('**/api/tools/chart', route => route.fulfill({ json: { ...result, birth_time_accuracy: 'approximate' } }));
    await page.getByRole('checkbox', { name: /Save my draft/ }).check();
    await fill();
    await page.getByLabel('Birth time certainty').selectOption('approximate');
    await page.getByLabel('Birth time (24-hour)', { exact: true }).fill('06:30:00');
    await page.getByRole('radio', { name: cities[0].display_name, exact: true }).check();
    await page.getByRole('button', { name: 'Calculate free', exact: true }).click();
    const output = page.getByRole('region', { name: 'Calculation result' });
    await output.waitFor();
    expect(await output.textContent()).toMatch(/Provisional.*No time interval was checked/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).not.toBeNull();
    await page.getByRole('checkbox', { name: /Save my draft/ }).uncheck();
    expect(await page.evaluate(() => localStorage.getItem('vh_calculator_v1'))).toBeNull();
    expect(await output.isVisible()).toBe(true);
  }, 60_000);
});
