'use client';

import { useState } from 'react';

export function NewsletterSignup({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? 'Something went wrong.'); return; }
      setDone(true);
    } catch {
      setErr('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="font-body text-body-sm text-success">Thanks — you&apos;re on the list. ✨</p>;

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email for weekly Vedic timing tips"
        className="flex-1 rounded-md bg-cosmos border border-horizon px-3 py-2 text-star text-body-sm placeholder:text-dust/40 focus:border-amber/60 focus:outline-none"
      />
      <button type="submit" disabled={busy} className="btn-primary px-5 py-2 text-body-sm disabled:opacity-50 shrink-0">
        {busy ? '…' : 'Subscribe'}
      </button>
      {err && <p className="text-caution text-body-sm w-full">{err}</p>}
    </form>
  );
}
