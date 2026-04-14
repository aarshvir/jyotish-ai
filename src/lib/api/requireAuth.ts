import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Trim to guard against env var stored with trailing \r\n (common in CI/Windows pipes)
const _rawBypass = (process.env.BYPASS_SECRET ?? '').trim();

if (!_rawBypass) {
  console.warn(
    '[requireAuth] BYPASS_SECRET env var is not set — bypass authentication is DISABLED. ' +
    'Set BYPASS_SECRET in your environment to enable admin bypass access.'
  );
}

/** Bypass secret — empty string means bypass is disabled */
export const BYPASS_SECRET = _rawBypass;

/** Optional UUID for Supabase rows when using bypass (must exist in auth.users if FK enforced). */
export const BYPASS_USER_ID =
  (process.env.BYPASS_USER_ID ?? '').trim() || '00000000-0000-4000-8000-000000000001';

export type AuthResult =
  | { user: { id: string; email?: string; role?: string }; isAdmin?: boolean }
  | NextResponse;

/**
 * Verifies a valid Supabase session on an API route, or a bypass token for admin/testing.
 * Prefer header `x-bypass-token` over `?bypass=` in production (URLs hit access logs).
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user } = auth;
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const url = new URL(request.url);
  const bypass =
    url.searchParams.get('bypass') || request.headers.get('x-bypass-token');

  if (BYPASS_SECRET && bypass === BYPASS_SECRET) {
    return {
      user: {
        id: BYPASS_USER_ID,
        email: 'admin@vedichour.com',
        role: 'admin',
      },
      isAdmin: true,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { user: { id: user.id, email: user.email } };
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
