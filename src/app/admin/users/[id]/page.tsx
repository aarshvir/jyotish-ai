'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Detail = {
  user: { id: string; email: string; created_at?: string; last_sign_in_at?: string } | null;
  acquisition: { referrer: string | null; utm: Record<string, string> | null; entryPage: string | null; lastPage: string | null };
  logins: number;
  pageViewCount: number;
  pages: { path: string; count: number }[];
  journey: { name: string; path: string | null; at: string }[];
  reports: { id: string; plan_type: string; status: string; payment_status: string; native_name: string; birth_date: string; phone?: string | null; created_at: string }[];
  kundalis: { id: string; person: Record<string, unknown>; overview: string; life_areas: Record<string, string>; year_outlook: { year: number; text: string }[]; doshas: Record<string, unknown>; created_at: string }[];
  synastries: { id: string; partner_a: Record<string, unknown>; partner_b: Record<string, unknown>; ashtakoot: Record<string, unknown>; commentary: string | null; created_at: string }[];
  payments: { plan_type: string; amount: number; currency: string; status: string; created_at: string }[];
};

const money = (c: string, m: number) => {
  const v = m / 100;
  if (c === 'INR') return `₹${Math.round(v).toLocaleString('en-IN')}`;
  if (c === 'AED') return `AED ${v.toFixed(2)}`;
  return `$${v.toFixed(2)}`;
};
const d = (s?: string | null) => (s ? new Date(s).toLocaleString() : '—');

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card border border-horizon/40 rounded-card p-4">
      <div className="font-mono text-mono-sm text-dust/50 uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl text-amber mt-1 break-words">{value}</div>
    </div>
  );
}

export default function AdminUserDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/user-detail?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setData(j)))
      .catch(() => setErr('Failed to load'));
  }, [id]);

  if (err) return <p className="text-caution">{err}</p>;
  if (!data) return <p className="text-dust">Loading…</p>;

  const totalPaid: Record<string, number> = {};
  for (const p of data.payments) if (p.status === 'completed') totalPaid[p.currency] = (totalPaid[p.currency] ?? 0) + p.amount;

  const contactPhone = data.reports.find((r) => r.phone && r.phone.trim())?.phone?.trim() ?? null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="font-body text-body-sm text-dust hover:text-star">← All users</Link>
        <h1 className="font-display text-3xl text-star mt-2">{data.user?.email}</h1>
        <p className="font-mono text-mono-sm text-dust/50 mt-1">
          Joined {d(data.user?.created_at)} · Last seen {d(data.user?.last_sign_in_at)}
        </p>
        {contactPhone && (
          <a
            href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}
            className="inline-flex items-center gap-2 mt-3 px-3.5 py-2 rounded-button border border-amber/40 bg-amber/10 text-amber font-mono text-mono-sm hover:bg-amber/20 transition-colors"
          >
            📞 Call {contactPhone}
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Logins / visits" value={data.logins} />
        <Card label="Page views" value={data.pageViewCount} />
        <Card label="Reports made" value={data.reports.length + data.kundalis.length + data.synastries.length} />
        <Card label="Total spent" value={Object.keys(totalPaid).length ? Object.entries(totalPaid).map(([c, m]) => money(c, m)).join(' + ') : '—'} />
      </div>

      {/* Acquisition */}
      <section className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-3">Where they came from</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 font-body text-body-sm">
          <Row k="Referrer" v={data.acquisition.referrer || 'direct / none'} />
          <Row k="Entry page" v={data.acquisition.entryPage || '—'} />
          <Row k="UTM" v={data.acquisition.utm ? Object.entries(data.acquisition.utm).map(([k, v]) => `${k}=${v}`).join(', ') : 'none'} />
          <Row k="Last page" v={data.acquisition.lastPage || '—'} />
        </div>
      </section>

      {/* Pages visited */}
      <section className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-3">Pages visited</h2>
        {data.pages.length === 0 ? <p className="text-dust/60 text-body-sm">No page views recorded yet.</p> : (
          <div className="space-y-1.5">
            {data.pages.map((p) => (
              <div key={p.path} className="flex items-center justify-between font-body text-body-sm">
                <span className="text-dust/80 font-mono text-mono-sm">{p.path}</span>
                <span className="text-amber">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reports + actual content */}
      <section>
        <h2 className="font-display text-xl text-star mb-3">Reports generated</h2>
        <div className="space-y-3">
          {data.kundalis.map((k) => (
            <details key={k.id} className="card border border-horizon/40 rounded-card p-4">
              <summary className="cursor-pointer font-body text-body-sm text-star list-none flex justify-between">
                <span>🪐 Deep Kundali · {d(k.created_at)}</span><span className="text-amber">view ▸</span>
              </summary>
              <div className="mt-3 space-y-3 text-body-sm text-dust">
                <p className="leading-relaxed">{k.overview || '(no overview)'}</p>
                {k.life_areas && Object.entries(k.life_areas).map(([area, text]) => (
                  <div key={area}><span className="font-mono text-mono-sm text-amber/70 uppercase">{area.replace(/_/g, ' ')}: </span>{text}</div>
                ))}
                {Array.isArray(k.year_outlook) && k.year_outlook.map((y) => (
                  <div key={y.year}><span className="font-mono text-mono-sm text-amber/70">{y.year}: </span>{y.text}</div>
                ))}
              </div>
            </details>
          ))}
          {data.synastries.map((s) => (
            <details key={s.id} className="card border border-horizon/40 rounded-card p-4">
              <summary className="cursor-pointer font-body text-body-sm text-star list-none flex justify-between">
                <span>💞 Matchmaking · {d(s.created_at)}</span><span className="text-amber">view ▸</span>
              </summary>
              <div className="mt-3 space-y-2 text-body-sm text-dust">
                <p className="font-mono text-mono-sm">Score: {String((s.ashtakoot as { total?: number })?.total ?? '—')} / 36</p>
                <p className="leading-relaxed">{s.commentary || '(no commentary)'}</p>
              </div>
            </details>
          ))}
          {data.reports.map((r) => (
            <div key={r.id} className="card border border-horizon/40 rounded-card p-4 flex items-center justify-between text-body-sm gap-4">
              <span className="text-star">
                ⏱ Forecast ({r.plan_type}) · {r.native_name} · {d(r.created_at)}
                {r.phone && r.phone.trim() && (
                  <>
                    {' · '}
                    <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-amber hover:underline">📞 {r.phone}</a>
                  </>
                )}
              </span>
              <span className="font-mono text-mono-sm text-dust/60 shrink-0">
                {r.payment_status} · {r.status} ·{' '}
                <Link href={`/report/${r.id}`} className="text-amber hover:underline">
                  view full report ▸
                </Link>
              </span>
            </div>
          ))}
          {data.reports.length + data.kundalis.length + data.synastries.length === 0 && (
            <p className="text-dust/60 text-body-sm">No reports generated yet.</p>
          )}
        </div>
      </section>

      {/* Payments */}
      <section className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-3">Payments</h2>
        {data.payments.length === 0 ? <p className="text-dust/60 text-body-sm">No payments.</p> : (
          <table className="w-full text-left font-body text-body-sm">
            <thead className="text-dust/60 font-mono text-mono-sm uppercase"><tr><th className="py-1 pr-4">Plan</th><th className="pr-4">Amount</th><th className="pr-4">Status</th><th>When</th></tr></thead>
            <tbody>
              {data.payments.map((p, i) => (
                <tr key={i} className="border-t border-horizon/30">
                  <td className="py-1.5 pr-4">{p.plan_type}</td>
                  <td className="pr-4 text-amber">{money(p.currency, p.amount)}</td>
                  <td className="pr-4">{p.status === 'completed' ? <span className="text-success">paid</span> : <span className="text-dust/50">{p.status}</span>}</td>
                  <td className="text-dust/60">{d(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Journey */}
      <section className="card border border-horizon/40 rounded-card p-5">
        <h2 className="font-display text-xl text-star mb-3">Recent journey</h2>
        {data.journey.length === 0 ? <p className="text-dust/60 text-body-sm">No events yet.</p> : (
          <div className="space-y-1 font-mono text-mono-sm">
            {data.journey.slice().reverse().map((e, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-dust/40 w-40 shrink-0">{d(e.at)}</span>
                <span className="text-amber">{e.name}</span>
                <span className="text-dust/70">{e.path ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-dust/50 w-24 shrink-0">{k}</span>
      <span className="text-star break-words">{v}</span>
    </div>
  );
}
