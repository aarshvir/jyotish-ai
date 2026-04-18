import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { countryToCurrency } from '@/lib/ziina/server';

/**
 * Session refresh + auth checks + currency header injection.
 * Protected routes are defined in src/lib/supabase/middleware.ts (PROTECTED_PREFIXES).
 *
 * Reads Vercel's x-vercel-ip-country header and forwards x-currency to all
 * Server Components so pricing pages can render geo-correct prices without
 * client-side skeleton loaders.
 */
export async function middleware(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') ?? '';
  const currency = countryToCurrency(country || null);

  return await updateSession(request, { 'x-currency': currency });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
