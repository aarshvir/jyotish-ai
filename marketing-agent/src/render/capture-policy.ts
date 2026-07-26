import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { BRAND } from '../brand';

/**
 * WHAT THE PRODUCT SHOT IS ALLOWED TO SCROLL.
 *
 * OWNER LAW (2026-07-26, verbatim): "when it shows the platform scrolling, it should show the
 * REPORT and not the payment section... how all slots are coming and tell you what to do at what
 * time of day."
 *
 * The first two ads scrolled /pricing because src/loops/creative.ts defaulted every unmatched
 * screencap to BRAND.links.pricing. A price card is not proof of a product; the hour-slot grid is.
 * So this module is the single source of truth for BOTH ends of the pipeline:
 *   - the creative engine RESOLVES a screencap request to a URL through `resolveCapture()`
 *   - the render loop REFUSES to capture anything `assertCaptureAllowed()` rejects
 *
 * Targets live in config/creative-seeds.json (`screencapTargets`) so the owner can retune them
 * without a code change; the table below is the hard-coded backstop if that key is missing.
 */

/** CLAUDE.md §1: product shots show THE REPORT only. Onboarding is a form, not the product. */
export const FORBIDDEN_CAPTURE = /pricing|checkout|payment|onboard/i;

export interface CaptureTarget {
  key: string;
  /** Lowercase keywords matched against the creative's requested capture description. */
  keywords: string[];
  /** Path on BRAND.domain. */
  path: string;
  /** Wait for this to exist before screenshotting, so the slots are rendered, not skeletons. */
  waitForSelector?: string;
  /** Start the pan this many px down the full-page screenshot (1080px-wide, dsf 3). */
  scrollPx?: number;
  /** Page-Y where the pan stops. */
  panToPx?: number;
  note?: string;
}

/**
 * Backstop table. `sample_report_page` is the primary target — a sibling agent is shipping
 * https://www.vedichour.com/sample-report. Until it exists, `resolveCapture()` falls back to
 * `landing_sample_report`, the SAME report preview that is already live on the homepage
 * (section #sample-report: "Hourly windows — 18 precision slots per day").
 */
export const DEFAULT_CAPTURE_TARGETS: CaptureTarget[] = [
  {
    key: 'sample_report_page',
    keywords: ['hora', 'hour', 'slot', 'grid', 'report', 'window', 'day', 'card', 'week', 'timing'],
    path: '/sample-report',
    // TODO(sample-report): tighten to the hour-slot container once the page ships — the owner
    // wants the pan to land ON the slots. #main-content is the site-wide layout anchor and is
    // verified to exist on every live page, so it is a safe placeholder that never hangs.
    waitForSelector: '#main-content',
    note: 'primary target — the full sample report with the 18 hour-slots',
  },
  {
    key: 'landing_sample_report',
    keywords: ['sample', 'preview', 'excerpt'],
    path: '/#sample-report',
    waitForSelector: '#sample-report',
    // Measured on the live homepage at the capture viewport (360 CSS px, deviceScaleFactor 3) on
    // 2026-07-26: #sample-report starts at 24939px and is 4398px tall in the full-page shot, so
    // this pans the whole section and ENDS inside it (24939 + 4398 - 1920), never in the footer.
    // Re-measure if the landing page is restructured.
    scrollPx: 24939,
    panToPx: 27417,
    note: 'fallback while /sample-report is unbuilt — the live homepage report preview',
  },
  {
    key: 'free_kundli_chart',
    keywords: ['kundli', 'chart wheel', 'birth chart', 'wheel'],
    path: BRAND.links.freeKundli,
    waitForSelector: '#main-content',
    note: 'the free chart wheel — allowed, it is product, not checkout',
  },
];

interface SeedTargets {
  screencapTargets?: CaptureTarget[];
}

function loadTargets(): CaptureTarget[] {
  const f = resolve(ROOT, 'config', 'creative-seeds.json');
  if (!existsSync(f)) return DEFAULT_CAPTURE_TARGETS;
  try {
    const j = JSON.parse(readFileSync(f, 'utf8')) as SeedTargets;
    const t = j.screencapTargets;
    return Array.isArray(t) && t.length ? t : DEFAULT_CAPTURE_TARGETS;
  } catch {
    return DEFAULT_CAPTURE_TARGETS;
  }
}

export interface ResolvedCapture {
  url: string;
  libraryKey: string;
  waitForSelector?: string;
  scrollPx?: number;
  panToPx?: number;
}

function toUrl(path: string): string {
  return /^https?:/i.test(path) ? path : BRAND.domain + path;
}

function asResolved(t: CaptureTarget): ResolvedCapture {
  return { url: toUrl(t.path), libraryKey: t.key, waitForSelector: t.waitForSelector, scrollPx: t.scrollPx, panToPx: t.panToPx };
}

/**
 * Turn a creative's "what to capture" line into a concrete, POLICY-CLEAN capture spec.
 * The default is the report — never pricing — so an unmatched description can no longer leak
 * a checkout page into an ad, which is exactly how the first two ads went wrong.
 */
export function resolveCapture(visualPrompt: string): ResolvedCapture {
  const targets = loadTargets();
  const p = (visualPrompt ?? '').toLowerCase();
  const scored = targets
    .map((t) => ({ t, hits: (t.keywords ?? []).filter((k) => p.includes(k.toLowerCase())).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const chosen = scored[0]?.t ?? targets[0] ?? DEFAULT_CAPTURE_TARGETS[0];
  return asResolved(chosen);
}

/** The fallback used when the primary target 404s. */
export function fallbackCapture(): ResolvedCapture {
  const targets = loadTargets();
  const t = targets.find((x) => x.key === 'landing_sample_report') ?? DEFAULT_CAPTURE_TARGETS[1];
  return asResolved(t);
}

/**
 * HARD GUARD, called in the render path before a single pixel is captured. Throws (never warns)
 * on a pricing/checkout/payment/onboard URL — CLAUDE.md §1 requires the money-gate to block.
 */
export function assertCaptureAllowed(url: string, where = 'capture'): void {
  const m = FORBIDDEN_CAPTURE.exec(url ?? '');
  if (!m) return;
  throw new Error(
    `${where}: REFUSING to screen-record ${url} — it matches the forbidden pattern "${m[0]}". ` +
      'Owner law (2026-07-26): "when it shows the platform scrolling, it should show the REPORT and ' +
      'not the payment section... how all slots are coming and tell you what to do at what time of ' +
      `day." Re-point this shot at ${toUrl(DEFAULT_CAPTURE_TARGETS[0].path)} (or the live homepage ` +
      'report preview) and render again. Nothing was captured and nothing was charged.',
  );
}

/**
 * Is the primary target actually live? A HEAD request costs nothing and keeps the pipeline
 * working today (the page 404s until the sibling agent ships it) while upgrading itself
 * automatically the moment it exists. Probe failures fail OPEN — a flaky network must not
 * silently downgrade a capture that would have worked.
 */
export async function resolveLiveCapture(c: ResolvedCapture, log?: (m: string) => void): Promise<ResolvedCapture> {
  assertCaptureAllowed(c.url, 'capture-policy');
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(c.url.split('#')[0], { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    clearTimeout(timer);
    if (res.status !== 404) return c;
    const fb = fallbackCapture();
    if (fb.url === c.url) return c;
    log?.(
      `capture target ${c.url} returns 404 — falling back to ${fb.url} (the live homepage report preview). ` +
        'TODO: remove this fallback once /sample-report ships.',
    );
    assertCaptureAllowed(fb.url, 'capture-policy fallback');
    return fb;
  } catch (e: any) {
    log?.(`capture target probe failed (${String(e?.message ?? e).slice(0, 80)}) — using ${c.url} as planned`);
    return c;
  }
}
