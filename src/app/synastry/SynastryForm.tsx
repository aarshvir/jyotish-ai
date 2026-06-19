'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { isValidLat, isValidLng } from '@/lib/utils/coords';

const DEFAULT_A: BirthDetails = {
  name: '', birth_date: '', birth_time: '12:00:00', birth_city: '', birth_lat: 0, birth_lng: 0,
};

const KOOTAS = ['Varna', 'Vashya', 'Tara', 'Yoni', 'Graha Maitri', 'Gana', 'Bhakoot', 'Nadi'];

interface Teaser { total: number; max: number; label: string; tone: string }

export function SynastryForm({ priceLabel = '$9.99' }: { priceLabel?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [a, setA] = useState<BirthDetails>({ ...DEFAULT_A });
  const [b, setB] = useState<BirthDetails>({ ...DEFAULT_A });
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [promo, setPromo] = useState('');

  useEffect(() => {
    if (searchParams.get('unlocked') === '1') {
      setOkMsg('Your Matchmaking unlock is active — enter both birth details and tap "See our compatibility" for the full breakdown.');
    } else if (searchParams.get('payment') === 'error') {
      setErr('Something went wrong finishing your payment. If you were charged, refresh this page in a minute — your unlock should appear.');
    }
  }, [searchParams]);

  function valid(p: BirthDetails): boolean {
    return !!p.birth_date && isValidLat(p.birth_lat) && isValidLng(p.birth_lng);
  }

  async function startCheckout() {
    setErr(null);
    setPaying(true);
    try {
      const res = await fetch('/api/ziina/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType: 'synastry', promoCode: promo.trim() || undefined }),
      });
      if (res.status === 401) {
        // Not signed in — send them to sign-in and bring them back here, don't dead-end on an error.
        window.location.href = `/login?next=${encodeURIComponent('/synastry')}`;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };
      if (!res.ok) { setErr(data.error ?? 'Checkout failed'); return; }
      if (data.redirectUrl) window.location.href = data.redirectUrl;
    } catch {
      setErr('Network error');
    } finally {
      setPaying(false);
    }
  }

  // One button: paid/logged-in users get the full result; everyone else gets the free score + unlock.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTeaser(null);
    if (!valid(a) || !valid(b)) {
      setErr('Enter both birth dates and confirm both birth cities.');
      return;
    }
    setLoading(true);
    try {
      const full = await fetch('/api/synastry/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partnerA: { ...a, name: a.name || 'Person 1' },
          partnerB: { ...b, name: b.name || 'Person 2' },
        }),
      });
      if (full.ok) {
        const data = await full.json().catch(() => ({}));
        const id = (data as { id?: string }).id;
        if (id) { router.push(`/synastry/${id}`); return; }
      }
      // 401 (logged out) or 402 (unpaid) → show the FREE score teaser + unlock CTA
      const t = await fetch('/api/synastry/teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerA: a, partnerB: b }),
      });
      const tData = await t.json().catch(() => ({}));
      if (t.ok && typeof tData.total === 'number') {
        setTeaser(tData as Teaser);
      } else {
        setErr((tData as { error?: string }).error ?? 'Could not calculate your score. Please try again.');
      }
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }

  const toneColor = teaser?.tone === 'excellent' ? 'text-success' : teaser?.tone === 'work' ? 'text-caution' : 'text-amber';

  return (
    <form onSubmit={onSubmit} className="space-y-8 text-left">
      {okMsg && <p className="text-success text-body-sm border border-success/30 rounded-md px-4 py-3 bg-success/10">{okMsg}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card border border-horizon rounded-card p-6">
          <BirthDetailsInput label="You" value={a} onChange={setA} />
        </div>
        <div className="card border border-horizon rounded-card p-6">
          <BirthDetailsInput label="Your partner" value={b} onChange={setB} />
        </div>
      </div>

      {err && <p className="text-caution text-body-sm">{err}</p>}

      {!teaser && (
        <div className="text-center">
          <button type="submit" disabled={loading} className="btn-primary px-10 py-3 disabled:opacity-50">
            {loading ? 'Calculating your score…' : 'See our compatibility — free'}
          </button>
          <p className="mt-3 font-mono text-mono-sm text-dust/50">Free 36-point score. No card needed.</p>
        </div>
      )}

      {/* FREE score reveal + locked full breakdown */}
      {teaser && (
        <div className="rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-cosmos to-cosmos p-6 sm:p-8 text-center">
          <p className="section-eyebrow mb-2">Your Gun Milan score</p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className={`font-display font-bold text-6xl ${toneColor}`}>{teaser.total}</span>
            <span className="text-2xl text-dust/40">/ 36</span>
          </div>
          <p className={`font-display text-headline-sm ${toneColor} mb-6`}>{teaser.label}</p>

          <div className="max-w-sm mx-auto mb-6 space-y-1.5">
            <p className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider mb-2">The full 8-fold breakdown</p>
            {KOOTAS.map((k) => (
              <div key={k} className="flex items-center justify-between rounded-md bg-bg-3/40 border border-horizon/30 px-3 py-2">
                <span className="font-body text-body-sm text-dust/80">{k}</span>
                <span className="font-mono text-mono-sm text-dust/40">🔒 locked</span>
              </div>
            ))}
          </div>

          <div className="max-w-xs mx-auto mb-4">
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value.toUpperCase())}
              placeholder="Coupon code (optional)"
              className="w-full rounded-md bg-cosmos border border-horizon px-3 py-2 text-center font-mono text-mono-sm text-star placeholder:text-dust/40 focus:border-amber/60 focus:outline-none"
            />
          </div>

          <button
            type="button"
            disabled={paying}
            onClick={() => void startCheckout()}
            className="btn-primary px-8 py-3 disabled:opacity-50"
          >
            {paying ? 'Redirecting…' : `Unlock the full breakdown + reading — ${priceLabel}`}
          </button>
          <p className="mt-3 font-mono text-mono-sm text-dust/50">
            One-time. 24-hour money-back guarantee. Already bought any VedicHour forecast? It&apos;s included — sign in.
          </p>
        </div>
      )}
    </form>
  );
}
