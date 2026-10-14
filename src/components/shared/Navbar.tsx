'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Compass, Menu, UserRound, X } from 'lucide-react';
import LaunchBanner from './LaunchBanner';

const links = [
  { href: '/sample-report', label: 'Example reading' },
  { href: '/methodology', label: 'Method' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Journal' },
  { href: '/help', label: 'Help' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', onResize);
    return () => desktop.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <header ref={headerRef} className="public-header sticky top-0 z-50 pdf-exclude">
      <LaunchBanner />
      <nav aria-label="Main navigation" className="public-navigation">
        <div className="public-container public-nav-row">
          <Link href="/" className="public-wordmark" aria-label="VedicHour home">
            <Compass size={24} aria-hidden="true" /><span>VedicHour</span>
          </Link>
          <div className="hidden lg:flex items-center gap-5">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="public-nav-link" aria-current={pathname === href ? 'page' : undefined}>{label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="public-nav-account hidden lg:inline-flex">
              <UserRound size={17} aria-hidden="true" /> Your reports
            </Link>
            <Link href="/free-kundli" className="public-nav-chart">
              Free chart <ArrowRight size={16} aria-hidden="true" className="hidden sm:block" />
            </Link>
            <button ref={toggleRef} type="button" title={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen} aria-controls="public-mobile-navigation"
              onClick={() => setMobileOpen((open) => !open)} className="public-nav-toggle lg:hidden">
              {mobileOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div id="public-mobile-navigation" hidden={!mobileOpen} className="public-mobile-navigation lg:hidden">
          <div className="public-container py-3">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="public-mobile-link" onClick={() => setMobileOpen(false)}
                aria-current={pathname === href ? 'page' : undefined}>{label}<ArrowRight size={16} aria-hidden="true" /></Link>
            ))}
            <Link href="/dashboard" className="public-mobile-link" onClick={() => setMobileOpen(false)}>
              Your reports <UserRound size={17} aria-hidden="true" />
            </Link>
            <Link href="/account" className="public-mobile-link" onClick={() => setMobileOpen(false)}>
              Account and saved details <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
