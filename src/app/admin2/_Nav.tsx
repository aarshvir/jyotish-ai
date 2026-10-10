'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const LINKS = [
  { href: '/admin2', label: 'Overview' },
  { href: '/admin2/funnel', label: 'Funnel' },
  { href: '/admin2/reasons', label: 'Drop-off reasons' },
  { href: '/admin2/revenue', label: 'Revenue & payments' },
  { href: '/admin2/retention', label: 'Retention' },
  { href: '/admin2/ops', label: 'Reports & ops' },
];

/** Keeps the chosen range/filters when moving between pages. */
export function Nav() {
  const path = usePathname();
  const sp = useSearchParams();
  const qs = sp?.toString();
  return (
    <nav className="a2-nav" aria-label="Admin sections">
      {LINKS.map((l) => (
        <Link key={l.href} href={qs ? `${l.href}?${qs}` : l.href} aria-current={path === l.href ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
