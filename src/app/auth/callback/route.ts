import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * OAuth / magic-link return handler. Sets session cookies on the redirect response.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/auth/consent';
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  let response = NextResponse.redirect(`${origin}${next.startsWith('/') ? next : `/${next}`}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.redirect(`${origin}${next.startsWith('/') ? next : `/${next}`}`);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth callback exchange:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    const email = user.email ?? '';
    const meta = user.user_metadata as Record<string, string | undefined> | undefined;
    const name =
      meta?.full_name ??
      meta?.name ??
      meta?.given_name ??
      email.split('@')[0] ??
      'User';
    const { error: upsertErr } = await supabase.from('users').upsert(
      { id: user.id, email, name },
      { onConflict: 'id' }
    );
    if (upsertErr) {
      console.error('users upsert on OAuth:', upsertErr.message);
    }
  }

  return response;
}
