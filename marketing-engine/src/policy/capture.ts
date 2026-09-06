/** Capture allow/deny. Owner law 2026-07-26: report hour-slots, never checkout. */

export const FORBIDDEN_CAPTURE = /pricing|checkout|payment|onboard/i;

export function assertCaptureAllowed(url: string, where = 'capture'): void {
  const m = FORBIDDEN_CAPTURE.exec(url ?? '');
  if (!m) return;
  throw new Error(
    `${where}: REFUSING ${url} — matches "${m[0]}". Product shots show the hour-slot report, never pricing/checkout/onboard.`,
  );
}

export const CAPTURE_TARGET = {
  path: '/sample-report',
  waitText: 'Hourly',
  /** CSS paths we strip so a /pricing footer cannot leak into the reel. */
  stripSelectors: ['a[href*="pricing"]', 'a[href*="checkout"]', 'a[href*="payment"]'],
};
