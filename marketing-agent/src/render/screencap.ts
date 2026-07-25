import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { resolveTools, runTool } from './ffmpeg';

/**
 * FREE product footage — the honest proof shot.
 *
 * Everything else in a reel is AI-generated; this is the one shot that is literally the real
 * product. It costs $0 and it is the shot that makes the claim credible, so it should be in
 * every reel.
 *
 * Method: one full-page screenshot at a MOBILE viewport with deviceScaleFactor 3 (360x640 CSS
 * -> 1080px-wide pixels, i.e. exactly our target width), then a deterministic ffmpeg vertical
 * pan across it. That beats Playwright's `recordVideo` here: recordVideo caps out at the CSS
 * viewport size (blurry when upscaled to 1080x1920) and produces jittery frame pacing, whereas
 * a still + ffmpeg pan is pixel-crisp, frame-exact and reproducible.
 *
 * Playwright is not a dependency of marketing-agent — it is resolved from the parent web app
 * (jyotish-ai/node_modules), which already ships playwright + a downloaded Chromium. It is
 * imported dynamically so that a machine without it degrades to a clear error instead of an
 * import-time crash.
 *
 * PRIVACY HARDLINE: only capture public pages or SAMPLE-data views (the homepage demo chart,
 * /free-kundli with the public sample, marketing pages). NEVER a logged-in dashboard or any
 * page showing a real person's birth details — a reel is forever, and real birth data in a
 * published ad is a privacy breach the brand can't take back.
 */

export interface CaptureOpts {
  url: string;
  seconds: number;
  outPath: string;
  waitForSelector?: string;
  /** Start the pan this many px down the page (skip a hero you don't want). */
  offsetPx?: number;
  onProgress?: (msg: string) => void;
}

const VIEWPORT = { width: 360, height: 640 };
const SCALE = 3; // 360*3 = 1080 wide, 640*3 = 1920 tall — exactly our frame

/** Can we capture product footage at all? Checked up-front by --dry so gaps surface before spend. */
export function browserEngineAvailable(): { ok: boolean; via: string } {
  const req = createRequire(import.meta.url);
  for (const mod of ['playwright', 'puppeteer']) {
    try {
      req.resolve(mod);
      return { ok: true, via: mod };
    } catch {
      /* keep looking */
    }
  }
  return { ok: false, via: 'none' };
}

async function loadBrowserEngine(): Promise<{ chromium: any; via: string }> {
  try {
    const pw: any = await import('playwright');
    return { chromium: pw.chromium, via: 'playwright' };
  } catch {
    /* fall through */
  }
  try {
    // Indirect specifier: puppeteer is an optional fallback and is not a declared dependency,
    // so it must not be resolved at type-check time.
    const spec = 'puppeteer';
    const pp: any = await import(/* @vite-ignore */ spec);
    return { chromium: pp.default ?? pp, via: 'puppeteer' };
  } catch {
    /* fall through */
  }
  throw new Error(
    'No browser automation available. Playwright is expected to resolve from the parent web app ' +
      '(jyotish-ai/node_modules/playwright). Install it there (`npm i -D playwright && npx playwright install chromium`) ' +
      'or add puppeteer. Until then, `product` shots cannot be captured and the reel will fall back to a placeholder card.',
  );
}

/** Screenshot the page full-height at 1080px wide. Returns the PNG path and its pixel height. */
async function fullPageShot(opts: CaptureOpts, pngPath: string): Promise<void> {
  const { chromium, via } = await loadBrowserEngine();
  opts.onProgress?.(`capturing ${opts.url} via ${via}`);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'dark',
      // A real mobile UA so the site serves its mobile layout.
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await page.goto(opts.url, { waitUntil: 'networkidle', timeout: 60000 });
    if (opts.waitForSelector) {
      await page.waitForSelector(opts.waitForSelector, { timeout: 30000 }).catch(() => {
        opts.onProgress?.(`selector ${opts.waitForSelector} never appeared — capturing anyway`);
      });
    }
    // Dismiss anything that would sit on top of the product. We only ever DECLINE cookie banners.
    await page
      .evaluate(() => {
        const kill = ['[data-cookie-banner]', '#cookie-banner', '.cookie-banner', '[aria-label*="cookie" i]', '[class*="consent" i]'];
        for (const sel of kill) document.querySelectorAll(sel).forEach((el) => el.remove());
        // Freeze animations so the pan is the only motion.
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation-play-state:paused !important;transition:none !important}';
        document.head.appendChild(style);
      })
      .catch(() => {});
    // Let lazy content settle.
    await page.waitForTimeout(1500);
    mkdirSync(dirname(pngPath), { recursive: true });
    await page.screenshot({ path: pngPath, fullPage: true });
    await context.close();
  } finally {
    await browser.close();
  }
}

/**
 * Capture a scroll/reveal of a real product page as a 1080x1920 mp4 (silent).
 * Returns the output path. Throws with an actionable message if no browser engine exists.
 */
export async function captureProductShot(opts: CaptureOpts): Promise<string> {
  const { ffmpeg, ffprobe } = resolveTools();
  const work = dirname(opts.outPath);
  mkdirSync(work, { recursive: true });
  const png = resolve(work, `${opts.url.replace(/\W+/g, '_').slice(-40)}.png`);

  await fullPageShot(opts, png);
  if (!existsSync(png)) throw new Error('screenshot produced no file');

  // How tall did the page come out?
  const dims = await runTool(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', png]);
  const [w, h] = dims.trim().split(',').map(Number);
  opts.onProgress?.(`page shot ${w}x${h}px`);

  const dur = Math.max(2, opts.seconds);
  const offset = Math.max(0, opts.offsetPx ?? 0);
  // Pan from `offset` down to the bottom of the page. If the page is shorter than one frame,
  // scale-and-pad instead of panning so we never emit letterboxed black bars.
  const travel = Math.max(0, h - 1920 - offset);
  const vf =
    travel > 8
      ? `crop=1080:1920:0:'${offset}+${travel}*min(t/${dur},1)',fps=30,setsar=1,format=yuv420p`
      : `scale=1080:-2,pad=1080:1920:0:(1920-ih)/2:color=0x0a0a1a,fps=30,setsar=1,format=yuv420p`;

  await runTool(ffmpeg, [
    '-y',
    '-loop', '1', '-i', png,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-vf', vf,
    '-t', String(dur),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '128k',
    '-shortest',
    opts.outPath,
  ]);
  rmSync(png, { force: true });
  opts.onProgress?.(`product shot -> ${opts.outPath} (${travel > 8 ? 'pan' : 'static'}, ${dur}s, $0.00)`);
  return opts.outPath;
}
