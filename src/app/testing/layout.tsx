export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/admin/guard';

export const metadata: Metadata = {
  title: 'Report-gen test harness',
  robots: { index: false, follow: false },
};

// Admin-only gate (server-side). The page is a client component that does NOT
// re-check, so this layout redirect is the protection — mirrors /admin.
export default async function TestingLayout({ children }: { children: React.ReactNode }) {
  if (!(await isCurrentUserAdmin())) redirect('/login?next=/testing');
  return <>{children}</>;
}
