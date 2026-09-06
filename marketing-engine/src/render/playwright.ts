import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PARENT_ROOT, ROOT } from '../paths';

export async function loadPlaywright(): Promise<{ chromium: { launch: (opts?: object) => Promise<any> } }> {
  const files = [
    resolve(ROOT, 'node_modules', 'playwright', 'index.js'),
    resolve(ROOT, 'node_modules', 'playwright-core', 'index.js'),
    resolve(PARENT_ROOT, 'node_modules', 'playwright-core', 'index.js'),
    resolve(PARENT_ROOT, 'node_modules', 'playwright', 'index.js'),
  ];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const mod = (await import(pathToFileURL(file).href)) as {
      chromium?: { launch: (opts?: object) => Promise<any> };
      default?: { chromium?: { launch: (opts?: object) => Promise<any> } };
    };
    const chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) return { chromium };
  }
  throw new Error('Playwright not found. Install it in the parent app: npm i -D playwright && npx playwright install chromium');
}
