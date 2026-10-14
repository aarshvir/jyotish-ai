'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { safeInternalPath } from '@/lib/url/safeInternalPath';
import { humanizeAuthError } from '@/lib/auth/humanizeAuthError';

type Busy = 'email' | 'google' | 'reset' | null;

export function AccountSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get('next'));
  const [mode, setMode] = useState<'login' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // URLSearchParams already decodes values; decoding again can throw on a literal percent.
    const raw = params.get('error_description') || params.get('error');
    if (raw) setError(humanizeAuthError(raw));
  }, [params]);

  function begin(action: Exclude<Busy, null>) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(action); setError(''); setInfo('');
    return true;
  }
  function finish() { busyRef.current = false; setBusy(null); }
  function validEmail() {
    if (!emailInput.current?.value.trim() || !emailInput.current.checkValidity()) {
      setError('Enter your account email address.'); emailInput.current?.focus(); return false;
    }
    return true;
  }
  const caught = (cause: unknown) => humanizeAuthError(cause instanceof Error ? cause.message : 'auth');

  async function emailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validEmail() || !begin('email')) return;
    try {
      const supabase = createClient();
      const credentials = { email: email.trim(), password };
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } })
        : await supabase.auth.signInWithPassword(credentials);
      if (result.error) { setError(humanizeAuthError(result.error.message)); return; }
      if (mode === 'signup' && !result.data.session) {
        setInfo('Check your inbox and spam folder for the confirmation email before signing in. If you already have an account, sign in instead.');
        return;
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { setError(humanizeAuthError(userError?.message || 'not authenticated')); return; }
      if (user.email) {
        // Preserve the existing profile-creation path without rewriting preferences.
        await supabase.from('user_profiles').upsert({ id: user.id, email: user.email }, { onConflict: 'id' });
      }
      router.push(next); router.refresh();
    } catch (cause) { setError(caught(cause)); } finally { finish(); }
  }

  async function googleAuth() {
    if (!begin('google')) return;
    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { access_type: 'offline', prompt: 'consent' } } });
      if (result.error) setError(humanizeAuthError(result.error.message));
    } catch (cause) { setError(caught(cause)); } finally { finish(); }
  }

  async function resetPassword() {
    setError(''); setInfo('');
    if (!validEmail() || !begin('reset')) return;
    try {
      const result = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login/reset')}` });
      if (result.error) setError(humanizeAuthError(result.error.message));
      else setInfo('If password recovery is available for that email, a reset link is on its way. Check your inbox and spam folder, and use the latest link.');
    } catch (cause) { setError(caught(cause)); } finally { finish(); }
  }

  return <main id="main-content" className="flex min-h-screen items-center justify-center bg-space px-5 py-10 font-body text-star">
    <div className="w-full max-w-md">
      <Link href="/" className="font-display text-3xl font-semibold text-star">VedicHour</Link>
      <h1 className="mt-6 text-2xl font-semibold">{mode === 'login' ? 'Sign in to your account' : 'Create an account'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-dust">{mode === 'login' ? 'Use the same email or Google account to find your existing reports.' : 'Already have a report? Sign in to its original account instead.'}</p>
      <div role="group" aria-label="Authentication mode" className="my-6 grid grid-cols-2 gap-1 rounded-lg border border-horizon p-1">
        {(['login', 'signup'] as const).map(value => <button key={value} type="button" disabled={!!busy} aria-pressed={mode === value} onClick={() => { setMode(value); setError(''); setInfo(''); }} className={`min-h-11 rounded-md text-sm focus-visible:ring-2 focus-visible:ring-amber ${mode === value ? 'bg-amber text-space font-semibold' : 'text-dust'}`}>{value === 'login' ? 'Sign in' : 'Create account'}</button>)}
      </div>
      <button type="button" onClick={() => void googleAuth()} disabled={!!busy} className="flex min-h-12 w-full items-center justify-center rounded-lg border border-horizon px-4 text-sm text-star focus-visible:ring-2 focus-visible:ring-amber disabled:opacity-60">{busy === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</button>
      <p className="my-5 text-center text-sm text-dust">or use email</p>
      <form onSubmit={event => void emailAuth(event)} method="post" aria-busy={busy === 'email'} className="space-y-4">
        <div><label htmlFor="login-email" className="mb-2 block text-sm font-medium">Email</label><input ref={emailInput} id="login-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" inputMode="email" disabled={!!busy} className="min-h-12 w-full rounded-lg border border-horizon bg-cosmos px-4 py-3 text-base text-star focus-visible:ring-2 focus-visible:ring-amber" /></div>
        <div><label htmlFor="login-password" className="mb-2 block text-sm font-medium">Password</label><div className="relative"><input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={mode === 'signup' ? 6 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={!!busy} aria-describedby={mode === 'signup' ? 'password-help' : undefined} className="min-h-12 w-full rounded-lg border border-horizon bg-cosmos py-3 pl-4 pr-12 text-base text-star focus-visible:ring-2 focus-visible:ring-amber" /><button type="button" disabled={!!busy} title={showPassword ? 'Hide password' : 'Show password'} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg text-dust focus-visible:ring-2 focus-visible:ring-amber">{showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}</button></div>{mode === 'signup' && <p id="password-help" className="mt-2 text-sm text-dust">Use at least 6 characters.</p>}</div>
        {error && <p role="alert" className="rounded-lg border border-caution/40 p-3 text-sm leading-relaxed text-star">{error}</p>}
        {info && !error && <p role="status" aria-live="polite" className="rounded-lg border border-success/40 p-3 text-sm leading-relaxed text-star">{info}</p>}
        <button type="submit" disabled={!!busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber px-4 py-3 text-sm font-semibold text-space focus-visible:ring-2 focus-visible:ring-star disabled:opacity-60"><LogIn aria-hidden="true" className="h-4 w-4" />{busy === 'email' ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      {mode === 'login' && <button type="button" disabled={!!busy} onClick={() => void resetPassword()} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-amber focus-visible:ring-2 focus-visible:ring-amber disabled:opacity-60"><Mail aria-hidden="true" className="h-4 w-4" />{busy === 'reset' ? 'Requesting reset...' : 'Forgot password?'}</button>}
      <p className="mt-4 text-sm leading-relaxed text-dust">By continuing, you agree to the <Link href="/terms" className="text-amber underline">Terms</Link> and <Link href="/privacy" className="text-amber underline">Privacy Policy</Link>.</p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-horizon pt-4 text-sm"><Link href="/help/sign-in" className="py-2 text-amber">Sign-in help</Link><Link href="/free-kundli" className="py-2 text-amber">Free chart without sign-in</Link><Link href="/sample-report" className="py-2 text-amber">Example reading</Link></div>
    </div>
  </main>;
}
