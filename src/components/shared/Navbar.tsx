'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import AuthButton from '@/components/shared/AuthButton';
import LaunchBanner from '@/components/shared/LaunchBanner';

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
] as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-height', `${el.getBoundingClientRect().height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close menu on Escape and lock body scroll when open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div ref={wrapperRef} className="sticky top-0 z-50">
      <LaunchBanner />
      <nav
        className={`pdf-exclude transition-all duration-250 ${
          scrolled
            ? 'bg-space/85 backdrop-blur-md border-b border-horizon/40'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-5 sm:px-6 py-3">
          <Link
            href="/"
            className="group flex min-w-0 shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button"
            aria-label="VedicHour home"
          >
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className="shrink-0 text-amber" aria-hidden>
              <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
              <circle cx="14" cy="14" r="3" fill="currentColor" />
              <line x1="14" y1="1" x2="14" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              <line x1="14" y1="23" x2="14" y2="27" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              <line x1="1" y1="14" x2="5" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              <line x1="23" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.6" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-wide text-star group-hover:text-amber-light transition-colors">
              VedicHour
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-7 font-body text-body-sm text-dust lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="tracking-wide transition-colors hover:text-star focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-button px-1 py-0.5"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Desktop: auth only */}
            <div className="hidden lg:block">
              <AuthButton />
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-button text-dust hover:text-amber hover:bg-amber/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              {mobileOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="lg:hidden border-t border-horizon/40 bg-space/95 backdrop-blur-md"
          >
            <div className="mx-auto max-w-6xl px-5 py-5 flex flex-col gap-4">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-body text-body-md text-dust hover:text-amber transition-colors py-2"
                >
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-horizon/30">
                <AuthButton />
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
