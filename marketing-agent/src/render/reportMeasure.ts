/**
 * Where, on the LIVE /sample-report, are the hour cards and the first thing we must never film?
 *
 * Why this exists: the page is edited by other people and other sessions. On 2026-10-12 it grew
 * a long personalised reading above the hour cards and every hour card moved from y=2348 to
 * y=33586 within half an hour. A reel that scrolls to a hard-coded pixel row then films the wrong
 * thing, and on a longer page would scroll past the pricing block (CLAUDE.md §1: "show the
 * REPORT, not the payment section"). So the reel measures the page it is about to film.
 *
 * All pixel values are in the 1080px-wide full-page shot (360 CSS px at deviceScaleFactor 3), the
 * same space captureProductShot pans through.
 */
import { createRequire } from 'node:module';

export const FRAME_PX = 1920;
/** The card's own top edge sits this far above its time label in the shot (padding, measured). */
export const CARD_TOP_OFFSET_PX = 70;

export interface HourCard {
  /** e.g. "5 – 6 pm" */
  label: string;
  /** y of the time label in the full-page shot */
  y: number;
}

export interface Measure {
  cards: HourCard[];
  /** y of every element that sells or links to pricing/checkout/sign-up, anywhere on the page */
  danger: Array<{ text: string; y: number }>;
  pageHeightPx: number;
}

export interface ProofWindow {
  startPx: number;
  endPx: number;
  focusLabel: string;
  focusTopPx: number;
  /** First risky element below the cards (or null if there is none): the viewport must stay above it. */
  dangerTopPx: number | null;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/[–—-]/g, '-').replace(/\s*-\s*/g, '-').trim().toLowerCase();

/**
 * Pure: turn a measurement into a scroll window that ENDS with the chosen hour card fully on screen
 * and never lets the bottom of the frame reach a pricing block. Throws, loudly, when it cannot.
 */
export function computeProofWindow(m: Measure, focus: string, cardsBefore = 2): ProofWindow {
  const cards = [...m.cards].sort((a, b) => a.y - b.y);
  if (cards.length < 6) throw new Error(`expected the sample report to have its hour cards, found ${cards.length}. The page was restructured: re-check it before filming.`);
  const idx = cards.findIndex((c) => norm(c.label) === norm(focus));
  if (idx < 0) throw new Error(`hour card "${focus}" is not on the sample report (found: ${cards.map((c) => c.label).join(', ')})`);

  const focusTop = cards[idx].y - CARD_TOP_OFFSET_PX;
  const startCard = cards[Math.max(0, idx - cardsBefore)];
  const startPx = Math.max(0, startCard.y - CARD_TOP_OFFSET_PX - 40);
  // End with the focus card's top just below the frame's top edge, so the whole card is visible.
  const endPx = Math.max(startPx, focusTop - 160);

  const lastCardY = cards[cards.length - 1].y;
  const below = m.danger.filter((d) => d.y > lastCardY).sort((a, b) => a.y - b.y);
  const dangerTopPx = below.length ? below[0].y : null;
  // Anything risky INSIDE the card region is also fatal: it would be filmed.
  const inside = m.danger.find((d) => d.y >= startPx && d.y <= endPx + FRAME_PX);
  if (inside) {
    throw new Error(`"${inside.text}" (y=${inside.y}) sits inside the scroll window ${startPx}..${endPx + FRAME_PX}; refusing to film it`);
  }
  if (dangerTopPx !== null && endPx + FRAME_PX > dangerTopPx) {
    throw new Error(`the last frame would reach y=${endPx + FRAME_PX}, past the pricing block at y=${dangerTopPx}; refusing to film`);
  }
  return { startPx, endPx, focusLabel: cards[idx].label, focusTopPx: focusTop, dangerTopPx };
}

/**
 * Runs inside the page. Kept as a plain string, NOT a function: tsx/esbuild injects a `__name`
 * helper into compiled functions, and it does not exist in the page ("__name is not defined").
 */
const MEASURE_SCRIPT = `(() => {
  var y = function (el) { return Math.round((el.getBoundingClientRect().top + window.scrollY) * 3); };
  var timeRe = /^\\d{1,2}\\s*[–-]\\s*\\d{1,2}\\s*(am|pm)$/i;
  var cards = [].slice.call(document.querySelectorAll('*'))
    .filter(function (el) { return el.children.length < 6 && timeRe.test((el.textContent || '').trim()); })
    .map(function (el) { return { label: (el.textContent || '').trim(), y: y(el) }; });
  var riskRe = /pricing|checkout|subscribe|compare full|sign up|quiz|unlock|get started|start with|\\/start|payment/i;
  var danger = [].slice.call(document.querySelectorAll('a,button,h2,h3,section'))
    .filter(function (el) {
      var t = ((el.textContent || '').trim().slice(0, 80) + ' ' + (el.getAttribute('href') || '')).toLowerCase();
      return riskRe.test(t) && !/^(skip|menu)/i.test(t);
    })
    .map(function (el) { return { text: (el.textContent || '').trim().slice(0, 40) || el.getAttribute('href') || 'cta', y: y(el) }; });
  return { cards: cards, danger: danger, pageHeightPx: Math.round(document.documentElement.scrollHeight * 3) };
})()`;

/** The browser half: measure the live page exactly the way captureProductShot will shoot it. */
export async function measureReportPage(url: string): Promise<Measure> {
  const req = createRequire(import.meta.url);
  void req; // resolution of 'playwright' mirrors screencap.ts: dynamic import below
  const pw: any = await import('playwright');
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'dark',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    // The same cookie/animation clean-up captureProductShot applies, so heights match the shot.
    await page
      .evaluate(() => {
        const kill = ['[data-cookie-banner]', '#cookie-banner', '.cookie-banner', '[aria-label*="cookie" i]', '[class*="consent" i]'];
        for (const sel of kill) document.querySelectorAll(sel).forEach((el) => el.remove());
        const style = document.createElement('style');
        style.textContent = '*,*::before,*::after{animation-play-state:paused !important;transition:none !important}';
        document.head.appendChild(style);
      })
      .catch(() => {});
    await page.waitForTimeout(1500);
    return (await page.evaluate(MEASURE_SCRIPT)) as Measure;
  } finally {
    await browser.close();
  }
}
