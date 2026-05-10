import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cleanEnv } from '@/lib/env';

// Normalize env vars to guard against copied CRLF suffixes in deployment secrets.
const _supaUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const _supaKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Exact paths or prefix segments — must match full path segment to avoid
// false positives like '/report' matching '/reports/start' (an API route).
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
  return PROTECTED_PREFIXES.some((prefix) => {
    // Exact match OR prefix followed by '/' (segment boundary)
    return pathname === prefix || pathname.startsWith(prefix + '/');
  });
}

export async function updateSession(
  request: NextRequest,
  extraRequestHeaders?: Record<string, string>,
) {
  // Merge any extra headers (e.g. x-currency from geo detection) into the
  // forwarded request so Server Components can read them via headers().
  const forwardHeaders = new Headers(request.headers);
  if (extraRequestHeaders) {
    for (const [k, v] of Object.entries(extraRequestHeaders)) {
      forwardHeaders.set(k, v);
    }
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: forwardHeaders },
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
            request: { headers: forwardHeaders },
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
    const secret = cleanEnv(process.env.BYPASS_SECRET);
    if (!secret) return false;
    const bp = request.headers.get('x-bypass-token');
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
