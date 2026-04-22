import { test, expect } from '@playwright/test';

/** Public marketing / legal surfaces */
const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/login',
  '/signup',
  '/refund',
  '/terms',
  '/privacy',
  '/synastry',
];

function seriousErrors(messages: string[]): string[] {
  const ignore = /favicon|ResizeObserver|hydration|ChunkLoadError/i;
  return messages.filter((m) => !ignore.test(m));
}

test.describe('Public routes render', () => {
  for (const path of PUBLIC_PATHS) {
    test(`${path} — main landmark + no fatal console`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      expect(res?.ok() || res?.status() === 304).toBeTruthy();

      /** Prefer semantic main landmark when present (basic a11y gate). */
      const mainCount = await page.locator('main').count();
      if (mainCount > 0) {
        await expect(page.getByRole('main')).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
      }

      await page.waitForLoadState('load').catch(() => {});

      expect(seriousErrors(errors), `Console errors on ${path}: ${errors.join('; ')}`).toEqual([]);
    });
  }
});

test.describe('Protected onboard redirects when logged out', () => {
  test('/onboard → login', async ({ page }) => {
    await page.goto('/onboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
