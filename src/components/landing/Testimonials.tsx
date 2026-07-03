/**
 * "What a report reads like" — sample-prose section for the landing page.
 *
 * Every excerpt is derived from REAL output of the deterministic ephemeris
 * engine for one fixed sample birth (see sampleData.ts) — no invented quotes,
 * counters or ratings. Uses the existing card / amber-accent / cosmos design
 * tokens. Mobile-first grid: single column on small screens, two columns on
 * tablet, three on desktop.
 */

import {
  SAMPLE_SEEKER,
  SAMPLE_DASHA,
  SAMPLE_GRID,
  SAMPLE_KUNDLI,
  activeDashaIndex,
} from './sampleData';

const DASHA_IDX = activeDashaIndex(SAMPLE_DASHA);
const CURRENT_MD = SAMPLE_DASHA[DASHA_IDX] ?? SAMPLE_DASHA[3];
const NEXT_MD = SAMPLE_DASHA[DASHA_IDX + 1];
const PEAK = [...SAMPLE_GRID].sort((a, b) => b.score - a.score)[0];
const LOW = [...SAMPLE_GRID].sort((a, b) => a.score - b.score)[0];
const MANGLIK = SAMPLE_KUNDLI.doshas[0];
const yr = (iso: string) => iso.slice(0, 4);

// Excerpts assembled from verified engine values — the same fields a paid
// report is written from.
const EXCERPTS = [
  {
    section: 'Hourly windows',
    meta: `${SAMPLE_SEEKER.sampleDayLabel} · 18 rated slots`,
    quote: `Your clearest window falls at ${PEAK.label} — ${PEAK.hora} hora, ${PEAK.chog} choghadiya, scored ${PEAK.score}/100. The heaviest stretch is ${LOW.label}; keep it for routine work, not first moves.`,
  },
  {
    section: 'Life chapters',
    meta: `Vimshottari dasha · ${CURRENT_MD.lord} period active`,
    quote: `You are in a ${CURRENT_MD.lord} period (${yr(CURRENT_MD.start)}–${yr(CURRENT_MD.end)}) — ${CURRENT_MD.theme.toLowerCase()}.${
      NEXT_MD
        ? ` A ${NEXT_MD.lord} chapter opens in ${yr(NEXT_MD.start)}: ${NEXT_MD.theme.toLowerCase()}.`
        : ''
    }`,
  },
  {
    section: 'Dosha check',
    meta: `${MANGLIK.name} · ${MANGLIK.status}`,
    quote: MANGLIK.detail,
  },
];

export default function Testimonials() {
  return (
    <section
      id="report-excerpts"
      aria-labelledby="report-excerpts-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Sample prose · Real engine output</p>
          <h2
            id="report-excerpts-heading"
            className="section-title text-display-md"
          >
            What a report reads like
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Three excerpts computed from a real sample chart ({SAMPLE_SEEKER.birthLabel}).
            Yours is written from your own birth details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {EXCERPTS.map((e) => (
            <figure
              key={e.section}
              className="card-interactive p-7 flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber/30" />

              <div className="font-mono text-mono-sm text-amber/80 tracking-[0.12em] uppercase">
                {e.section}
              </div>

              <blockquote className="font-body text-body-md text-star/85 leading-relaxed mt-4 mb-6 flex-1">
                <span aria-hidden className="text-amber/40 text-xl leading-none mr-1">&ldquo;</span>
                {e.quote}
                <span aria-hidden className="text-amber/40 text-xl leading-none ml-0.5">&rdquo;</span>
              </blockquote>

              <figcaption className="border-t border-horizon/30 pt-4 mt-auto">
                <div className="font-mono text-mono-sm text-dust">{e.meta}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="text-center mt-12 font-mono text-mono-sm text-dust tracking-wider">
          Computed by the same engine that writes your report — Swiss Ephemeris positions, Lahiri Ayanamsa.
        </p>
      </div>
    </section>
  );
}
