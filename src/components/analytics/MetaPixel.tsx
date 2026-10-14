'use client';

import { useEffect } from 'react';
import { registerAnalyticsCleanup } from '@/lib/analytics/consent';

type Pixel = ((...args: unknown[]) => void) & { queue?: unknown[] };

export function disableMetaPixel() {
  if (typeof window === 'undefined') return;
  const pixel = (window as unknown as { fbq?: Pixel }).fbq;
  try {
    if (Array.isArray(pixel?.queue)) pixel.queue.length = 0;
    if (typeof pixel === 'function') pixel('consent', 'revoke');
  } catch { /* A legacy SDK must not break the preference controls. */ }
}

/** Compatibility helper: advertising capture remains disabled, even after usage opt-in. */
export function fbqTrack(_event: string, _params?: Record<string, unknown>) {
  void _event;
  void _params;
}

/** No script or noscript image: the Pixel's automatic URL capture is not enabled in this release. */
export function MetaPixel() {
  useEffect(() => {
    disableMetaPixel();
    return registerAnalyticsCleanup(disableMetaPixel);
  }, []);
  return null;
}
