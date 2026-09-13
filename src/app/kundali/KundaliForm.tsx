'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { track } from '@/components/analytics/PostHogProvider';

const DEFAULT: BirthDetails = {
  name: '', birth_date: '', birth_time: '12:00:00', birth_city: '', birth_lat: 0, birth_lng: 0,
};

interface Teaser { lagna: string; moon_sign: string; moon_nakshatra: string; mahadasha: string; antardasha: string }

/**
 * Free chart facts for everyone; the full Kundali analysis for subscribers.
 *
 * The one-time Kundali unlock was retired on 2026-09-13 (owner: "all subscription-based,
 * not one-time"). /api/kundali/compute already opens the full reading for anyone with a
 * paid report, which every subscriber has, so the locked view simply leads into the quiz.
 */
export function KundaliForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [p, setP] = useState<BirthDetails>({ ...DEFAULT });
  const [teaser, setTeaser] = useState<Teaser | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTeaser(null);
    if (!p.birth_date || !hasValidBirthCoords(p)) {
      setErr('Enter your birth date and confirm your birth city.');
      return;
    }
    setLoading(true);
    try {
      const full = await fetch('/api/kundali/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ person: { ...p, name: p.name || 'You' } }),
      });
      if (full.ok) {
        const data = await full.json().catch(() => ({}));
        const id = (data as { id?: string }).id;
        if (id) { router.push(`/kundali/${id}`); return; }
      }
      // 401/402 → free chart-facts teaser + subscription CTA
      const t = await fetch('/api/kundali/teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: p }),
      });
      const tData = await t.json().catch(() => ({}));
      if (t.ok && tData.lagna) {
        setTeaser(tData as Teaser);
      } else {
        setErr((tData as { error?: string }).error ?? 'Could not read your chart. Please try again.');
      }
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto space-y-6 text-left">
      <div className="card border border-horizon rounded-card p-6">
        <BirthDetailsInput value={p} onChange={setP} showName={false} />
      </div>

      {err && <p className="text-caution text-body-sm">{err}</p>}

      {!teaser && (
        <div className="text-center">
          <button type="submit" disabled={loading} className="btn-primary px-10 py-3 disabled:opacity-50">
            {loading ? 'Reading your chart…' : 'See my chart — free'}
          </button>
          <p className="mt-3 font-mono text-mono-sm text-dust">Free chart summary. No card needed.</p>
        </div>
      )}

      {/* FREE chart facts + the full reading, which comes with a subscription */}
      {teaser && (
        <div className="rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-cosmos to-cosmos p-6 sm:p-8 text-center">
          <p className="section-eyebrow mb-3">Your chart at a glance</p>
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {[
              ['Rising sign', teaser.lagna],
              ['Moon sign', teaser.moon_sign],
              ['Birth star', teaser.moon_nakshatra || '—'],
              ['Life period', `${teaser.mahadasha}${teaser.antardasha && teaser.antardasha !== 'Unknown' ? ` · ${teaser.antardasha}` : ''}`],
            ].map(([label, val]) => (
              <div key={label} className="rounded-md bg-bg-3/40 border border-horizon/30 p-3">
                <div className="font-mono text-mono-sm text-dust uppercase tracking-wider">{label}</div>
                <div className="font-display text-lg text-amber">{val}</div>
              </div>
            ))}
          </div>

          <div className="max-w-sm mx-auto mb-6 space-y-1.5">
            {['Life, career & money, marriage, health, kids, family', 'Your year-by-year outlook (next 5 years)', 'Manglik, Kaal Sarpa & Sade Sati checks'].map((k) => (
              <div key={k} className="flex items-center justify-between rounded-md bg-bg-3/40 border border-horizon/30 px-3 py-2">
                <span className="font-body text-body-sm text-dust/80">{k}</span>
                <span className="font-mono text-mono-sm text-dust">🔒 locked</span>
              </div>
            ))}
          </div>

          <Link
            href="/start"
            onClick={() => track('kundali_subscribe_cta', { product: 'kundali' })}
            className="btn-primary inline-block px-8 py-3"
          >
            Get your full reading with a subscription
          </Link>
          <p className="mt-3 font-body text-body-sm text-dust">
            Your full Kundali analysis is included with every VedicHour subscription, together with your hour-by-hour
            forecast. Already subscribed? Sign in and tap &ldquo;See my chart&rdquo; again.
          </p>
        </div>
      )}
    </form>
  );
}
