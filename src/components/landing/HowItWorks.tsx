// Server component — CSS hover transitions only, no Framer Motion needed.

const STEPS = [
  {
    number: '01',
    title: 'Birth Data In',
    description: 'Enter your date, time, and place of birth. We geocode your city automatically and lock in your coordinates.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <line x1="24" y1="4"  x2="24" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="24" y1="38" x2="24" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4"  y1="24" x2="10" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="38" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Swiss Ephemeris Calculates',
    description: 'Real planetary positions via pyswisseph — Lahiri ayanamsa, Vimshottari dasha, true sidereal lagna. No guesses.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="5" fill="currentColor" opacity="0.9" />
        <ellipse cx="24" cy="24" rx="20" ry="9"  stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
        <ellipse cx="24" cy="24" rx="20" ry="9"  stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6"
          transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="24" rx="20" ry="9"  stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6"
          transform="rotate(120 24 24)" />
        <circle cx="38" cy="18" r="2.5" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'AI Interprets',
    description: 'Our AI engine cross-references your chart with every hora and choghadiya, producing hourly ratings + narrative.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="6"  y="30" width="8" height="12" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="20" y="20" width="8" height="22" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="34" y="12" width="8" height="30" rx="1" fill="currentColor" opacity="0.9" />
        <circle cx="10" cy="24" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="24" cy="14" r="3" fill="currentColor" opacity="0.8" />
        <circle cx="38" cy="6"  r="3" fill="currentColor" />
        <path d="M10 24 L24 14 L38 6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 bg-cosmos relative">
      {/* Top border line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-horizon to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-mono text-xs text-amber tracking-[0.2em] uppercase mb-4">The Process</p>
          <h2 className="font-display font-semibold text-star mb-4"
              style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}>
            How It Works
          </h2>
          <p className="font-body text-dust text-lg max-w-xl mx-auto">
            Ancient precision, delivered in seconds.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="group relative bg-space border border-horizon rounded-sm p-8
                         transition-all duration-300
                         hover:border-amber/40 hover:bg-nebula"
            >
              {/* Amber top accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-sm
                              bg-amber scale-x-0 group-hover:scale-x-100
                              transition-transform duration-300 origin-left" />

              {/* Step number */}
              <span className="font-mono text-xs text-horizon tracking-[0.2em] mb-6 block">
                {step.number}
              </span>

              {/* Icon */}
              <div className="text-amber mb-6 transition-transform duration-300 group-hover:scale-105">
                {step.icon}
              </div>

              {/* Text */}
              <h3 className="font-display font-semibold text-star text-2xl mb-3">
                {step.title}
              </h3>
              <p className="font-body text-dust text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
