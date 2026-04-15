'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'signup') setMode('signup');
  }, [searchParams]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');
    const supabase = createClient();
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard';
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthErr) {
      setError(oauthErr.message);
      setGoogleLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    let result;
    if (mode === 'signup') {
      result = await supabase.auth.signUp({ email, password });
      if (!result.error) {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    const { error: authErr } = result;
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && user.email) {
      await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          email: user.email,
          display_name: user.email.split('@')[0],
        },
        { onConflict: 'id' }
      );
    }

    const next = searchParams.get('next') ?? '/dashboard';
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-dark to-space flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white/[0.03] border border-amber/15 rounded-2xl p-8 sm:p-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block font-display font-semibold text-2xl tracking-[0.08em] text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 rounded-sm"
          >
            VedicHour
          </Link>
          <p className="font-body text-sm text-dust mt-2">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-white/[0.04] rounded-lg p-1 mb-6" role="group" aria-label="Authentication mode">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`flex-1 py-2 rounded-md font-body text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 ${
                mode === m
                  ? 'bg-amber/20 text-amber'
                  : 'text-dust hover:text-star'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={googleLoading || loading}
          aria-label="Continue with Google"
          className="w-full flex items-center justify-center gap-2.5 py-3 min-h-[48px] bg-white/[0.06] border border-white/10 rounded-lg font-body text-sm font-medium text-star hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 disabled:opacity-60 disabled:cursor-not-allowed mb-5"
        >
          {googleLoading ? (
            <span className="font-mono text-xs text-dust">Redirecting to Google…</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="font-mono text-xs text-dust/50">or</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* Email / password form */}
        <form onSubmit={(e) => void handleEmailAuth(e)} noValidate>
          <div className="mb-3.5">
            <label htmlFor="login-email" className="sr-only">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              autoComplete="email"
              className="w-full px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="login-password" className="sr-only">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="px-4 py-2.5 mb-4 bg-caution/10 border border-caution/30 rounded-card font-body text-body-sm text-caution/90"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 min-h-[48px] bg-gradient-to-r from-amber to-amber/80 text-space font-body text-sm font-semibold rounded-lg hover:from-amber-glow hover:to-amber transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-space disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
              : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-5 text-center font-body text-xs text-dust/50 leading-relaxed">
          By continuing you agree to our{' '}
          <Link href="/terms" target="_blank" className="text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">
            Terms
          </Link>
          {', '}
          <Link href="/privacy" target="_blank" className="text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">
            Privacy
          </Link>
          {' & '}
          <Link href="/refund" target="_blank" className="text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">
            Refund Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-space flex items-center justify-center">
          <span className="font-mono text-sm text-amber animate-pulse">Loading…</span>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
