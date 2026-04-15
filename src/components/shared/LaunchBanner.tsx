'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Top-of-page announcement banner for the NEWUSER30 launch offer.
 * Renders as a sticky amber strip above the navbar.
 * The navbar uses `top-0` fixed positioning — this banner is NOT fixed,
 * it sits in normal flow so it pushes page content down correctly.
 * The nav's own `pt-*` on the page body handles spacing.
 */
export default function LaunchBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative w-full bg-amber text-space" style={{ zIndex: 70 }}>
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-10 py-2.5 text-center">
        <span className="text-base select-none">🚀</span>
        <p className="font-mono text-xs sm:text-sm font-medium tracking-wide">
          <span className="font-bold">New Launch Offer — 30% off all reports.</span>
          {' '}Use code{' '}
          <Link
            href="/onboard"
            className="inline-block px-2 py-0.5 mx-0.5 rounded bg-space/15 font-bold tracking-widest hover:bg-space/25 transition-colors"
          >
            NEWUSER30
          </Link>
          {' '}at checkout. Limited time only.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-space/10 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
