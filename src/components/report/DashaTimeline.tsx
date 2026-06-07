'use client';

/**
 * DashaTimeline — "Your life chapters" visual.
 *
 * Renders the Vimshottari dasha sequence as a horizontal timeline showing:
 * - Past chapters (greyed, collapsed)
 * - Current chapter (highlighted, with progress bar and plain description)
 * - Upcoming chapters (dimmed, showing what's next)
 *
 * The plain descriptions give non-astrologers an intuitive sense of what
 * each planetary period tends to bring — without requiring any Vedic knowledge.
 */

interface DashaEntry {
  planet: string;
  start_date: string;
  end_date: string;
}

interface DashaTimelineProps {
  dashaSequence: DashaEntry[];
  /** ISO date string for "today" — used to determine current chapter. Defaults to new Date(). */
  today?: string;
}

/** Plain-English character for each planetary period */
const DASHA_PLAIN: Record<string, { theme: string; quality: string; color: string }> = {
  Sun:     { theme: 'Authority & identity',       quality: 'Leadership, visibility, ego clarity',          color: 'text-amber' },
  Moon:    { theme: 'Emotion & home',              quality: 'Relationships, intuition, family focus',       color: 'text-blue-300' },
  Mars:    { theme: 'Drive & ambition',            quality: 'Action, courage, career pushes, conflict',     color: 'text-red-400' },
  Mercury: { theme: 'Communication & learning',   quality: 'Business, writing, networking, analysis',      color: 'text-green-400' },
  Jupiter: { theme: 'Wisdom & expansion',          quality: 'Growth, recognition, teaching, family',        color: 'text-yellow-300' },
  Venus:   { theme: 'Creativity & relationships', quality: 'Love, aesthetics, wealth, pleasure',           color: 'text-pink-300' },
  Saturn:  { theme: 'Discipline & legacy',         quality: 'Hard work, structure, long-term building',    color: 'text-gray-400' },
  Rahu:    { theme: 'Ambition & disruption',       quality: 'Unconventional growth, foreign influence',    color: 'text-purple-400' },
  Ketu:    { theme: 'Detachment & insight',        quality: 'Spiritual depth, letting go, hidden gains',   color: 'text-teal-400' },
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

function fmtYear(s: string): string {
  return s.slice(0, 4);
}

export function DashaTimeline({ dashaSequence, today: todayStr }: DashaTimelineProps) {
  if (!dashaSequence || dashaSequence.length === 0) return null;

  const today = todayStr ? parseDate(todayStr) : new Date();

  // Find current chapter
  const currentIdx = dashaSequence.findIndex((ds) => {
    const start = parseDate(ds.start_date);
    const end = parseDate(ds.end_date);
    return today >= start && today <= end;
  });

  // Show: last 1 past + current + next 3 (or all if few)
  const showFrom = Math.max(0, currentIdx - 1);
  const showTo = Math.min(dashaSequence.length - 1, currentIdx + 3);
  const visible = dashaSequence.slice(showFrom, showTo + 1);

  // Progress within current chapter
  let progressPct = 0;
  let elapsedMonths = 0;
  let totalMonths = 0;
  if (currentIdx >= 0) {
    const cur = dashaSequence[currentIdx];
    const start = parseDate(cur.start_date).getTime();
    const end = parseDate(cur.end_date).getTime();
    const now = today.getTime();
    totalMonths = Math.round((end - start) / (30.44 * 24 * 60 * 60 * 1000));
    elapsedMonths = Math.round((now - start) / (30.44 * 24 * 60 * 60 * 1000));
    progressPct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }

  const currentDasha = currentIdx >= 0 ? dashaSequence[currentIdx] : null;

  return (
    <div id="dasha-timeline" className="space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-headline-sm text-star">Your life chapters</h3>
        <p className="font-mono text-mono-sm text-dust/50">Vimshottari timing cycle</p>
      </div>

      {/* Current chapter highlight */}
      {currentDasha && (
        <div className="rounded-card border border-amber/30 bg-amber/[0.05] p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="font-mono text-mono-sm text-amber/70 tracking-wider uppercase mb-1">
                You are here
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-amber">{PLANET_SYMBOLS[currentDasha.planet] || ''}</span>
                <h4 className="font-display text-2xl text-star">
                  {currentDasha.planet} period
                </h4>
              </div>
              <p className={`font-body text-body-md mt-1 ${DASHA_PLAIN[currentDasha.planet]?.color ?? 'text-amber'}`}>
                {DASHA_PLAIN[currentDasha.planet]?.theme ?? ''}
              </p>
              <p className="font-body text-body-sm text-dust/80 mt-1">
                {DASHA_PLAIN[currentDasha.planet]?.quality ?? ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-mono-sm text-dust/60">
                {fmtYear(currentDasha.start_date)} – {fmtYear(currentDasha.end_date)}
              </p>
              <p className="font-mono text-mono-sm text-amber mt-1">
                Month {elapsedMonths} of {totalMonths}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-2 bg-horizon/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-dust/40">
              <span>{fmtYear(currentDasha.start_date)}</span>
              <span>{progressPct}% complete</span>
              <span>{fmtYear(currentDasha.end_date)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline strip */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-0 right-0 h-px bg-horizon/30" />

        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
          {visible.map((ds, i) => {
            const absIdx = showFrom + i;
            const isPast = absIdx < currentIdx;
            const isCurrent = absIdx === currentIdx;
            const info = DASHA_PLAIN[ds.planet];

            return (
              <div
                key={ds.planet + ds.start_date}
                className={`relative flex-shrink-0 w-36 ${isPast ? 'opacity-40' : ''}`}
              >
                {/* Dot on timeline */}
                <div className={`w-3 h-3 rounded-full border-2 mb-3 mx-auto ${
                  isCurrent
                    ? 'bg-amber border-amber'
                    : isPast
                    ? 'bg-dust/30 border-dust/30'
                    : 'bg-transparent border-horizon'
                }`} />

                <div className={`rounded-md border p-3 text-center ${
                  isCurrent
                    ? 'border-amber/40 bg-amber/[0.06]'
                    : 'border-horizon/30 bg-cosmos'
                }`}>
                  <div className="text-lg mb-1 text-dust">
                    {PLANET_SYMBOLS[ds.planet] || ds.planet}
                  </div>
                  <p className={`font-body text-body-sm font-semibold ${isCurrent ? 'text-amber' : 'text-star/80'}`}>
                    {ds.planet}
                  </p>
                  <p className="font-mono text-[10px] text-dust/50 mt-0.5">
                    {fmtYear(ds.start_date)}–{fmtYear(ds.end_date)}
                  </p>
                  {info && (
                    <p className={`font-mono text-[10px] mt-1 leading-tight ${
                      isCurrent ? info.color : 'text-dust/50'
                    }`}>
                      {info.theme}
                    </p>
                  )}
                  {isCurrent && (
                    <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-full bg-amber text-space font-mono text-[9px] uppercase tracking-wider">
                      Now
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* "More coming" indicator if sequence continues */}
          {showTo < dashaSequence.length - 1 && (
            <div className="flex-shrink-0 w-16 flex items-center justify-center text-dust/30 font-mono text-xs">
              →
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-mono-sm text-dust/40 text-center">
        Planetary periods shift your life's themes and focus — each chapter activates different strengths.
      </p>
    </div>
  );
}
