const STEPS = [
  {
    number: '01',
    title: 'Enter Birth Data',
    description: 'Date, time, and place of birth. We auto-geocode your city and lock in coordinates for sub-degree precision.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
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
    description: 'Real planetary positions via pyswisseph. Lahiri ayanamsa, Vimshottari dasha, true sidereal lagna. No approximations.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="5" fill="currentColor" opacity="0.9" />
        <ellipse cx="24" cy="24" rx="20" ry="9" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <ellipse cx="24" cy="24" rx="20" ry="9" stroke="currentColor" strokeWidth="0.8" opacity="0.5" transform="rotate(60 24 24)" />
        <ellipse cx="24" cy="24" rx="20" ry="9" stroke="currentColor" strokeWidth="0.8" opacity="0.5" transform="rotate(120 24 24)" />
        <circle cx="38" cy="18" r="2.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'AI Interprets & Guides',
    description: 'Cross-references your chart with every hora and choghadiya window, producing hourly scores and actionable narrative.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="6" y="30" width="8" height="12" rx="1" fill="currentColor" opacity="0.35" />
        <rect x="20" y="20" width="8" height="22" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="34" y="12" width="8" height="30" rx="1" fill="currentColor" opacity="0.9" />
        <circle cx="10" cy="24" r="2.5" fill="currentColor" opacity="0.5" />
        <circle cx="24" cy="14" r="2.5" fill="currentColor" opacity="0.7" />
        <circle cx="38" cy="6" r="2.5" fill="currentColor" />
        <path d="M10 24 L24 14 L38 6" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-28 bg-cosmos relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">The Process</p>
          <h2 className="section-title text-display-md">
            How It Works
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Ancient precision, delivered in seconds.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="group card-interactive p-7 md:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-350 origin-left rounded-t-card" />

              <span className="font-mono text-mono-sm text-dust/40 tracking-[0.15em] mb-5 block">
                {step.number}
              </span>

              <div className="text-amber mb-5 transition-transform duration-250 group-hover:scale-105">
                {step.icon}
              </div>

              <h3 className="font-body text-headline-sm text-star mb-2.5">
                {step.title}
              </h3>
              <p className="font-body text-body-sm text-dust leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
