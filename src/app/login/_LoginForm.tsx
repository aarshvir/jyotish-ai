'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function humanizeAuthError(raw: string | null | undefined): string {
  if (!raw) return '';
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'That email and password don\u2019t match. Try again or reset your password.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email first \u2014 check your inbox for a verification link.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network hiccup \u2014 check your connection and try again.';
  }
  if (msg.includes('password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('oauth') || msg.includes('provider')) {
    return 'Google sign-in failed. Please try again or use email.';
  }
  return raw;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'signup') setMode('signup');

    const qErr = searchParams.get('error_description') || searchParams.get('error');
    if (qErr) {
      setError(humanizeAuthError(decodeURIComponent(qErr)));
    }
  }, [searchParams]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');
    setInfo('');
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
      setError(humanizeAuthError(oauthErr.message));
      setGoogleLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
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
      setError(humanizeAuthError(authErr.message));
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && user.email) {
      await supabase.from('user_profiles').upsert(
        { id: user.id, email: user.email, display_name: user.email.split('@')[0] },
        { onConflict: 'id' }
      );
    }

    const next = searchParams.get('next') ?? '/dashboard';
    router.push(next);
    router.refresh();
  }

  async function handlePasswordReset() {
    setError('');
    setInfo('');
    if (!email || !email.includes('@')) {
      setError('Enter your email above, then tap "Forgot password?" to send a reset link.');
      return;
    }
    setResetSending(true);
    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      });
      if (resetErr) {
        setError(humanizeAuthError(resetErr.message));
      } else {
        setInfo('If an account exists for that email, a reset link is on its way.');
      }
    } finally {
      setResetSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-cosmos to-space flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white/[0.03] border border-amber/15 rounded-2xl p-8 sm:p-10">
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

        <div className="flex bg-white/[0.04] rounded-lg p-1 mb-6" role="group" aria-label="Authentication mode">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); setInfo(''); }}
              aria-pressed={mode === m}
              className={`flex-1 py-2 rounded-md font-body text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 ${
                mode === m ? 'bg-amber/20 text-amber' : 'text-dust hover:text-star'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

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

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="font-mono text-xs text-dust/50">or</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        <form onSubmit={(e) => void handleEmailAuth(e)} noValidate>
          <div className="mb-4">
            <label htmlFor="login-email" className="block font-body text-xs font-medium text-dust mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              className="w-full px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
            />
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block font-body text-xs font-medium text-dust">
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => void handlePasswordReset()}
                  disabled={resetSending}
                  className="font-body text-xs text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm disabled:opacity-60"
                >
                  {resetSending ? 'Sending…' : 'Forgot password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-4 pr-12 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-dust hover:text-star focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-r-lg"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M10.58 10.58A2 2 0 0013.42 13.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M16.88 16.88C15.4 17.91 13.77 18.5 12 18.5c-5 0-9-4-10-6.5.56-1.42 2.24-4 4.97-5.63M9.88 5.6c.68-.15 1.39-.23 2.12-.23 5 0 9 4 10 6.5-.32.81-.98 1.97-1.98 3.13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
            {mode === 'signup' && (
              <p className="mt-1.5 font-body text-[11px] text-dust/60">
                Use at least 6 characters. A mix of letters and numbers is stronger.
              </p>
            )}
          </div>

          {error && (
            <div role="alert" aria-live="polite" className="px-4 py-2.5 mt-4 mb-1 bg-caution/10 border border-caution/30 rounded-card font-body text-body-sm text-caution/90">
              {error}
            </div>
          )}
          {info && !error && (
            <div role="status" aria-live="polite" className="px-4 py-2.5 mt-4 mb-1 bg-success/10 border border-success/30 rounded-card font-body text-body-sm text-success">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-5 w-full py-3 min-h-[48px] bg-gradient-to-r from-amber to-amber/80 text-space font-body text-sm font-semibold rounded-lg hover:from-amber-glow hover:to-amber transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-space disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
              : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-5 text-center font-body text-xs text-dust/50 leading-relaxed">
          By continuing you agree to our{' '}
          <Link href="/terms" target="_blank" className="text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Terms</Link>
          {', '}
          <Link href="/privacy" target="_blank" className="text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Privacy</Link>
          {' & '}
          <Link href="/refund" target="_blank" className="text-amber hover:text-amber-glow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Refund Policy</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
