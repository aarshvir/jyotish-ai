'use client';

import { useCallback, useEffect, useState } from 'react';

type Admin = { email: string; added_at: string };

const inputCls =
  'rounded-md bg-cosmos border border-horizon px-3 py-2 text-star focus:border-amber/60 focus:outline-none';

export default function AdminAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [you, setYou] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/admins')
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else { setAdmins(j.admins); setYou(j.you ?? ''); }
      })
      .catch(() => setErr('Failed to load'));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? 'Failed'); return; }
    setEmail('');
    load();
  }

  async function remove(target: string) {
    await fetch('/api/admin/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target }),
    });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-star mb-2">Admins</h1>
      <p className="text-dust/60 font-mono text-mono-sm mb-6">
        Anyone listed here gets full admin access when they sign in with that email. No env var needed.
      </p>
      {err && <p className="text-caution mb-4">{err}</p>}

      <form onSubmit={add} className="card border border-horizon/40 rounded-card p-5 mb-8 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-body-sm text-dust grow min-w-[16rem]">
          Add admin by email
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
        </label>
        <button disabled={busy} className="btn-primary px-5 py-2 disabled:opacity-50">{busy ? 'Adding…' : 'Add admin'}</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-body-sm">
          <thead className="text-dust/60 font-mono text-mono-sm uppercase">
            <tr><th className="py-2 pr-4">Email</th><th className="pr-4">Added</th><th></th></tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email} className="border-t border-horizon/30">
                <td className="py-2 pr-4 text-star">{a.email}{a.email === you ? <span className="text-dust/50"> (you)</span> : null}</td>
                <td className="pr-4 text-dust/60">{a.added_at ? a.added_at.slice(0, 10) : '—'}</td>
                <td>{a.email === you ? <span className="text-dust/40">—</span> : <button onClick={() => remove(a.email)} className="text-caution hover:underline">Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
