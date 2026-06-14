'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Footer from '@/components/shared/Footer';

export default function AccountPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function deleteAccount() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error ?? 'Could not delete account.');
        setBusy(false);
        return;
      }
      try { await createClient().auth.signOut(); } catch { /* ignore */ }
      router.replace('/?deleted=1');
    } catch {
      setErr('Network error. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-space text-star flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto px-5 sm:px-8 py-16 w-full">
        <h1 className="font-display text-3xl text-star mb-2">Your account &amp; privacy</h1>
        <p className="font-body text-body-md text-dust mb-10">Manage your personal data. VedicHour stores your birth details to compute your charts — you control them here.</p>

        <section className="card border border-horizon/40 rounded-card p-6 mb-6">
          <h2 className="font-display text-xl text-star mb-2">Export your data</h2>
          <p className="font-body text-body-sm text-dust mb-4">Download everything we hold about you (profile, reports, charts, payments) as a JSON file.</p>
          <a href="/api/account/export" className="btn-secondary inline-block px-6 py-2.5">Download my data</a>
        </section>

        <section className="card border border-error/30 rounded-card p-6 bg-error/[0.03]">
          <h2 className="font-display text-xl text-star mb-2">Delete your account</h2>
          <p className="font-body text-body-sm text-dust mb-4">
            This permanently deletes your account, birth details, reports and charts. Payment records are kept (de-identified) for legal/tax purposes. This cannot be undone.
          </p>
          <label className="block font-body text-body-sm text-dust mb-2">
            Type <strong className="text-star">DELETE</strong> to confirm:
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="cosmic-input mt-1"
              placeholder="DELETE"
              autoComplete="off"
            />
          </label>
          {err && <p className="text-caution text-body-sm mb-3">{err}</p>}
          <button
            type="button"
            disabled={confirm !== 'DELETE' || busy}
            onClick={() => void deleteAccount()}
            className="mt-2 px-6 py-2.5 rounded-button bg-error/80 text-white font-body text-body-sm font-semibold disabled:opacity-40 hover:bg-error transition-colors"
          >
            {busy ? 'Deleting…' : 'Permanently delete my account'}
          </button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
