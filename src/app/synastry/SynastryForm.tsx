'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';

const DEFAULT_A: BirthDetails = {
  name: '', birth_date: '', birth_time: '12:00:00', birth_city: '', birth_lat: 0, birth_lng: 0,
};
const DEFAULT_B: BirthDetails = { ...DEFAULT_A };

export function SynastryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [a, setA] = useState<BirthDetails>({ ...DEFAULT_A });
  const [b, setB] = useState<BirthDetails>({ ...DEFAULT_B });

  useEffect(() => {
    if (searchParams.get('unlocked') === '1') {
      setOkMsg('Your Matchmaking unlock is active — enter both birth details below to see your compatibility.');
    }
  }, [searchParams]);

  async function startCheckout() {
    setErr(null);
    setPaying(true);
    try {
      const res = await fetch('/api/ziina/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType: 'synastry' }),
      });
      const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
      if (!res.ok) { setErr(data.error ?? 'Checkout failed'); return; }
      if (data.redirectUrl) window.location.href = data.redirectUrl;
    } catch {
      setErr('Network error');
    } finally {
      setPaying(false);
    }
  }

  function validate(p: BirthDetails, who: string): string | null {
    if (!p.birth_date) return `Enter ${who}'s birth date.`;
    if (!p.birth_lat || !p.birth_lng) return `Enter and confirm ${who}'s birth city.`;
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const vA = validate(a, 'the first person');
    const vB = validate(b, 'the second person');
    if (vA || vB) { setErr(vA || vB); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/synastry/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partnerA: { ...a, name: a.name || 'Person 1' },
          partnerB: { ...b, name: b.name || 'Person 2' },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setErr((data as { error?: string }).error ?? 'Unlock Matchmaking to see your compatibility.');
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

  return (
    <form onSubmit={onSubmit} className="space-y-8 text-left">
      {okMsg && (
        <p className="text-success text-body-sm border border-success/30 rounded-md px-4 py-3 bg-success/10">
          {okMsg}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card border border-horizon rounded-card p-6">
          <BirthDetailsInput label="Person 1" value={a} onChange={setA} />
        </div>
        <div className="card border border-horizon rounded-card p-6">
          <BirthDetailsInput label="Person 2" value={b} onChange={setB} />
        </div>
      </div>

      {err && <p className="text-caution text-body-sm">{err}</p>}

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <button type="submit" disabled={loading} className="btn-primary px-10 py-3 disabled:opacity-50">
          {loading ? 'Calculating compatibility…' : 'See our compatibility'}
        </button>
        <button
          type="button"
          disabled={paying}
          onClick={() => void startCheckout()}
          className="px-6 py-3 rounded-button border border-amber/40 text-amber text-body-sm hover:bg-amber/10 transition-colors disabled:opacity-50"
        >
          {paying ? 'Redirecting…' : 'Unlock Matchmaking — $9.99'}
        </button>
      </div>
      <p className="text-center font-mono text-mono-sm text-dust/50">
        One-time unlock. 24-hour money-back guarantee. Already bought any VedicHour forecast? It&apos;s included.
      </p>
    </form>
  );
}
