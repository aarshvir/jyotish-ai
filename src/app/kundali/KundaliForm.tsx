'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';

const DEFAULT: BirthDetails = {
  name: '', birth_date: '', birth_time: '12:00:00', birth_city: '', birth_lat: 0, birth_lng: 0,
};

export function KundaliForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [p, setP] = useState<BirthDetails>({ ...DEFAULT });

  useEffect(() => {
    if (searchParams.get('unlocked') === '1') {
      setOkMsg('Your Kundali analysis is unlocked — enter your birth details below to generate your reading.');
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
        body: JSON.stringify({ planType: 'kundali' }),
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!p.birth_date) { setErr('Enter your birth date.'); return; }
    if (!p.birth_lat || !p.birth_lng) { setErr('Enter and confirm your birth city.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/kundali/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ person: { ...p, name: p.name || 'You' } }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setErr((data as { error?: string }).error ?? 'Unlock your Kundali analysis to continue.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setErr((data as { error?: string }).error ?? 'Request failed');
        setLoading(false);
        return;
      }
      const id = (data as { id?: string }).id;
      if (id) router.push(`/kundali/${id}`);
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto space-y-6 text-left">
      {okMsg && (
        <p className="text-success text-body-sm border border-success/30 rounded-md px-4 py-3 bg-success/10">
          {okMsg}
        </p>
      )}

      <div className="card border border-horizon rounded-card p-6">
        <BirthDetailsInput value={p} onChange={setP} showName={false} />
      </div>

      {err && <p className="text-caution text-body-sm">{err}</p>}

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <button type="submit" disabled={loading} className="btn-primary px-10 py-3 disabled:opacity-50">
          {loading ? 'Reading your chart…' : 'Generate my Kundali reading'}
        </button>
        <button
          type="button"
          disabled={paying}
          onClick={() => void startCheckout()}
          className="px-6 py-3 rounded-button border border-amber/40 text-amber text-body-sm hover:bg-amber/10 transition-colors disabled:opacity-50"
        >
          {paying ? 'Redirecting…' : 'Unlock Kundali — $9.99'}
        </button>
      </div>
      <p className="text-center font-mono text-mono-sm text-dust/50">
        One-time unlock. 24-hour money-back guarantee. Already bought any VedicHour forecast? It&apos;s included.
      </p>
    </form>
  );
}
