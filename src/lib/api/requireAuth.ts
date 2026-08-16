import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJobToken } from '@/lib/api/jobToken';
import { isAdmin } from '@/lib/admin/isAdmin';
import { isProductionRuntime } from '@/lib/env';
import { isBypassAllowedForPath, isJobTokenAllowedForPath } from '@/lib/api/bypassPolicy';

// Trim to guard against env var stored with trailing \r\n (common in CI/Windows pipes)
const _rawBypass = (process.env.BYPASS_SECRET ?? '').trim();

if (!_rawBypass) {
  console.warn(
    '[requireAuth] BYPASS_SECRET env var is not set — bypass authentication is DISABLED. ' +
    'Set BYPASS_SECRET in your environment to enable non-production e2e bypass access.'
  );
}

/** Bypass secret — empty string means bypass is disabled */
export const BYPASS_SECRET = _rawBypass;

/** Optional UUID for Supabase rows when using bypass (must exist in auth.users if FK enforced). */
export const BYPASS_USER_ID =
  (process.env.BYPASS_USER_ID ?? '').trim() || '00000000-0000-4000-8000-000000000001';

/**
 * Set `BYPASS_ALLOW_IN_PRODUCTION=true` only while running the production e2e matrix —
 * see `bypassPolicy.ts` for why production refuses the static secret by default.
 */
function bypassAllowedInProduction(): boolean {
  return (process.env.BYPASS_ALLOW_IN_PRODUCTION ?? '').trim() === 'true';
}

export type AuthResult =
  | {
      user: { id: string; email?: string; role?: string };
      isAdmin?: boolean;
      job?: { reportId: string; purpose: string; correlationId?: string };
    }
  | NextResponse;

/**
 * Verifies a valid Supabase session on an API route, or an internal token for the
 * generation pipeline / e2e scripts.
 *
 * Token rules (all deliberate — do not relax):
 *  - The bypass secret is read from the `x-bypass-token` HEADER only. It is NEVER
 *    read from the query string: `?bypass=` lands in access logs, Referer headers,
 *    CDN logs and browser history.
 *  - A bypass token authenticates as a NON-ADMIN service principal. Admin powers
 *    (cross-user report access, trusting a client-supplied payment_status) require
 *    a real signed-in admin session.
 *  - Bypass and job tokens are accepted only on the routes they exist for.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user } = auth;
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const pathname = request.nextUrl.pathname;
  const bypass = request.headers.get('x-bypass-token');

  if (
    BYPASS_SECRET &&
    bypass === BYPASS_SECRET &&
    isBypassAllowedForPath(pathname, {
      isProduction: isProductionRuntime(),
      allowInProduction: bypassAllowedInProduction(),
    })
  ) {
    return {
      user: {
        id: BYPASS_USER_ID,
        email: 'pipeline@vedichour.com',
        role: 'service',
      },
      isAdmin: false,
    };
  }

  const jobToken = isJobTokenAllowedForPath(pathname)
    ? verifyJobToken(request.headers.get('x-job-token'))
    : null;
  if (jobToken) {
    return {
      user: {
        id: jobToken.userId,
        email: 'pipeline@vedichour.com',
        role: 'service',
      },
      isAdmin: false,
      job: {
        reportId: jobToken.reportId,
        purpose: jobToken.purpose,
        correlationId: jobToken.correlationId,
      },
    };
  }

  // Internal pipeline calls (Inngest worker → Next.js agent routes) authenticate
  // with the Supabase service-role key instead of a user session.
  // This avoids dependency on BYPASS_SECRET for server-to-server calls.
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const internalKey = request.headers.get('x-service-key');
  if (serviceKey && internalKey && internalKey === serviceKey) {
    return {
      user: {
        id: BYPASS_USER_ID,
        email: 'pipeline@vedichour.com',
        role: 'service',
      },
      isAdmin: false,
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
    return {
      user: { id: user.id, email: user.email },
      isAdmin: await isAdmin(user.email),
    };
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
