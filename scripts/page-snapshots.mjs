import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'page-snapshots');
mkdirSync(OUT, { recursive: true });

const BASE = 'https://www.vedichour.com';
const pages = [
  ['01-home', '/'],
  ['02-pricing', '/pricing'],
  ['03-free-kundli', '/free-kundli'],
  ['04-kundali', '/kundali'],
  ['05-synastry', '/synastry'],
  ['06-blog', '/blog'],
  ['07-blog-best-platforms', '/blog/best-vedic-astrology-platforms-2026'],
  ['08-faq', '/faq'],
  ['09-about', '/about'],
  ['10-how-it-works', '/how-it-works'],
  ['11-refund', '/refund'],
  ['12-privacy', '/privacy'],
  ['13-terms', '/terms'],
  ['14-login', '/login'],
  ['15-onboard', '/onboard'],
];

const results = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const [name, route] of pages) {
  const url = BASE + route;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500); // let fonts/animations settle
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    results.push(`OK   ${resp?.status() ?? '?'}  ${route}  -> ${name}.png`);
  } catch (e) {
    results.push(`FAIL      ${route}  (${e.message.split('\n')[0]})`);
  }
}

await browser.close();
console.log('\nSaved to: ' + OUT + '\n');
console.log(results.join('\n'));
