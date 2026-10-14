import AccountDashboard from '@/components/dashboard/AccountDashboard';
import { isCommercialCheckoutEnabled } from '@/lib/commercial/availability';
import { createClient } from '@/lib/supabase/server';
import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: { tab?: string } }) {
  const auth = await createClient().then(client => client.auth.getUser()).catch(() => null);
  if (auth && !auth.data.user && (!auth.error || isAuthSessionMissingError(auth.error))) {
    const tab = ['reports', 'payments', 'settings'].includes(searchParams.tab ?? '') ? searchParams.tab : null;
    const next = tab ? `/dashboard?tab=${tab}` : '/dashboard';
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  // Real service failures reach the client's retry state, not an invented signed-out state.
  return <AccountDashboard checkoutEnabled={isCommercialCheckoutEnabled()} />;
}
