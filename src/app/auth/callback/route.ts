import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { sendWelcomeEmail } from '@/lib/notify/welcome';

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

  // Guard against open redirect via //evil.com — allow only paths starting with a single slash
  // followed by a non-slash character (no protocol-relative URLs).
  const safePath = /^\/[^/]/.test(next) ? next : '/dashboard';
  const dest = origin + safePath;
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
    // Detect first-time sign-in so the welcome email is sent exactly once.
    const { data: existingProfile } = await supabase.from('user_profiles').select('id').eq('id', user.id).maybeSingle();
    const { error: upsertErr } = await supabase.from('user_profiles').upsert(
      { id: user.id, email, display_name: displayName },
      { onConflict: 'id' }
    );
    if (upsertErr) console.error('user_profiles upsert:', upsertErr.message);
    if (!existingProfile && email) {
      // New account → one-time welcome email (gated on RESEND_API_KEY; never throws).
      await sendWelcomeEmail(email, displayName);
    }
    // First-touch attribution: persist the channel that brought this user (from the
    // vh_first_touch cookie). New users only; tolerant of DBs without the columns yet.
    if (!existingProfile) {
      try {
        const raw = request.cookies.get('vh_first_touch')?.value;
        if (raw) {
          let ft: { s?: string; m?: string; c?: string; r?: string; l?: string; t?: string };
          try { ft = JSON.parse(raw); } catch { ft = JSON.parse(decodeURIComponent(raw)); }
          const { error: ftErr } = await supabase.from('user_profiles').update({
            first_touch_source: ft.s ?? null,
            first_touch_medium: ft.m ?? null,
            first_touch_campaign: ft.c ?? null,
            first_touch_referrer: ft.r ?? null,
            first_touch_landing: ft.l ?? null,
            first_touch_at: ft.t ?? null,
          }).eq('id', user.id);
          if (ftErr && !/(first_touch|column|schema cache)/.test(ftErr.message ?? '')) {
            console.warn('first_touch persist:', ftErr.message);
          }
        }
      } catch { /* never break auth */ }
    }
  }

  return response;
}
