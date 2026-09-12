'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { humanizeAuthError } from '@/lib/auth/humanizeAuthError';
import { createOrSignIn, MIN_PASSWORD_LENGTH } from '@/lib/onboard/deliveryAuth';

/**
 * "Where should we send your chart?"
 *
 * Shown when a logged-out visitor presses the final button on /onboard — after they have already
 * typed their birth details — instead of the signup wall that used to stand in front of the form.
 * The account is still created (a report needs an owner), but it reads as delivery, not as a gate.
 *
 * Styling mirrors PaymentHandoff: same sheet, same tokens, so the two moments in the funnel feel
 * like one product.
 */

export interface DeliveryGateProps {
  defaultEmail?: string;
  onCancel: () => void;
  /** Called once the visitor has a live session — the parent continues the submit it paused. */
  onAuthed: () => void;
  /** Called just before the Google redirect — the parent stashes the form so it survives the round trip. */
  onGoogle: () => void;
}

const RESUME_PATH = '/onboard?resume=1';

export function DeliveryGate({ defaultEmail = '', onCancel, onAuthed, onGoogle }: DeliveryGateProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Land keyboard and screen-reader users in the first field, and let Escape back out: this sits
  // between a visitor and their chart, so it must never feel like a trap.
  useEffect(() => {
    (defaultEmail ? passwordRef : emailRef).current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [defaultEmail, onCancel]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setInfo('');
    const result = await createOrSignIn(
      createClient().auth,
      email,
      password,
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(RESUME_PATH)}`,
    );
    if (result.ok) {
      onAuthed();
      return;
    }
    setLoading(false);
    if (result.reason === 'confirm_email') {
      setInfo(result.message);
      return;
    }
    setError(result.message);
    if (result.reason === 'existing_account') {
      setPassword('');
      passwordRef.current?.focus();
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');
    setInfo('');
    onGoogle();
    const { error: oauthErr } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(RESUME_PATH)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (oauthErr) {
      setError(humanizeAuthError(oauthErr.message));
      setGoogleLoading(false);
    }
  }

  const busy = loading || googleLoading;
  const inputClass =
    'w-full px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star placeholder:text-dust/40 focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/30 transition-colors';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-gate-title"
    >
      <div className="w-full sm:max-w-md bg-cosmos border border-horizon rounded-t-card sm:rounded-card p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <h2 id="delivery-gate-title" className="font-body font-semibold text-star text-headline-sm mb-1">
          Where should we send your chart?
        </h2>
        <p className="font-body text-body-sm text-dust mb-5">
          Your details are in. Add an email so your chart is saved to you and you can come back to it
          any time.
        </p>

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 py-3 min-h-[48px] bg-white/[0.06] border border-white/10 rounded-lg font-body text-sm font-medium text-star hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
          </svg>
          {googleLoading ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-4" aria-hidden="true">
          <span className="h-px flex-1 bg-horizon" />
          <span className="font-body text-body-sm text-dust">or</span>
          <span className="h-px flex-1 bg-horizon" />
        </div>

        <form onSubmit={(e) => void handleEmail(e)} noValidate>
          <label htmlFor="delivery-email" className="block font-body text-body-sm text-dust-light mb-1.5">
            Email
          </label>
          <input
            ref={emailRef}
            id="delivery-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            className={`${inputClass} mb-4`}
          />

          <label htmlFor="delivery-password" className="block font-body text-body-sm text-dust-light mb-1.5">
            Choose a password
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="delivery-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              aria-describedby="delivery-password-hint"
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-body text-body-sm text-dust hover:text-star"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p id="delivery-password-hint" className="font-body text-body-sm text-dust mt-1.5 mb-4">
            At least {MIN_PASSWORD_LENGTH} characters. Already have an account? Use that password.
          </p>

          {error && (
            <p role="alert" className="font-body text-body-sm text-caution mb-4">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="font-body text-body-sm text-success mb-4">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="block w-full text-center rounded-card bg-amber text-ink font-body font-semibold text-body-md py-3.5 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber/60 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Show my chart'}
          </button>
        </form>

        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="block w-full text-center font-body text-body-sm text-dust hover:text-dust-light py-3 mt-1"
        >
          Go back
        </button>

        <p className="font-body text-body-sm text-dust/70 text-center mt-2">
          Free, no card needed. By continuing you agree to our{' '}
          <Link href="/terms" className="underline hover:text-dust-light">Terms</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-dust-light">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
