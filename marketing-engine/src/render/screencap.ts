import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { BRAND } from '../brand';
import { envStr } from '../env';
import { assertCaptureAllowed, CAPTURE_TARGET } from '../policy/capture';
import { loadPlaywright } from './playwright';

export async function captureSampleReport(dir: string): Promise<{ png: string; url: string }> {
  const base = (envStr('CAPTURE_BASE_URL') ?? BRAND.domain).replace(/\/$/, '');
  const url = `${base}${CAPTURE_TARGET.path}`;
  assertCaptureAllowed(url, 'assets');
  mkdirSync(dir, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.evaluate((sels: string[]) => {
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((el) => {
          const section = el.closest('section') ?? el.parentElement;
          section?.parentElement && section.remove();
        });
      }
      document.querySelectorAll('a[href*="pricing"],a[href*="checkout"],a[href*="payment"]').forEach((el) => el.remove());
    }, CAPTURE_TARGET.stripSelectors);
    const remaining = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map((a: HTMLAnchorElement) => a.getAttribute('href') || ''));
    const bad = remaining.find((h: string) => /pricing|checkout|payment/i.test(h));
    if (bad) {
      throw new Error(`capture still contains forbidden href ${bad} after strip — refusing to shoot`);
    }
    const png = resolve(dir, 'sample-report.png');
    const main = page.locator('#main-content');
    if (await main.count()) {
      await main.screenshot({ path: png, type: 'png' });
    } else {
      await page.screenshot({ path: png, fullPage: true, type: 'png' });
    }
    return { png, url };
  } finally {
    await browser.close();
  }
}
