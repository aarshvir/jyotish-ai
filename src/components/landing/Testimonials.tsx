/**
 * Testimonials — illustrative example insights for the landing page.
 *
 * LAUNCH INTEGRITY: VedicHour is newly launched and does not yet have a body of
 * real customer reviews. These are ILLUSTRATIVE examples of the kind of guidance
 * the report surfaces, organised by lagna. They are clearly labelled as examples
 * (not customer reviews) and carry NO star ratings or adoption counts. Replace
 * with real, consented, attributed reviews once collected.
 */

const EXAMPLES = [
  {
    quote:
      'An hour-by-hour map of the day — it flags the Jupiter hora windows worth scheduling a key meeting into, and the Rahu Kaal hours to avoid.',
    lagna: 'Cancer lagna',
    theme: 'Hourly timing',
  },
  {
    quote:
      'The Mahadasha–Antardasha read explains which life themes are switched on right now, grounded in classical Vimshottari periods — not generic horoscope filler.',
    lagna: 'Virgo lagna',
    theme: 'Dasha periods',
  },
  {
    quote:
      'A Choghadiya and muhurta overlay for picking auspicious windows — the kind of thing you would otherwise ask a family astrologer to work out by hand.',
    lagna: 'Taurus lagna',
    theme: 'Muhurta',
  },
  {
    quote:
      'Sidereal precision done properly: Lahiri ayanamsa, whole-sign houses, and dasha periods computed from Swiss Ephemeris data — not Western sun-sign approximations.',
    lagna: 'Scorpio lagna',
    theme: 'Sidereal accuracy',
  },
  {
    quote:
      'A 12-month thematic outlook that names the periods to watch, paired with 30 days of hour-level detail so you know exactly where to start.',
    lagna: 'Libra lagna',
    theme: 'Annual outlook',
  },
  {
    quote:
      'The downloadable PDF reads like a structured personal Jyotish reading, with scripture citations for the chart-specific claims it makes.',
    lagna: 'Sagittarius lagna',
    theme: 'Full report',
  },
];

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
          <p className="section-eyebrow">Inside the report</p>
          <h2
            id="testimonials-heading"
            className="section-title text-display-md"
          >
            The kind of guidance your reading gives
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Illustrative examples by lagna — not customer reviews. Real seeker
            stories will appear here as they are shared.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {EXAMPLES.map((t, i) => (
            <figure
              key={i}
              className="card-interactive p-7 flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber/30" />

              <span className="font-mono text-mono-sm text-amber/70 tracking-[0.12em] uppercase">
                {t.theme}
              </span>

              <blockquote className="font-body text-body-md text-star/85 leading-relaxed mt-4 mb-6 flex-1">
                {t.quote}
              </blockquote>

              <figcaption className="border-t border-horizon/30 pt-4 mt-auto">
                <div className="font-mono text-mono-sm text-dust/60">
                  Illustrative example · <span className="text-amber/70">{t.lagna}</span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="text-center mt-12 font-mono text-mono-sm text-dust/50 tracking-wider">
          Illustrative examples of report content — not customer testimonials.
        </p>
      </div>
    </section>
  );
}
