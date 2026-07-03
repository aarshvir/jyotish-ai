'use client';

import { useEffect, useState } from 'react';

/**
 * Resonance loop — one-tap "how did this day actually feel?" control.
 * Posts to /api/day-rating (upsert per user+date). Brand rule: this is
 * reflection ("notice how the windows land for you"), never an
 * accuracy/prediction claim.
 *
 * Renders nothing for future dates, for dates older than the API's 30-day
 * rating window, or for signed-out visitors (401).
 */

type Rating = -1 | 0 | 1;

interface DayRatingProps {
  /** YYYY-MM-DD — the day being reflected on. */
  date: string;
  /** Predicted day score 0–100, snapshotted alongside the rating. */
  predictedScore?: number;
  reportId?: string;
  /** Overrides the default question line (e.g. "How did yesterday actually feel?"). */
  question?: string;
  className?: string;
}

const OPTIONS: Array<{ value: Rating; label: string }> = [
  { value: -1, label: 'Heavier' },
  { value: 0, label: 'As expected' },
  { value: 1, label: 'Clearer' },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Session-wide cache of the signed-in user's saved ratings (date → rating) so
// switching day tabs doesn't refetch. 'unauthed' hides every later mount.
let ratingsPromise: Promise<Map<string, Rating> | 'unauthed'> | null = null;

function loadSavedRatings(): Promise<Map<string, Rating> | 'unauthed'> {
  if (!ratingsPromise) {
    ratingsPromise = fetch('/api/day-rating', { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 401) return 'unauthed' as const;
        const map = new Map<string, Rating>();
        if (!res.ok) return map;
        const j = (await res.json().catch(() => ({}))) as {
          ratings?: Array<{ rated_date?: string; rating?: number }>;
        };
        (j.ratings ?? []).forEach((r) => {
          if (r.rated_date && (r.rating === -1 || r.rating === 0 || r.rating === 1)) {
            map.set(r.rated_date, r.rating);
          }
        });
        return map;
      })
      .catch(() => new Map<string, Rating>());
  }
  return ratingsPromise;
}

export function DayRating({
  date,
  predictedScore,
  reportId,
  question = 'How did this day actually feel?',
  className = '',
}: DayRatingProps) {
  const [hidden, setHidden] = useState(false);
  const [selected, setSelected] = useState<Rating | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Only lived days are ratable — mirrors the API's today/past-30-days window
  // (UTC day keys, same as the API) so we never render a control that can't save.
  const todayKey = new Date().toISOString().slice(0, 10);
  const ageDays = DATE_RE.test(date) ? (Date.parse(todayKey) - Date.parse(date)) / 86_400_000 : -1;
  const ratable = ageDays >= 0 && ageDays <= 30;

  useEffect(() => {
    if (!ratable) return;
    let cancelled = false;
    void loadSavedRatings().then((saved) => {
      if (cancelled) return;
      if (saved === 'unauthed') {
        setHidden(true);
        return;
      }
      const prior = saved.get(date);
      if (prior !== undefined) setSelected(prior);
    });
    return () => {
      cancelled = true;
    };
  }, [date, ratable]);

  if (!ratable || hidden) return null;

  const save = (value: Rating) => {
    setSelected(value); // optimistic
    setSaveState('saving');
    void fetch('/api/day-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        rated_date: date,
        rating: value,
        ...(typeof predictedScore === 'number' ? { predicted_score: predictedScore } : {}),
        ...(reportId ? { report_id: reportId } : {}),
      }),
    })
      .then((res) => {
        if (res.status === 401) {
          setHidden(true);
          return;
        }
        if (!res.ok) {
          setSaveState('error');
          return;
        }
        setSaveState('saved');
        void ratingsPromise?.then((m) => {
          if (m !== 'unauthed') m.set(date, value);
        });
      })
      .catch(() => setSaveState('error'));
  };

  return (
    <div className={className} role="group" aria-label={question}>
      <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-3">
        {question}
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => save(o.value)}
              aria-pressed={active}
              disabled={saveState === 'saving'}
              className={`px-3.5 py-2 min-h-[40px] rounded-sm border font-mono text-mono-sm transition-colors disabled:opacity-60 ${
                active
                  ? 'border-amber/60 bg-amber/10 text-amber'
                  : 'border-horizon text-dust hover:text-star hover:border-dust/50'
              }`}
            >
              {active && saveState === 'saved' ? (
                <span className="text-success mr-1.5" aria-hidden>✓</span>
              ) : null}
              {o.label}
            </button>
          );
        })}
      </div>
      {saveState === 'saved' && (
        <p className="font-mono text-mono-sm text-dust/60 mt-2.5">
          Noted — this helps you notice how the windows land for you.
        </p>
      )}
      {saveState === 'error' && (
        <p className="font-mono text-mono-sm text-caution mt-2.5">
          Couldn&apos;t save just now.{' '}
          <button
            type="button"
            onClick={() => {
              if (selected != null) save(selected);
            }}
            className="text-amber underline underline-offset-2 hover:text-amber-light"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
