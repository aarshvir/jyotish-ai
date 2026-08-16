'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message.includes('session')
        ? 'This reset link expired or was already used. Request a new one from Sign In.'
        : updateErr.message);
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-cosmos to-space flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white/[0.03] border border-amber/15 rounded-2xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block font-display font-semibold text-2xl tracking-[0.08em] text-amber">
            VedicHour
          </Link>
          <p className="font-body text-sm text-dust mt-2">Choose a new password</p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label htmlFor="new-password" className="block font-body text-xs font-medium text-dust mb-1.5">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star"
          />
          <label htmlFor="confirm-password" className="block font-body text-xs font-medium text-dust mb-1.5">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full mb-4 px-4 py-3 min-h-[48px] bg-white/[0.05] border border-white/10 rounded-lg font-body text-sm text-star"
          />
          {error && <p className="mb-4 font-body text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 min-h-[48px] bg-gradient-to-r from-amber to-amber/80 text-space font-body text-sm font-semibold rounded-lg disabled:opacity-50">
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
        <p className="mt-6 text-center font-body text-xs text-dust">
          <Link href="/login" className="text-amber hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
