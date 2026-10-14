'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { track } from '@/components/analytics/PostHogProvider';
import { validateBirth } from '@/lib/tools/birth';
import { LatestRequest, requestJson } from '@/lib/tools/requests';

const DEFAULT_A: BirthDetails = {
  name: '', birth_date: '', birth_time: '', birth_city: '', birth_lat: 0, birth_lng: 0,
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
export function SynastryForm({ checkoutEnabled = false }: { checkoutEnabled?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [a, setA] = useState<BirthDetails>({ ...DEFAULT_A });
  const [b, setB] = useState<BirthDetails>({ ...DEFAULT_A });
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const request = useRef(new LatestRequest());
  useEffect(() => () => request.current.cancel(), []);

  function edit(next: BirthDetails, person: 'a' | 'b') {
    request.current.cancel(); setLoading(false); setTeaser(null); setErr(null);
    if (person === 'a') setA(next); else setB(next);
  }

  function valid(p: BirthDetails): boolean {
    return !!p.birth_date && !!p.birth_time && hasValidBirthCoords(p);
  }

  // One button: subscribers get the full result; everyone else gets the free score.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTeaser(null);
    const checkedA = validateBirth(a);
    const checkedB = validateBirth(b);
    if (!checkedA.ok || !checkedB.ok || !valid(a) || !valid(b)) {
      setErr(!checkedA.ok ? `Person 1: ${checkedA.message}` : !checkedB.ok ? `Person 2: ${checkedB.message}` : 'Confirm both birth cities.');
      return;
    }
    if (loading) return;
    const controller = request.current.start();
    setLoading(true);
    try {
      const { response, data } = await requestJson('/api/synastry/teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerA: checkedA.person, partnerB: checkedB.person }), signal: controller.signal,
      }, 40_000);
      if (!request.current.isCurrent(controller)) return;
      const tData = data as Teaser & { error?: string };
      if (response.ok && typeof tData.total === 'number') {
        setTeaser(tData as Teaser);
      } else {
        setErr((tData as { error?: string }).error ?? 'Could not calculate your score. Please try again.');
      }
    } catch {
      if (request.current.isCurrent(controller)) setErr('Could not complete the calculation. Your inputs are still here; try again.');
    } finally {
      if (request.current.isCurrent(controller)) setLoading(false);
    }
  }

  async function openFullReading() {
    if (loading) return;
    const controller = request.current.start();
    setLoading(true); setErr(null);
    try {
      const { response, data } = await requestJson('/api/synastry/compute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ partnerA: { ...a, name: a.name || 'Person 1' }, partnerB: { ...b, name: b.name || 'Person 2' } }), signal: controller.signal,
      }, 300_000);
      if (!request.current.isCurrent(controller)) return;
      const result = data as { id?: string };
      if (response.ok && result.id) router.push(`/synastry/${result.id}`);
      else setErr(response.status === 401 ? 'Sign in to use existing account access. Your free score remains below.' : response.status === 402 ? 'This account does not have access to a full reading. Your free score remains available.' : 'The full reading could not be opened. Your free score remains available.');
    } catch { if (request.current.isCurrent(controller)) setErr('Could not open the full reading. Your free score remains available.'); }
    finally { if (request.current.isCurrent(controller)) setLoading(false); }
  }

  const toneColor = teaser?.tone === 'excellent' ? 'text-success' : teaser?.tone === 'work' ? 'text-caution' : 'text-amber';

  return (
    <form onSubmit={onSubmit} className="space-y-8 text-left">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card border border-horizon rounded-card p-6">
          <BirthDetailsInput label="You" value={a} onChange={(next) => edit(next, 'a')} allowUnknownTime={false} />
        </div>
        <div className="card border border-horizon rounded-card p-6">
          <BirthDetailsInput label="Your partner" value={b} onChange={(next) => edit(next, 'b')} allowUnknownTime={false} />
        </div>
      </div>

      <p className="text-body-sm text-dust">Use known birth times for both people. <Link href="/help/birth-time" className="underline underline-offset-4">See help with an uncertain time</Link>.</p>
      {err && <p role="alert" className="text-caution text-body-sm">{err}</p>}

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
          <p className="text-body-sm text-dust mb-5">A traditional compatibility measure, not a verdict on a relationship. Consider communication, values and your own experience alongside it.</p>

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
            href={checkoutEnabled ? '/start' : '/help/compatibility'}
            onClick={() => track('synastry_subscribe_cta', { product: 'synastry' })}
            className="btn-primary inline-block px-8 py-3"
          >
            {checkoutEnabled ? 'See subscription options' : 'Understand this compatibility score'}
          </Link>
          <p className="mt-3 font-body text-body-sm text-dust">
            {checkoutEnabled ? 'The full breakdown is included with a subscription. ' : 'New written readings are currently unavailable for purchase. '}
            Already have access? <Link href="/login" className="underline underline-offset-4">Sign in</Link> to create a full reading, or <Link href="/dashboard" className="underline underline-offset-4">find an existing one</Link>.
          </p>
          <button type="button" onClick={() => void openFullReading()} disabled={loading} className="btn-secondary min-h-[48px] mt-4 max-w-full whitespace-normal">{loading ? 'Creating your reading...' : 'Create full reading with existing access'}</button>
        </div>
      )}
    </form>
  );
}
