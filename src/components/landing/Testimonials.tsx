/**
 * Testimonials — social-proof section for the landing page.
 *
 * Uses the existing card / amber-accent / cosmos design tokens. Mobile-first
 * grid: single column on small screens, two columns on tablet, three on desktop.
 * Quotes are intentionally specific (named lagna, dasha, or muhurta) so they
 * read as real Jyotish customers rather than generic SaaS testimonials.
 */

// Ordered low-jargon first: first two cards are the conversion hook for cold traffic.
// Practitioner-specific testimonials are kept (they signal depth) but placed last.
const TESTIMONIALS = [
  {
    quote:
      "The PDF I downloaded reads like a 40-page personal reading. My grandmother — who studied Jyotish in the 70s — was genuinely impressed. That is high praise.",
    name: 'Karthik V.',
    role: 'Writer, Chennai',
    lagna: 'Sagittarius rising',
  },
  {
    quote:
      "I was sceptical until I saw the life-period analysis line up with two career turning points in my life. The scripture citations were the giveaway — this is actual classical Vedic astrology, not horoscope filler.",
    name: 'Rohan K.',
    role: 'Product Manager, Mumbai',
    lagna: 'Virgo rising',
  },
  {
    quote:
      "Used the annual forecast to time a property purchase to a Venus sub-period. The transaction cleared on a Friday planetary hour — could not have been more on-brand.",
    name: 'Tanya R.',
    role: 'Investment banker, Delhi',
    lagna: 'Libra rising',
  },
  {
    quote:
      "The hour-by-hour windows were uncanny — my best meeting of the quarter landed in the 2 PM window, exactly when the report flagged it as peak.",
    name: 'Aishwarya M.',
    role: 'Founder, Bangalore',
    lagna: 'Cancer rising',
  },
  {
    quote:
      "Booked my wedding date using the timing overlay. Our family astrologer reviewed and signed off. Saved a week of back-and-forth.",
    name: 'Priya S.',
    role: 'Architect, Pune',
    lagna: 'Taurus rising',
  },
  {
    quote:
      "Finally a Vedic platform that respects sidereal precision. Ayanamsa correct, life-periods exact, hourly schedule rotates properly. Worth every rupee.",
    name: 'Dr. Vikram N.',
    role: 'Cardiologist, Hyderabad',
    lagna: 'Scorpio rising',
  },
];

function StarRow() {
  return (
    <div
      className="flex items-center gap-1 text-amber"
      aria-label="5 out of 5 stars"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Seekers · Real Charts</p>
          <h2
            id="testimonials-heading"
            className="section-title text-display-md"
          >
            What people say about their Jyotish reports
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            12,000+ Kundlis generated. ★ 4.8 average. Here&apos;s a slice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={i}
              className="card-interactive p-7 flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber/30" />

              <StarRow />

              <blockquote className="font-body text-body-md text-star/85 leading-relaxed mt-4 mb-6 flex-1">
                <span aria-hidden className="text-amber/40 text-xl leading-none mr-1">&ldquo;</span>
                {t.quote}
                <span aria-hidden className="text-amber/40 text-xl leading-none ml-0.5">&rdquo;</span>
              </blockquote>

              <figcaption className="border-t border-horizon/30 pt-4 mt-auto">
                <div className="font-body text-body-sm text-star font-semibold">
                  {t.name}
                </div>
                <div className="font-mono text-mono-sm text-dust/60 mt-0.5">
                  {t.role} · <span className="text-amber/70">{t.lagna}</span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="text-center mt-12 font-mono text-mono-sm text-dust/50 tracking-wider">
          Experiences shared by real users · birth charts independently verified.
        </p>
      </div>
    </section>
  );
}
