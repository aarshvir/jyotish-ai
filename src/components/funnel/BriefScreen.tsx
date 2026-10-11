'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { RevealData } from '@/lib/funnel/reveal/compute';
import type { FunnelAnswers, Lang } from '@/lib/funnel/screens';
import { answerLines, chartLines, inputLines, type BriefLine } from '@/lib/funnel/briefLines';
import { PrimaryButton, Title } from './QuestionScreens';

/**
 * "Building your brief" — the step between the birth details and the first result.
 *
 * It does real work and shows only that work:
 *   1. the chart is calculated (one request to the chart engine);
 *   2. the brief is assembled from the person's own answers (`briefText`, built from the
 *      same function the report is ordered with).
 * Every line comes from the birth details, the engine's reply or an answer; none is a
 * stage that did not happen. Lines are revealed a moment apart so they can be read, but
 * only after the thing they report exists: the chart lines wait for the engine, the answer
 * lines wait for the chart lines. There is no percentage, no timer, and nothing advances by
 * itself: the person taps Continue when the brief is ready.
 */

const LINE_MS = 220;

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

export interface BriefBuilt {
  reveal: RevealData;
  brief: string;
  durationMs: number;
  lines: number;
}

const STAGES: { en: string; hi: string }[] = [
  { en: 'Birth details', hi: 'Janm details' },
  { en: 'Chart', hi: 'Chart' },
  { en: 'Brief', hi: 'Brief' },
];

export function BriefScreen({
  request,
  answers,
  briefText,
  lang,
  onBuilt,
  onFailed,
  onContinue,
}: {
  request: RevealRequest;
  answers: FunnelAnswers;
  /** The brief the written reading is ordered from (shown on request, so the person can see exactly what it says). */
  briefText: string;
  lang: Lang;
  /** Fires once, the moment the brief is complete (not when the person taps Continue). */
  onBuilt?: (m: { durationMs: number; lines: number }) => void;
  onFailed?: () => void;
  onContinue: (b: BriefBuilt) => void;
}) {
  const reduce = useReducedMotion();
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [duration, setDuration] = useState(0);
  const started = useRef(0);
  const hi = lang === 'hi';

  useEffect(() => {
    let cancelled = false;
    setError(null);
    started.current = Date.now();
    fetch('/api/quiz/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { reveal?: RevealData; error?: string };
        if (cancelled) return;
        if (!r.ok || !j.reveal) {
          setError(j.error ?? 'We could not reach the chart service. Please try again.');
          onFailed?.();
        } else {
          setReveal(j.reveal);
          setDuration(Date.now() - started.current);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError('Network problem. Please check your connection and try again.');
        onFailed?.();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const inputs = useMemo(() => inputLines(request, lang), [request, lang]);
  const chart = useMemo(() => (reveal ? chartLines(reveal, lang) : []), [reveal, lang]);
  const mine = useMemo(() => (reveal ? answerLines(answers, lang) : []), [reveal, answers, lang]);

  // The birth details are known at once; later groups appear only once they exist.
  const all: (BriefLine & { group: 'input' | 'chart' | 'answers' })[] = useMemo(
    () => [
      ...inputs.map((l) => ({ ...l, group: 'input' as const })),
      ...chart.map((l) => ({ ...l, group: 'chart' as const })),
      ...mine.map((l) => ({ ...l, group: 'answers' as const })),
    ],
    [inputs, chart, mine],
  );

  // The birth details are the person's own input, so they are shown at once.
  useEffect(() => {
    setShown((s) => Math.max(s, inputs.length));
  }, [inputs.length]);

  // Everything else waits for the engine, then appears a moment apart so it can be read.
  useEffect(() => {
    if (!reveal) return;
    if (reduce) {
      setShown(all.length);
      return;
    }
    if (shown >= all.length) return;
    const id = setTimeout(() => setShown((s) => Math.min(all.length, s + 1)), LINE_MS);
    return () => clearTimeout(id);
  }, [reveal, shown, all.length, reduce]);

  const chartDone = Boolean(reveal) && shown >= inputs.length + chart.length;
  const briefDone = Boolean(reveal) && shown >= all.length;
  const built = useRef(false);
  useEffect(() => {
    if (!briefDone || built.current) return;
    built.current = true;
    onBuilt?.({ durationMs: duration, lines: all.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefDone]);
  const stageDone = [true, chartDone, briefDone];
  const activeStage = stageDone.findIndex((d) => !d);

  const visible = all.slice(0, shown);
  const group = (g: 'input' | 'chart' | 'answers') => visible.filter((l) => l.group === g);

  return (
    <section className="pt-2" aria-live="polite">
      <Title>{hi ? 'Aapka brief ban raha hai' : 'Building your brief'}</Title>
      <p className="font-body text-body-lg text-dust-light mb-6">
        {error
          ? ''
          : briefDone
            ? hi
              ? 'Aapka brief taiyaar hai.'
              : 'Your brief is ready.'
            : reveal
              ? hi
                ? 'Chart aa gaya. Ab aapke jawab jodte hain.'
                : 'The chart is back. Adding your answers.'
              : hi
                ? 'Aapki janm details se chart nikal rahe hain.'
                : 'Calculating your chart from your birth details.'}
      </p>

      <ol className="flex gap-2 mb-7" aria-label={hi ? 'Teen kadam' : 'Three steps'}>
        {STAGES.map((s, i) => (
          <li key={s.en} className="flex-1" aria-current={i === activeStage ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full transition-colors duration-300 ${stageDone[i] ? 'bg-amber' : i === activeStage ? 'bg-amber/40' : 'bg-horizon'}`} />
            <p className={`mt-1.5 font-body text-body-sm ${stageDone[i] ? 'text-star' : 'text-dust'}`}>
              {stageDone[i] ? '✓ ' : ''}
              {hi ? s.hi : s.en}
            </p>
          </li>
        ))}
      </ol>

      {(['input', 'chart', 'answers'] as const).map((g) => {
        const lines = group(g);
        if (!lines.length) return null;
        return (
          <div key={g} className="mb-5">
            {g !== 'input' && (
              <p className="mb-2 font-body text-label-md text-amber-light">
                {g === 'chart' ? (hi ? 'Aapke chart se' : 'From your chart') : hi ? 'Aapke jawab' : 'From your answers'}
              </p>
            )}
            <ul className="space-y-2.5">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 font-body text-[1.0625rem] leading-snug text-star">
                  <span aria-hidden className="text-amber-light w-4 shrink-0">
                    ✓
                  </span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {briefDone && reveal && (
        <>
          {briefText && (
            <details className="mt-2 rounded-card border border-horizon bg-nebula px-4 py-3">
              <summary className="cursor-pointer font-body text-body-md text-dust-light min-h-[32px] flex items-center">
                {hi ? 'Jis brief se reading likhi jaati hai, use dekhein' : 'See the brief your reading is written from'}
              </summary>
              <p className="mt-3 font-body text-body-md leading-[1.65] text-dust-light whitespace-pre-wrap break-words">{briefText}</p>
            </details>
          )}
          <PrimaryButton
            onClick={() => onContinue({ reveal, brief: briefText, durationMs: duration, lines: all.length })}
          >
            {hi ? 'Aage badhein' : 'Continue'}
          </PrimaryButton>
        </>
      )}

      {error && (
        <div className="mt-8 text-center">
          <p role="alert" className="font-body text-body-md text-caution-light mb-4">
            {error}
          </p>
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn-secondary min-h-[48px] px-6 font-body">
            {hi ? 'Dobara koshish karein' : 'Try again'}
          </button>
        </div>
      )}
    </section>
  );
}
