'use client';

import { motion } from 'framer-motion';

interface HourBar {
  time: string;
  score: number;
  hora: string;
  peak?: boolean;
}

const HOURS: HourBar[] = [
  { time: '00', score: 62, hora: 'Saturn'  },
  { time: '01', score: 55, hora: 'Jupiter' },
  { time: '02', score: 70, hora: 'Mars'    },
  { time: '03', score: 84, hora: 'Moon',    peak: true },
  { time: '04', score: 91, hora: 'Venus',   peak: true },
  { time: '05', score: 76, hora: 'Moon'    },
  { time: '06', score: 96, hora: 'Jupiter', peak: true },
  { time: '07', score: 88, hora: 'Mars'    },
  { time: '08', score: 68, hora: 'Sun'     },
  { time: '09', score: 60, hora: 'Mercury' },
  { time: '10', score: 52, hora: 'Saturn'  },
  { time: '11', score: 47, hora: 'Jupiter' },
  { time: '12', score: 63, hora: 'Mars'    },
  { time: '13', score: 75, hora: 'Sun'     },
  { time: '14', score: 82, hora: 'Venus',   peak: true },
  { time: '15', score: 93, hora: 'Mercury', peak: true },
  { time: '16', score: 87, hora: 'Moon'    },
  { time: '17', score: 94, hora: 'Saturn',  peak: true },
  { time: '18', score: 77, hora: 'Jupiter' },
  { time: '19', score: 65, hora: 'Mars'    },
  { time: '20', score: 73, hora: 'Sun'     },
  { time: '21', score: 58, hora: 'Venus'   },
  { time: '22', score: 61, hora: 'Mercury' },
  { time: '23', score: 70, hora: 'Moon'    },
];

function barColor(score: number): string {
  if (score >= 78) return '#10B981';  // emerald
  if (score >= 58) return '#F59E0B';  // amber
  return '#EF4444';                    // crimson
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
    <section id="hourly-preview" className="py-28 bg-space relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-horizon to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-mono text-xs text-amber tracking-[0.2em] uppercase mb-4">Sample Output</p>
          <h2
            className="font-display font-semibold text-star mb-4"
            style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}
          >
            Hour-by-Hour Intelligence
          </h2>
          <p className="font-body text-dust text-lg max-w-xl mx-auto">
            Every hour rated. Every window labelled. No ambiguity.
          </p>
        </div>

        {/* Chart container */}
        <div className="bg-cosmos border border-horizon rounded-sm p-6 md:p-10 overflow-x-auto">
          {/* Chart top — legend */}
          <div className="flex items-center gap-6 mb-8 flex-wrap">
            {[
              { color: '#10B981', label: 'Excellent (78–100)' },
              { color: '#F59E0B', label: 'Good (58–77)' },
              { color: '#EF4444', label: 'Avoid (<58)' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                <span className="font-mono text-xs text-dust">{l.label}</span>
              </div>
            ))}
            <div className="ml-auto font-mono text-xs text-dust tracking-wide">
              Sample · Cancer Lagna · Rahu MD
            </div>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-[3px] h-48 min-w-[600px]">
            {HOURS.map((h, i) => {
              const heightPct = barHeightPct(h.score);
              const color = barColor(h.score);

              return (
                <div key={h.time} className="flex-1 flex flex-col items-center gap-1 group">
                  {/* Hora label above peak bars */}
                  {h.peak ? (
                    <div
                      className="font-mono text-[9px] tracking-wide whitespace-nowrap px-1.5 py-0.5 rounded-sm mb-1"
                      style={{ color, background: `${color}15` }}
                    >
                      {h.hora}
                    </div>
                  ) : (
                    <div className="mb-1 h-[20px]" />
                  )}

                  {/* Bar */}
                  <div className="w-full relative" style={{ height: '128px' }}>
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 rounded-t-[2px] origin-bottom"
                      style={{ background: color, opacity: h.peak ? 1 : 0.65 }}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.45,
                        delay: i * 0.03,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div style={{ height: `${heightPct}%`, minHeight: '4px' }} />
                    </motion.div>

                    {/* Score tooltip on hover */}
                    <div
                      className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                                 transition-opacity pointer-events-none z-10
                                 font-mono text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ background: color, color: '#080C18' }}
                    >
                      {h.score} · {barLabel(h.score)}
                    </div>
                  </div>

                  {/* Time label */}
                  <span className="font-mono text-[9px] text-dust/60 mt-1 tracking-wide">
                    {h.time}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom annotation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-horizon/50">
            <span className="font-mono text-xs text-dust/50">Local time (IST +05:30)</span>
            <span className="font-mono text-xs text-dust/50">
              Peak windows: 03:00–05:00 · 06:00 · 14:00–17:00
            </span>
          </div>
        </div>

        {/* CTA below chart */}
        <div className="text-center mt-12">
          <p className="font-body text-dust mb-6">
            Your chart will show your specific hora rulers, choghadiya windows, and Rahu Kaal.
          </p>
          <a
            href="/onboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-amber text-space font-body font-medium text-base rounded-sm hover:bg-amber-glow transition-colors duration-200"
          >
            Get My Hourly Forecast
          </a>
        </div>
      </div>
    </section>
  );
}
