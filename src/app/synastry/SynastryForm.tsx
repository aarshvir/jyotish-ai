'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DEFAULTS = {
  birth_date: '1990-01-15',
  birth_time: '12:00:00',
  birth_city: 'Mumbai, India',
  birth_lat: 19.076,
  birth_lng: 72.877,
};

export function SynastryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [a, setA] = useState({ name: 'Partner A', ...DEFAULTS });
  const [b, setB] = useState({ name: 'Partner B', ...DEFAULTS });

  useEffect(() => {
    if (searchParams.get('unlocked') === '1') {
      setOkMsg('Synastry unlock is active on your account — you can compute below.');
    }
  }, [searchParams]);

  async function startSynastryCheckout() {
    setErr(null);
    setPaying(true);
    try {
      const res = await fetch('/api/ziina/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType: 'synastry' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? 'Checkout failed');
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setErr('Network error');
    } finally {
      setPaying(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/synastry/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ partnerA: a, partnerB: b }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setErr(
          (data as { error?: string }).error ??
            'Unlock with any paid forecast or standalone Synastry checkout.',
        );
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setErr((data as { error?: string }).error ?? 'Request failed');
        setLoading(false);
        return;
      }
      const id = (data as { id?: string }).id;
      if (id) router.push(`/synastry/${id}`);
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }

  function field(
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text',
  ) {
    return (
      <label className="block text-sm text-dust mb-1">
        {label}
        <input
          type={type}
          className="mt-1 w-full rounded-md bg-nebula border border-horizon px-3 py-2 text-star"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-8 text-left">
      {okMsg && (
        <p className="md:col-span-2 text-emerald-400/90 text-sm border border-emerald-500/30 rounded-md px-3 py-2 bg-emerald-500/10">
          {okMsg}
        </p>
      )}
      {(['Partner A', 'Partner B'] as const).map((label, idx) => {
        const p = idx === 0 ? a : b;
        const set = idx === 0 ? setA : setB;
        return (
          <div key={label} className="card border border-horizon p-6 space-y-3">
            <h2 className="text-lg font-semibold text-amber">{label}</h2>
            {field('Display name', p.name, (v) => set({ ...p, name: v }))}
            {field('Birth date (YYYY-MM-DD)', p.birth_date, (v) => set({ ...p, birth_date: v }))}
            {field('Birth time', p.birth_time, (v) => set({ ...p, birth_time: v }))}
            {field('City', p.birth_city, (v) => set({ ...p, birth_city: v }))}
            {field('Latitude', String(p.birth_lat), (v) => set({ ...p, birth_lat: parseFloat(v) || 0 }))}
            {field('Longitude', String(p.birth_lng), (v) => set({ ...p, birth_lng: parseFloat(v) || 0 }), 'number')}
          </div>
        );
      })}
      {err && <p className="md:col-span-2 text-red-400 text-sm">{err}</p>}
      <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <button type="submit" disabled={loading} className="btn-primary px-10 py-3">
          {loading ? 'Calculating…' : 'Compute Ashtakoot'}
        </button>
        <button
          type="button"
          disabled={paying}
          onClick={() => void startSynastryCheckout()}
          className="px-6 py-3 rounded-md border border-amber/40 text-amber text-body-sm hover:bg-amber/10 transition-colors disabled:opacity-50"
        >
          {paying ? 'Redirecting…' : 'Standalone Synastry checkout'}
        </button>
      </div>
    </form>
  );
}
