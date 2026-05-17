/**
 * UseCases — product portfolio section showing the situations VedicHour serves.
 *
 * Six tiles, each with a Sanskrit-rooted name and a plain-English use case.
 * Designed to help a visitor self-identify: "yes, that's why I'd buy this."
 */

const CASES = [
  {
    title: 'Muhurta',
    plain: 'Auspicious timing',
    body:
      'Time the wedding ceremony, the registry signing, the property handover, or the big interview. Cross-reference Choghadiya + Hora + Rahu Kaal in 18 hourly windows.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M24 8v16l10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Janam Kundali',
    plain: 'Birth chart deep-dive',
    body:
      'Full natal Jyotish: lagna, all 9 grahas, 27 nakshatras, current dasha, yogas, dignities. A 40-page personalised reading from the classical sources.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="8" y="8" width="32" height="32" stroke="currentColor" strokeWidth="1" opacity="0.6" rx="2" />
        <line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Dasha-bhukti',
    plain: 'Life-chapter forecast',
    body:
      'Vimshottari Mahadasha + Antardasha analysis: what is being activated right now, what is being tested, and the one thing not to miss in the next 6 months.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M4 36 L16 22 L26 30 L42 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="36" r="2" fill="currentColor" opacity="0.6" />
        <circle cx="16" cy="22" r="2" fill="currentColor" opacity="0.8" />
        <circle cx="26" cy="30" r="2" fill="currentColor" />
        <circle cx="42" cy="12" r="2" fill="currentColor" opacity="0.6" />
      </svg>
    ),
  },
  {
    title: 'Gochara',
    plain: 'Transit windows',
    body:
      'Daily and weekly planetary transits applied to your natal chart. Saturn return, Jupiter transit through your 10th, Rahu / Ketu shifts — all flagged in plain English.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="5" fill="currentColor" opacity="0.9" />
        <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
        <circle cx="38" cy="24" r="2" fill="currentColor" />
        <circle cx="14" cy="34" r="2" fill="currentColor" opacity="0.7" />
        <circle cx="14" cy="14" r="2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
  {
    title: 'Ashtakoot Milan',
    plain: 'Compatibility match',
    body:
      'Classical 36-point Vedic compatibility (Guna Milan) for engagements and partnerships. Lagna, Moon, Mangal Dosha and Bhakoot all checked with citation.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="16" cy="24" r="10" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx="32" cy="24" r="10" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Annual Varshaphala',
    plain: 'Year-ahead forecast',
    body:
      'Solar-return reading: month-by-month + week-by-week + day-by-day forecast for the year ahead. Career, relationships, health, and money themes called out separately.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M24 6 A 18 18 0 0 1 42 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="24" x2="24" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="24" x2="36" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function UseCases() {
  return (
    <section
      aria-labelledby="usecases-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">What you can do</p>
          <h2 id="usecases-heading" className="section-title text-display-md">
            From Janam Kundali to muhurta — covered.
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Six classical use cases, one report engine. Pick the package that matches your moment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {CASES.map((c) => (
            <article
              key={c.title}
              className="group card-interactive p-7 md:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-350 origin-left rounded-t-card" />

              <div className="text-amber mb-5 transition-transform duration-250 group-hover:scale-105">
                {c.icon}
              </div>

              <h3 className="font-display text-2xl text-star mb-1">{c.title}</h3>
              <p className="font-mono text-mono-sm text-amber/70 tracking-[0.12em] uppercase mb-3">
                {c.plain}
              </p>
              <p className="font-body text-body-sm text-dust leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
