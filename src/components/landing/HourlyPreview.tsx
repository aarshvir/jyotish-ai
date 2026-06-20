import { SAMPLE_GRID, SAMPLE_SEEKER, SAMPLE_DASHA, SAMPLE_DAY_SCORE, activeDashaIndex } from './sampleData';

// Derived from VERIFIED engine output (see sampleData.ts) — real horas + real scores.
const HOURS = SAMPLE_GRID.map((s) => ({
  time: s.label.slice(0, 2),
  score: s.score,
  hora: s.hora,
  peak: s.score >= 88,
}));

const PEAK_LABEL = HOURS.filter((h) => h.peak).map((h) => `${h.time}:00`).join(' · ') || '—';
const LOW = [...SAMPLE_GRID].sort((a, b) => a.score - b.score)[0];
const CURRENT_MD = SAMPLE_DASHA[activeDashaIndex(SAMPLE_DASHA)]?.lord ?? 'Sun';

function barColor(score: number): string {
  if (score >= 78) return 'var(--success)';
  if (score >= 58) return 'var(--amber)';
  return 'var(--caution)';
}

function barLabel(score: number): string {
  if (score >= 78) return 'Excellent';
  if (score >= 58) return 'Good';
  return 'Avoid';
}

const MIN_SCORE = 40;
const MAX_SCORE = 100;
function barHeightPct(score: number): number {
  return ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100;
}

export default function HourlyPreview() {
  return (
    <section id="hourly-preview" className="py-24 md:py-28 bg-space relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Sample Output · real engine</p>
          <h2 className="section-title text-display-md">
            Your Jyotish Forecast — Hour by Hour
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            18 Vedic astrology windows per day. Every hora rated. Every choghadiya labelled. No ambiguity.
          </p>
        </div>

        {/* Chart container */}
        <div className="card p-5 sm:p-7 md:p-9 overflow-x-auto" role="img" aria-label="Sample hourly score chart showing 18 hourly windows from 06:00 to 24:00">
          {/* Legend */}
          <div className="flex items-center gap-5 mb-7 flex-wrap">
            {[
              { color: 'var(--success)', label: 'Excellent (78–100)' },
              { color: 'var(--amber)', label: 'Good (58–77)' },
              { color: 'var(--caution)', label: 'Avoid (<58)' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-badge" style={{ background: l.color }} />
                <span className="font-mono text-mono-sm text-dust">{l.label}</span>
              </div>
            ))}
            <div className="ml-auto font-mono text-mono-sm text-dust tracking-wide">
              Sample · {SAMPLE_SEEKER.lagna} Lagna · {CURRENT_MD} MD
            </div>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-[3px] h-40 md:h-48 min-w-[600px]">
            {HOURS.map((h, i) => {
              const heightPct = barHeightPct(h.score);
              const color = barColor(h.score);
              return (
                <div key={h.time} className="flex-1 flex flex-col items-center gap-1 group">
                  {h.peak ? (
                    <div
                      className="font-mono text-[9px] tracking-wide whitespace-nowrap px-1.5 py-0.5 rounded-badge mb-1"
                      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                    >
                      {h.hora}
                    </div>
                  ) : (
                    <div className="mb-1 h-5" />
                  )}

                  <div className="w-full relative" style={{ height: '128px' }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t-[2px] animate-bar-reveal"
                      style={{
                        background: color,
                        opacity: h.peak ? 1 : 0.55,
                        height: `${heightPct}%`,
                        minHeight: '4px',
                        animationDelay: `${0.3 + i * 0.025}s`,
                      }}
                    />

                    <div
                      className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-mono text-[10px] px-1.5 py-0.5 rounded-badge whitespace-nowrap"
                      style={{ background: color, color: '#080C18' }}
                    >
                      {h.score} · {barLabel(h.score)}
                    </div>
                  </div>

                  <span className="font-mono text-[9px] text-dust mt-1 tracking-wide">
                    {h.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--color-border)]/40">
            <span className="font-mono text-mono-sm text-dust">
              18 windows · {SAMPLE_SEEKER.sampleDayLabel} · day score {SAMPLE_DAY_SCORE}
            </span>
            <span className="font-mono text-mono-sm text-dust">
              Peak: {PEAK_LABEL} · avoid {LOW.label.slice(0, 5)}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10 md:mt-12">
          <p className="font-body text-body-md text-dust mb-5">
            Your report will show your specific planetary hours, timing quality for each window, and the daily challenging hour to avoid.
          </p>
          <a href="/onboard" className="btn-primary text-base px-8 py-3.5">
            Get My Hourly Forecast
          </a>
        </div>
      </div>
    </section>
  );
}
