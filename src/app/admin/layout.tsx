import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isCurrentUserAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Grouped so the portal reads coherently instead of a flat wall of 18 links.
// The five marketing-analytics views (Marketing, Campaigns, Acquisition,
// Attribution, Content) now sit together as one labelled cluster.
const NAV_GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: 'Product',
    links: [
      { href: '/admin/today', label: 'Today' },
      { href: '/admin', label: 'Overview' },
      { href: '/admin/revenue', label: 'Revenue' },
      { href: '/admin/retention', label: 'Retention' },
      { href: '/admin/insights', label: 'Insights' },
    ],
  },
  {
    label: 'Marketing',
    links: [
      { href: '/admin/marketing', label: 'Marketing' },
      { href: '/admin/campaigns', label: 'Campaigns' },
      { href: '/admin/acquisition', label: 'Acquisition' },
      { href: '/admin/attribution', label: 'Attribution' },
      { href: '/admin/content', label: 'Content' },
    ],
  },
  {
    label: 'People & Ops',
    links: [
      { href: '/admin/journeys', label: 'Journeys' },
      { href: '/admin/crm', label: 'Call list' },
      { href: '/admin/ops', label: 'Ops' },
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/coupons', label: 'Coupons' },
      { href: '/admin/newsletter', label: 'Newsletter' },
      { href: '/admin/feedback', label: 'Feedback' },
      { href: '/admin/admins', label: 'Admins' },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isCurrentUserAdmin())) redirect('/login?next=/admin');
  return (
    <div className="min-h-screen bg-space text-star">
      <header className="border-b border-horizon/40 px-6 py-4 flex items-center gap-x-5 gap-y-3 flex-wrap">
        <span className="font-display text-lg text-amber">VedicHour Admin</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-body-sm text-dust">
          {NAV_GROUPS.map((g, gi) => (
            <div key={g.label} className="flex items-center gap-x-4 gap-y-2 flex-wrap">
              {gi > 0 && <span className="text-horizon/70 select-none" aria-hidden>|</span>}
              <span className="font-mono text-mono-sm uppercase tracking-wider text-dust/40">{g.label}</span>
              {g.links.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-star transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <Link href="/" className="ml-auto font-body text-body-sm text-dust hover:text-star transition-colors">← Back to site</Link>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
