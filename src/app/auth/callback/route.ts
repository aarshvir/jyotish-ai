import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

/**
 * OAuth / magic-link return handler.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(origin + '/login?error=auth');
  }

  const dest = origin + (next.startsWith('/') ? next : '/' + next);
  let response = NextResponse.redirect(dest);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.redirect(dest);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth callback exchange:', error.message);
    return NextResponse.redirect(origin + '/login?error=auth');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    const email = user.email ?? '';
    const meta = user.user_metadata as Record<string, string | undefined> | undefined;
    const displayName = meta?.full_name ?? meta?.name ?? meta?.given_name ?? email.split('@')[0] ?? 'User';
    const { error: upsertErr } = await supabase.from('user_profiles').upsert(
      { id: user.id, email, display_name: displayName },
      { onConflict: 'id' }
    );
    if (upsertErr) console.error('user_profiles upsert:', upsertErr.message);
  }

  return response;
}
