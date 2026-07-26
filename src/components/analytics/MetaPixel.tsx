'use client';

import { useEffect } from 'react';

/**
 * Meta (Facebook) Pixel — powers ad-campaign conversion optimization + audiences.
 * Renders nothing unless NEXT_PUBLIC_META_PIXEL_ID is set, so it is safe on every
 * environment. CSP for connect.facebook.net / www.facebook.com is in next.config.mjs.
 *
 * CRITICAL: onboard historically navigated to `/report/{id}?name&date&time&city&lat&lng…`
 * (and admin `bypass=<BYPASS_SECRET>`). Meta's automatic PageView records the full
 * document URL, which would exfiltrate birth PII and the bypass secret to Facebook.
 * We scrub those query keys from the address bar BEFORE init/PageView, and keep the
 * noscript beacon on pathname-only.
 *
 * Beyond PageView, call `fbqTrack('Purchase', {...})` etc. from client code at
 * conversion moments — it no-ops when the pixel isn't loaded.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Query keys that must never appear in a Meta PageView URL. */
const SENSITIVE_QUERY_KEYS = new Set([
  'name',
  'date',
  'time',
  'city',
  'lat',
  'lng',
  'currentCity',
  'currentLat',
  'currentLng',
  'currentTz',
  'forecastStart',
  'bypass',
  'phone',
  'personal_context',
  'email',
]);

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: (...args: unknown[]) => void;
};

/** Pure helper — strip sensitive query keys from an absolute or path URL string. */
export function scrubSensitiveSearchFromHref(href: string): string {
  const url = new URL(href, 'https://vedichour.com');
  const toDelete: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (SENSITIVE_QUERY_KEYS.has(key)) toDelete.push(key);
  });
  for (const key of toDelete) url.searchParams.delete(key);
  return url.pathname + url.search + url.hash;
}

/** Strip sensitive query params from the address bar. Returns true if the URL changed. */
export function scrubSensitiveQueryParamsFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const next = scrubSensitiveSearchFromHref(window.location.href);
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (next === cur) return false;
    window.history.replaceState(window.history.state, '', next);
    return true;
  } catch {
    return false;
  }
}

export function fbqTrack(event: string, params?: Record<string, unknown>) {
  try {
    const w = window as unknown as { fbq?: FbqFn };
    w.fbq?.('track', event, params);
  } catch {
    /* analytics must never break the page */
  }
}

function loadMetaPixel(pixelId: string) {
  const w = window as unknown as { fbq?: FbqFn; _fbq?: FbqFn };
  if (w.fbq) return;

  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as FbqFn;
  n.queue = [];
  n.loaded = true;
  n.version = '2.0';
  n.push = n;
  w.fbq = n;
  w._fbq = n;

  const t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const s = document.getElementsByTagName('script')[0];
  s?.parentNode?.insertBefore(t, s);

  w.fbq('init', pixelId);
  w.fbq('track', 'PageView');
}

export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID) return;
    // Scrub BEFORE init so the automatic PageView never sees birth PII / bypass.
    scrubSensitiveQueryParamsFromUrl();
    loadMetaPixel(PIXEL_ID);
  }, []);

  if (!PIXEL_ID) return null;

  // Noscript fallback: fixed site-root dl= so birth query params never ride the beacon.
  const noscriptSrc = `https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1&dl=${encodeURIComponent('https://vedichour.com/')}`;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img height="1" width="1" style={{ display: 'none' }} alt="" src={noscriptSrc} />
    </noscript>
  );
}
