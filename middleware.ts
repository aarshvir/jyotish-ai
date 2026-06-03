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
  // Currency precedence: the user's manual pick (vh_currency cookie, set by
  // <CurrencySwitcher />) wins over geo-IP so server-rendered prices match what
  // the user selected on the landing page — and what checkout will actually
  // charge (create-intent honours the same cookie/body precedence).
  const cookieCurrency = request.cookies.get('vh_currency')?.value;
  const currency =
    cookieCurrency === 'USD' || cookieCurrency === 'INR' || cookieCurrency === 'AED'
      ? cookieCurrency
      : countryToCurrency(request.headers.get('x-vercel-ip-country') || null);

  return await updateSession(request, { 'x-currency': currency });
}

export const config = {
  matcher: [
    /*
     * Exclude:
     *  - Next.js internals (_next/static, _next/image)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - Static assets (.svg .png .jpg .jpeg .gif .webp .ico .xml .txt)
     *  - .well-known
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt)$).*)',
  ],
};
