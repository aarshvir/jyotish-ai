'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { track } from '@/components/analytics/PostHogProvider';

const DEFAULT_A: BirthDetails = {
  name: '', birth_date: '', birth_time: '12:00:00', birth_city: '', birth_lat: 0, birth_lng: 0,
};

const KOOTAS = ['Varna', 'Vashya', 'Tara', 'Yoni', 'Graha Maitri', 'Gana', 'Bhakoot', 'Nadi'];

interface Teaser { total: number; max: number; label: string; tone: string }

/**
 * Free 36-point score for everyone; the full eight-fold breakdown for subscribers.
 *
 * The one-time Matchmaking unlock was retired on 2026-09-13 (owner: "all
 * subscription-based, not one-time"). /api/synastry/compute already opens the full
 * breakdown for anyone with a paid report, which every subscriber has, so the locked
 * view simply leads into the quiz.
 */
export function SynastryForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [a, setA] = useState<BirthDetails>({ ...DEFAULT_A });
  const [b, setB] = useState<BirthDetails>({ ...DEFAULT_A });
  const [teaser, setTeaser] = useState<Teaser | null>(null);

  function valid(p: BirthDetails): boolean {
    return !!p.birth_date && hasValidBirthCoords(p);
  }

  // One button: subscribers get the full result; everyone else gets the free score.
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
      // 401 (logged out) or 402 (not subscribed) → show the FREE score + subscription CTA
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
          <p className="mt-3 font-mono text-mono-sm text-dust">Free 36-point score. No card needed.</p>
        </div>
      )}

      {/* FREE score reveal + the full breakdown, which comes with a subscription */}
      {teaser && (
        <div className="rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-cosmos to-cosmos p-6 sm:p-8 text-center">
          <p className="section-eyebrow mb-2">Your Gun Milan score</p>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className={`font-display font-bold text-6xl ${toneColor}`}>{teaser.total}</span>
            <span className="text-2xl text-dust">/ 36</span>
          </div>
          <p className={`font-display text-headline-sm ${toneColor} mb-6`}>{teaser.label}</p>

          <div className="max-w-sm mx-auto mb-6 space-y-1.5">
            <p className="font-mono text-mono-sm text-dust uppercase tracking-wider mb-2">The full 8-fold breakdown</p>
            {KOOTAS.map((k) => (
              <div key={k} className="flex items-center justify-between rounded-md bg-bg-3/40 border border-horizon/30 px-3 py-2">
                <span className="font-body text-body-sm text-dust/80">{k}</span>
                <span className="font-mono text-mono-sm text-dust">🔒 locked</span>
              </div>
            ))}
          </div>

          <Link
            href="/start"
            onClick={() => track('synastry_subscribe_cta', { product: 'synastry' })}
            className="btn-primary inline-block px-8 py-3"
          >
            See the full breakdown with a subscription
          </Link>
          <p className="mt-3 font-body text-body-sm text-dust">
            The full matchmaking breakdown and reading are included with every VedicHour subscription. Already
            subscribed? Sign in and tap &ldquo;See our compatibility&rdquo; again.
          </p>
        </div>
      )}
    </form>
  );
}
