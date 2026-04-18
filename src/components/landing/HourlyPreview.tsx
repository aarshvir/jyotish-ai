'use client';

import { motion } from 'framer-motion';

interface HourBar {
  time: string;
  score: number;
  hora: string;
  peak?: boolean;
}

// 18 fixed hourly buckets: 06:00–24:00 in your current city's local time
const HOURS: HourBar[] = [
  { time: '06', score: 96, hora: 'Jupiter', peak: true },
  { time: '07', score: 88, hora: 'Mars' },
  { time: '08', score: 68, hora: 'Sun' },
  { time: '09', score: 60, hora: 'Mercury' },
  { time: '10', score: 52, hora: 'Saturn' },
  { time: '11', score: 47, hora: 'Jupiter' },
  { time: '12', score: 63, hora: 'Mars' },
  { time: '13', score: 75, hora: 'Sun' },
  { time: '14', score: 82, hora: 'Venus', peak: true },
  { time: '15', score: 93, hora: 'Mercury', peak: true },
  { time: '16', score: 87, hora: 'Moon' },
  { time: '17', score: 94, hora: 'Saturn', peak: true },
  { time: '18', score: 77, hora: 'Jupiter' },
  { time: '19', score: 65, hora: 'Mars' },
  { time: '20', score: 73, hora: 'Sun' },
  { time: '21', score: 58, hora: 'Venus' },
  { time: '22', score: 61, hora: 'Mercury' },
  { time: '23', score: 70, hora: 'Moon' },
];

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
          <p className="section-eyebrow">Sample Output</p>
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
            <div className="ml-auto font-mono text-mono-sm text-dust/60 tracking-wide">
              Sample · Cancer Lagna · Rahu MD
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
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 rounded-t-[2px] origin-bottom"
                      style={{ background: color, opacity: h.peak ? 1 : 0.55 }}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.4,
                        delay: i * 0.025,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                    </motion.div>

                    <div
                      className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-mono text-[10px] px-1.5 py-0.5 rounded-badge whitespace-nowrap"
                      style={{ background: color, color: '#080C18' }}
                    >
                      {h.score} · {barLabel(h.score)}
                    </div>
                  </div>

                  <span className="font-mono text-[9px] text-dust/50 mt-1 tracking-wide">
                    {h.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--color-border)]/40">
            <span className="font-mono text-mono-sm text-dust/40">18 hourly windows · your city&apos;s local time</span>
            <span className="font-mono text-mono-sm text-dust/40">
              Peak windows: 06:00 · 14–17
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10 md:mt-12">
          <p className="font-body text-body-md text-dust mb-5">
            Your chart will show your specific hora rulers, choghadiya windows, and Rahu Kaal.
          </p>
          <a href="/onboard" className="btn-primary text-base px-8 py-3.5">
            Get My Hourly Forecast
          </a>
        </div>
      </div>
    </section>
  );
}
