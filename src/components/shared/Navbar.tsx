'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`pdf-exclude fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-space/80 backdrop-blur-md border-b border-horizon/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <svg
            width="28" height="28" viewBox="0 0 28 28" fill="none"
            className="text-amber"
          >
            <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            <circle cx="14" cy="14" r="9"  stroke="currentColor" strokeWidth="0.8" opacity="0.8" />
            <circle cx="14" cy="14" r="3"  fill="currentColor" />
            <line x1="14" y1="1"  x2="14" y2="5"  stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="14" y1="23" x2="14" y2="27" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="1"  y1="14" x2="5"  y2="14" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="23" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          </svg>
          <span className="font-display font-semibold text-xl tracking-[0.12em] text-star group-hover:text-amber-glow transition-colors">
            JYOTISH AI
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-body text-dust">
          <Link href="#how-it-works" className="hover:text-star transition-colors tracking-wide">
            How It Works
          </Link>
          <Link href="/pricing" className="hover:text-star transition-colors tracking-wide">
            Pricing
          </Link>
        </div>

        {/* CTA */}
        <Link
          href="/onboard"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-sm bg-amber text-space text-sm font-body font-medium tracking-wide hover:bg-amber-glow transition-colors duration-200"
        >
          Get Report
        </Link>
      </div>
    </nav>
  );
}
