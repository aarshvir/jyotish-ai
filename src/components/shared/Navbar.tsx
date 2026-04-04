'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthButton from '@/components/shared/AuthButton';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`pdf-exclude fixed top-0 left-0 right-0 z-50 h-[var(--nav-height)] transition-all duration-300 ${
        scrolled
          ? 'bg-space/80 backdrop-blur-md border-b border-horizon/60'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0 text-amber"
            aria-hidden
          >
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="0.8" opacity="0.8" />
            <circle cx="14" cy="14" r="3" fill="currentColor" />
            <line x1="14" y1="1" x2="14" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="14" y1="23" x2="14" y2="27" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="1" y1="14" x2="5" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="23" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          </svg>
          <span className="font-display text-base font-semibold tracking-wide text-star group-hover:text-amber-glow transition-colors sm:text-xl sm:tracking-[0.08em]">
            VedicHour
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 text-sm font-body text-dust lg:flex">
          <Link href="/#how-it-works" className="tracking-wide transition-colors hover:text-star">
            How it works
          </Link>
          <Link href="/pricing" className="tracking-wide transition-colors hover:text-star">
            Pricing
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
