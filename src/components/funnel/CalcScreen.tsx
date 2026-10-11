'use client';

import { useEffect, useRef, useState } from 'react';
import type { RevealData } from '@/lib/funnel/reveal/compute';
import type { Lang } from '@/lib/funnel/screens';

/**
 * S14 — the calculation, shown honestly. The chart is computed first (one request to the
 * engine); each line below is a value from that result, revealed one at a time. If the
 * engine is slow the ring simply waits — there are no invented steps.
 */

const STEP_MS = 1500;

export interface RevealRequest {
  birth_date: string;
  birth_time: string | null;
  time_known: string;
  city: string;
  lat: number;
  lng: number;
  focus_area?: string;
  self_role?: string;
}

export function CalcScreen({
  request,
  lang,
  onDone,
}: {
  request: RevealRequest;
  lang: Lang;
  onDone: (r: RevealData) => void;
}) {
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch('/api/quiz/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { reveal?: RevealData; error?: string };
        if (cancelled) return;
        if (!r.ok || !j.reveal) setError(j.error ?? 'We could not reach the chart service. Please try again.');
        else setReveal(j.reveal);
      })
      .catch(() => {
        if (!cancelled) setError('Network problem — please check your connection and try again.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const total = reveal ? reveal.calcLines.length : 6;

  // Reveal one computed line at a time; the first (the place) is known before the engine answers.
  useEffect(() => {
    if (!reveal) {
      setShown((s) => Math.max(s, 1));
      return;
    }
    if (shown >= total) {
      const id = setTimeout(() => done.current(reveal), 700);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setShown((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [reveal, shown, total]);

  const fraction = Math.min(1, shown / total);
  const r = 44;
  const c = 2 * Math.PI * r;
  const firstLine = `Locating ${request.city}, ${Math.abs(request.lat).toFixed(2)}°${request.lat >= 0 ? 'N' : 'S'}, ${Math.abs(request.lng).toFixed(2)}°${request.lng >= 0 ? 'E' : 'W'}`;
  const lines = reveal ? reveal.calcLines.map((l) => l.text) : [firstLine];

  return (
    <section className="pt-4" aria-live="polite">
      <div className="flex justify-center mb-8">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#2A1E3D" strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#E8C97A"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - fraction)}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.22,1,.36,1)' }}
          />
        </svg>
      </div>
      <h1 className="font-display font-semibold text-star text-[1.75rem] leading-tight text-center mb-6">
        {lang === 'hi' ? 'Aapka chart nikal rahe hain' : 'Calculating your chart'}
      </h1>
      <ul className="space-y-3 max-w-sm mx-auto">
        {lines.slice(0, shown).map((line, i) => (
          <li key={i} className="flex gap-3 font-body text-[1.0625rem] text-star tabular-nums">
            <span aria-hidden className="text-amber-light w-4 shrink-0">✓</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {error && (
        <div className="mt-8 text-center">
          <p role="alert" className="font-body text-body-md text-caution-light mb-4">
            {error}
          </p>
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn-secondary min-h-[48px] px-6 font-body">
            {lang === 'hi' ? 'Dobara koshish karein' : 'Try again'}
          </button>
        </div>
      )}
    </section>
  );
}
