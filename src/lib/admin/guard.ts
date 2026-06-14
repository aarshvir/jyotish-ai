import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/bypass';

/**
 * Admin gate. Admin status is granted ONLY to emails listed in the ADMIN_EMAILS
 * env var (via isAdminEmail) — never a shared password. Used by every /admin page
 * (layout redirect) and every /api/admin route (403). Both layers enforce it.
 */

/** API routes: returns the admin's {id,email} or a 403 NextResponse. */
export async function requireAdminApi(): Promise<{ id: string; email: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { id: user.id, email: user.email };
}

/** Server pages: true if the current signed-in user is an admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return Boolean(user?.email && isAdminEmail(user.email));
}
