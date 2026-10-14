'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BirthDetailsInput, type BirthDetails } from '@/components/forms/BirthDetailsInput';
import { hasValidBirthCoords } from '@/lib/utils/coords';
import { track } from '@/components/analytics/PostHogProvider';
import { validateBirth } from '@/lib/tools/birth';
import { LatestRequest, requestJson } from '@/lib/tools/requests';

const DEFAULT: BirthDetails = {
  name: '', birth_date: '', birth_time: '', birth_city: '', birth_lat: 0, birth_lng: 0,
};

interface Teaser { lagna: string; moon_sign: string; moon_nakshatra: string; mahadasha: string; antardasha: string }

/**
 * Free chart facts for everyone; the full Kundali analysis for subscribers.
 *
 * The one-time Kundali unlock was retired on 2026-09-13 (owner: "all subscription-based,
 * not one-time"). /api/kundali/compute already opens the full reading for anyone with a
 * paid report, which every subscriber has, so the locked view simply leads into the quiz.
 */
export function KundaliForm({ checkoutEnabled = false }: { checkoutEnabled?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [p, setP] = useState<BirthDetails>({ ...DEFAULT });
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const request = useRef(new LatestRequest());
  useEffect(() => () => request.current.cancel(), []);

  function edit(next: BirthDetails) {
    request.current.cancel();
    setLoading(false); setP(next); setTeaser(null); setErr(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setTeaser(null);
    const checked = validateBirth(p);
    if (!checked.ok || !hasValidBirthCoords(p)) {
      setErr(!checked.ok ? checked.message : 'Confirm your birth city.');
      return;
    }
    if (loading) return;
    const controller = request.current.start();
    setLoading(true);
    try {
      const result = await requestJson('/api/kundali/teaser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: checked.person }),
        signal: controller.signal,
      }, 40_000);
      if (!request.current.isCurrent(controller)) return;
      const tData = result.data as Teaser & { error?: string };
      if (result.response.ok && tData.lagna) {
        setTeaser(tData as Teaser);
      } else {
        setErr((tData as { error?: string }).error ?? 'Could not read your chart. Please try again.');
      }
    } catch (error) {
      if (request.current.isCurrent(controller)) setErr(error instanceof Error && error.name === 'RequestTimeout' ? 'The calculation took too long. Your inputs are still here; try again.' : 'Could not connect. Your inputs are still here; try again.');
    } finally {
      if (request.current.isCurrent(controller)) setLoading(false);
    }
  }

  async function openFullReading() {
    if (loading) return;
    const controller = request.current.start();
    setLoading(true); setErr(null);
    try {
      const { response, data } = await requestJson('/api/kundali/compute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ person: { ...p, name: p.name || 'You' } }), signal: controller.signal,
      }, 300_000);
      if (!request.current.isCurrent(controller)) return;
      const result = data as { id?: string; error?: string };
      if (response.ok && result.id) router.push(`/kundali/${result.id}`);
      else setErr(response.status === 401 ? 'Sign in to use existing account access. Your free facts remain below.' : response.status === 402 ? 'This account does not have access to a full reading. Your free facts remain available.' : 'The full reading could not be opened. Your free facts remain available.');
    } catch { if (request.current.isCurrent(controller)) setErr('Could not open the full reading. You can still use your free result.'); }
    finally { if (request.current.isCurrent(controller)) setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg mx-auto space-y-6 text-left">
      <div className="card border border-horizon rounded-card p-6">
        <BirthDetailsInput value={p} onChange={edit} showName={false} allowUnknownTime={false} />
        <p className="mt-3 text-body-sm text-dust">A rising sign needs a known birth time. <Link href="/help/birth-time" className="underline underline-offset-4">Unsure of yours?</Link></p>
      </div>

      {err && <p role="alert" className="text-caution text-body-sm">{err}</p>}

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
            href={checkoutEnabled ? '/start' : '/sample-report'}
            onClick={() => track('kundali_subscribe_cta', { product: 'kundali' })}
            className="btn-primary inline-block px-8 py-3"
          >
            {checkoutEnabled ? 'See subscription options' : 'Read an example interpretation'}
          </Link>
          <p className="mt-3 font-body text-body-sm text-dust">
            {checkoutEnabled ? 'A full written reading is included with a subscription. ' : 'New written readings are currently unavailable for purchase. '}
            Already have access? <Link href="/login" className="underline underline-offset-4">Sign in</Link> to create a full reading, or <Link href="/dashboard" className="underline underline-offset-4">find an existing one</Link>.
          </p>
          <button type="button" onClick={() => void openFullReading()} disabled={loading} className="btn-secondary min-h-[48px] mt-4 max-w-full whitespace-normal">{loading ? 'Creating your reading...' : 'Create full reading with existing access'}</button>
        </div>
      )}
    </form>
  );
}
