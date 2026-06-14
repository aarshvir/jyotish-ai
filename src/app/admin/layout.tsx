import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isCurrentUserAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isCurrentUserAdmin())) redirect('/login?next=/admin');
  return (
    <div className="min-h-screen bg-space text-star">
      <header className="border-b border-horizon/40 px-6 py-4 flex items-center gap-6 flex-wrap">
        <span className="font-display text-lg text-amber">VedicHour Admin</span>
        <nav className="flex gap-5 font-body text-body-sm text-dust">
          <Link href="/admin" className="hover:text-star transition-colors">Overview</Link>
          <Link href="/admin/revenue" className="hover:text-star transition-colors">Revenue</Link>
          <Link href="/admin/retention" className="hover:text-star transition-colors">Retention</Link>
          <Link href="/admin/acquisition" className="hover:text-star transition-colors">Acquisition</Link>
          <Link href="/admin/crm" className="hover:text-star transition-colors">Call list</Link>
          <Link href="/admin/ops" className="hover:text-star transition-colors">Ops</Link>
          <Link href="/admin/users" className="hover:text-star transition-colors">Users</Link>
          <Link href="/admin/coupons" className="hover:text-star transition-colors">Coupons</Link>
          <Link href="/admin/feedback" className="hover:text-star transition-colors">Feedback</Link>
          <Link href="/admin/newsletter" className="hover:text-star transition-colors">Newsletter</Link>
          <Link href="/admin/admins" className="hover:text-star transition-colors">Admins</Link>
        </nav>
        <Link href="/" className="ml-auto font-body text-body-sm text-dust hover:text-star transition-colors">← Back to site</Link>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
