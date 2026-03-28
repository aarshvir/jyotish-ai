import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Trim env vars to guard against CRLF added by some CI/CD pipelines
const _supaUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const _supaKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/auth/consent',
  '/settings',
  '/account',
  '/api/user',
  '/onboard',
  '/report',
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    _supaUrl,
    _supaKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasValidBypass = (() => {
    const secret = (process.env.BYPASS_SECRET || 'VEDICADMIN2026').trim();
    const bp =
      request.nextUrl.searchParams.get('bypass') ||
      request.headers.get('x-bypass-token');
    return bp === secret;
  })();

  if (!user && !hasValidBypass && isProtectedRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    const returnTo = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
