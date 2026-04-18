'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vedichour:launch-banner-dismissed-v1';

/**
 * Top-of-page announcement banner for the NEWUSER30 launch offer.
 * Renders as a sticky amber strip above the navbar.
 * Dismissal is persisted to localStorage so users don't see it again after
 * explicitly closing it.
 */
export default function LaunchBanner() {
  // Start hidden on SSR to avoid a flash-then-dismiss for returning visitors.
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === '1');
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  }

  if (!ready || dismissed) return null;

  return (
    <div className="relative w-full bg-amber text-space">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-10 py-2.5 text-center">
        <span className="font-mono text-xs sm:text-sm font-medium tracking-wide">
          <span className="font-bold">Launch offer — 30% off your first report.</span>
          {' '}Use code{' '}
          <Link
            href="/onboard?promo=NEWUSER30"
            className="inline-block px-2 py-0.5 mx-0.5 rounded bg-space/15 font-bold tracking-widest hover:bg-space/25 transition-colors"
          >
            NEWUSER30
          </Link>
          {' '}— applied automatically at checkout.
        </span>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss launch offer banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-space/10 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
