import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { isCurrentUserAdmin } from '@/lib/admin/guard';
import { Nav } from './_Nav';
import './admin2.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

/** Same gate as /admin: admin_users table (or ADMIN_EMAILS) — never a shared password. */
export default async function Admin2Layout({ children }: { children: React.ReactNode }) {
  // Local-only preview switch so the dashboard can be checked with `next dev` without signing in.
  // NODE_ENV is always 'production' in a deployed build, so this can never open the live site.
  const localPreview = process.env.NODE_ENV === 'development' && process.env.ADMIN2_LOCAL_PREVIEW === '1';
  if (!localPreview && !(await isCurrentUserAdmin())) redirect('/login?next=/admin2');
  return (
    <div className="a2">
      <header className="a2-top">
        <div className="a2-top-inner">
          <span className="a2-brand">
            VedicHour <span>admin</span>
          </span>
          <Suspense fallback={null}>
            <Nav />
          </Suspense>
        </div>
      </header>
      <main className="a2-main">{children}</main>
    </div>
  );
}
