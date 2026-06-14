import { createServiceClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/bypass';

/**
 * Admin check, DB-first so admins are managed from the portal (admin_users table) —
 * no ADMIN_EMAILS env var required. ADMIN_EMAILS is still honoured as an optional
 * fallback for anyone who prefers env config. Bootstrap once in the SQL editor:
 *   INSERT INTO public.admin_users (email) VALUES ('you@example.com') ON CONFLICT DO NOTHING;
 */
export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (isAdminEmail(e)) return true; // optional env fallback
  try {
    const db = createServiceClient();
    const { data } = await db.from('admin_users').select('email').eq('email', e).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
