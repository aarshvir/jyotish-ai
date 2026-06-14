'use client';

import { useCallback, useEffect, useState } from 'react';

type Code = {
  id: string;
  code: string;
  discount_pct: number;
  max_uses: number | null;
  used_count: number;
  allowlist_emails: string[] | null;
  active: boolean;
  expires_at: string | null;
};

const inputCls =
  'rounded-md bg-cosmos border border-horizon px-3 py-2 text-star focus:border-amber/60 focus:outline-none';

export default function AdminCoupons() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pct, setPct] = useState('30');
  const [allow, setAllow] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/promo')
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setCodes(j.codes)))
      .catch(() => setErr('Failed to load'));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(c: Code) {
    await fetch('/api/admin/promo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: c.code, active: !c.active }),
    });
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const emails = allow.split(',').map((s) => s.trim()).filter(Boolean);
    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, discount_pct: Number(pct), allowlist_emails: emails.length ? emails : null }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? 'Failed to save'); return; }
    setCode('');
    setPct('30');
    setAllow('');
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-star mb-6">Coupons</h1>
      {err && <p className="text-caution mb-4">{err}</p>}

      <form onSubmit={create} className="card border border-horizon/40 rounded-card p-5 mb-8 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-body-sm text-dust">
          Code
          <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER20" />
        </label>
        <label className="flex flex-col text-body-sm text-dust">
          Discount %
          <input className={inputCls} type="number" min="1" max="100" value={pct} onChange={(e) => setPct(e.target.value)} />
        </label>
        <label className="flex flex-col text-body-sm text-dust grow min-w-[14rem]">
          Restrict to emails (optional, comma-separated)
          <input className={inputCls} value={allow} onChange={(e) => setAllow(e.target.value)} placeholder="blank = everyone" />
        </label>
        <button disabled={busy} className="btn-primary px-5 py-2 disabled:opacity-50">{busy ? 'Saving…' : 'Add / update'}</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-body-sm">
          <thead className="text-dust/60 font-mono text-mono-sm uppercase">
            <tr>
              <th className="py-2 pr-4">Code</th>
              <th className="pr-4">Disc</th>
              <th className="pr-4">Used</th>
              <th className="pr-4">Limit</th>
              <th className="pr-4">Restricted to</th>
              <th className="pr-4">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-horizon/30">
                <td className="py-2 pr-4 font-mono text-amber">{c.code}</td>
                <td className="pr-4">{c.discount_pct}%</td>
                <td className="pr-4">{c.used_count}</td>
                <td className="pr-4">{c.max_uses ?? '∞'}</td>
                <td className="pr-4 text-dust/70">{c.allowlist_emails?.length ? c.allowlist_emails.join(', ') : 'everyone'}</td>
                <td className="pr-4">{c.active ? <span className="text-success">active</span> : <span className="text-dust/50">disabled</span>}</td>
                <td>
                  <button onClick={() => toggle(c)} className="text-amber hover:underline">
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
