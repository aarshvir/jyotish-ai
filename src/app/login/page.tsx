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
    const next = new URLSearchParams(window.location.search).get('next') ?? '/auth/consent';
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
      await supabase.from('users').upsert(
        {
          id: user.id,
          email: user.email,
          name: user.email.split('@')[0],
        },
        { onConflict: 'id' }
      );
    }

    const next = searchParams.get('next') ?? '/auth/consent';
    router.push(next);
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: '16px',
          padding: '40px 36px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#d4af37',
                fontFamily: 'Georgia, serif',
                marginBottom: '8px',
              }}
            >
              VedicHour
            </div>
          </Link>
          <p style={{ fontSize: '14px', color: '#6b6350' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '24px',
          }}
        >
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                background: mode === m ? 'rgba(212,175,55,0.2)' : 'transparent',
                color: mode === m ? '#d4af37' : '#6b6350',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={googleLoading || loading}
          style={{
            width: '100%',
            padding: '13px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: '#e8e0d0',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px',
            opacity: googleLoading ? 0.7 : 1,
          }}
        >
          {googleLoading ? (
            <span style={{ fontSize: '13px' }}>Redirecting to Google...</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '12px', color: '#4a4435' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <form onSubmit={(e) => void handleEmailAuth(e)}>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email address"
              style={{
                width: '100%',
                padding: '11px 14px',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e8e0d0',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              minLength={6}
              style={{
                width: '100%',
                padding: '11px 14px',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e8e0d0',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                marginBottom: '14px',
                background: 'rgba(220,50,50,0.1)',
                border: '1px solid rgba(220,50,50,0.3)',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#e88080',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{
              width: '100%',
              padding: '13px',
              background: 'linear-gradient(135deg, #d4af37, #b8962e)',
              color: '#0a0a1a',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? mode === 'signup'
                ? 'Creating account...'
                : 'Signing in...'
              : mode === 'signup'
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#4a4435',
            lineHeight: 1.6,
          }}
        >
          By continuing you agree to our{' '}
          <Link href="/terms" target="_blank" style={{ color: '#d4af37', textDecoration: 'none' }}>
            Terms
          </Link>
          {', '}
          <Link href="/privacy" target="_blank" style={{ color: '#d4af37', textDecoration: 'none' }}>
            Privacy
          </Link>
          {' & '}
          <Link href="/refund" target="_blank" style={{ color: '#d4af37', textDecoration: 'none' }}>
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
        <div
          style={{
            minHeight: '100vh',
            background: '#0a0a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d4af37',
          }}
        >
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
