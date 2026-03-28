import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Verifies a valid Supabase session on an API route.
 * Returns { user } on success, or a 401 NextResponse to return immediately.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user } = auth;
 */
export async function requireAuth(
  _req: NextRequest
): Promise<{ user: { id: string; email?: string } } | NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { user: { id: user.id, email: user.email } };
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
