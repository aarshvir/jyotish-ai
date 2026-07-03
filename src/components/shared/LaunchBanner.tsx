'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vedichour:launch-banner-dismissed-v1';
const DISMISSED_ATTR = 'data-vh-banner-dismissed';

/*
 * Runs synchronously during HTML parsing, BEFORE the banner element below is
 * painted: if localStorage says the banner was dismissed, it flags <html> so
 * the co-located <style> rule hides the banner pre-paint. This lets us render
 * the banner in the SSR HTML (zero layout shift for new visitors) without a
 * flash-then-hide for returning dismissers.
 */
const PREPAINT_SCRIPT = `try{if(localStorage.getItem('${STORAGE_KEY}')==='1')document.documentElement.setAttribute('${DISMISSED_ATTR}','')}catch(e){}`;

/**
 * Top-of-page announcement banner for the launch promo offer.
 * Renders as a sticky amber strip above the navbar.
 * Dismissal is persisted to localStorage so users don't see it again after
 * explicitly closing it.
 */
export default function LaunchBanner() {
  // SSR-visible by default; the pre-paint script above handles dismissers.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Sync React state with the pre-paint decision so the hidden node unmounts.
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') setDismissed(true);
    } catch {}
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
    document.documentElement.setAttribute(DISMISSED_ATTR, '');
  }

  if (dismissed) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      <style>{`html[${DISMISSED_ATTR}] #vh-launch-banner{display:none}`}</style>
      <div id="vh-launch-banner" className="relative w-full bg-amber text-space">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-10 py-2.5 text-center">
            <span className="font-mono text-xs sm:text-sm font-medium tracking-wide">
              <span className="font-bold">Launch offer — 30% off your first paid report.</span>
              {' '}Use code <span className="font-bold">NEWUSER30</span>.{' '}
              <Link
                href="/onboard?plan=7day&promo=NEWUSER30"
                className="underline hover:no-underline transition-all"
              >
                Claim 30% off →
              </Link>
            </span>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss launch offer banner"
          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded hover:bg-space/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </>
  );
}
