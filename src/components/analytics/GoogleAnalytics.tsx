'use client';

import { useEffect } from 'react';
import { ga4Id } from '@/lib/analytics/trackingIds';
import { registerAnalyticsCleanup } from '@/lib/analytics/consent';

const GA_ID = ga4Id(process.env.NEXT_PUBLIC_GA_ID);

export function disableGoogleAnalytics() {
  if (typeof window === 'undefined') return;
  const browser = window as unknown as Record<string, unknown> & { gtag?: (...args: unknown[]) => void };
  if (GA_ID) browser[`ga-disable-${GA_ID}`] = true;
  for (const key of Object.keys(browser)) if (/^ga-disable-G-/.test(key)) browser[key] = true;
  try {
    if (typeof browser.gtag === 'function') browser.gtag('consent', 'update', {
      analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    });
  } catch { /* A legacy SDK must not break the preference controls. */ }
}

/** Disabled this release: stream-side enhanced measurement and URL redaction are not attested. */
export function GoogleAnalytics() {
  useEffect(() => {
    disableGoogleAnalytics();
    return registerAnalyticsCleanup(disableGoogleAnalytics);
  }, []);
  return null;
}
