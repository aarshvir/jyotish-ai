import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/isAdmin';

/**
 * Admin gate. Admin status is granted to emails in the portal-managed admin_users
 * table (DB-first) or the optional ADMIN_EMAILS env — never a shared password.
 * Used by every /admin page (layout redirect) and every /api/admin route (403).
 */

/** API routes: returns the admin's {id,email} or a 403 NextResponse. */
export async function requireAdminApi(): Promise<{ id: string; email: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { id: user.id, email: user.email };
}

/** Server pages: true if the current signed-in user is an admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdmin(user?.email);
}
