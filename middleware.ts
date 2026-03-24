import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Session refresh + auth checks. Protected routes (e.g. /dashboard, /auth/consent)
 * are defined in src/lib/supabase/middleware.ts (PROTECTED_PREFIXES).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
