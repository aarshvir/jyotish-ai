import Link from 'next/link';
import type { ReactNode } from 'react';

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-space font-body text-star">
    <header className="border-b border-horizon px-5 py-5 sm:px-8"><nav aria-label="Help navigation" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3">
      <Link href="/" className="mr-auto font-display text-2xl font-semibold text-star">VedicHour</Link>
      <Link href="/free-kundli" className="py-2 text-sm text-amber">Free chart</Link><Link href="/sample-report" className="py-2 text-sm text-dust">Example</Link><Link href="/dashboard" className="py-2 text-sm text-dust">My account</Link>
    </nav></header>
    <main id="main-content" className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
  </div>;
}
