import Link from 'next/link';

/**
 * FreeKundli — landing page section targeting high-volume keyword clusters:
 * "free kundli", "AI kundli", "Janam Kundali online", "Jyotish forecast",
 * "Vedic astrology report", "astrology report".
 *
 * This is a static server component — Google crawls every word here directly.
 */

const KUNDLI_FEATURES = [
  {
    title: 'Janam Kundali',
    desc: 'Your complete birth chart (Kundli) with all 9 Jyotish grahas across the 12 houses. Lagna, Moon sign, and planetary dignities included.',
  },
  {
    title: 'Lagna & Moon Sign',
    desc: 'Your Vedic rising sign (Lagna) and Moon nakshatra — the two most important factors in classical Jyotish.',
  },
  {
    title: 'Vimshottari Dasha',
    desc: 'Current Mahadasha and Antardasha period — the Jyotish timing system that shows which planetary cycle is active in your life.',
  },
  {
    title: 'Jyotish Hora Schedule',
    desc: 'A sample hourly Jyotish forecast showing hora rulers and choghadiya quality for today. Upgrade for the full 7–365 day AI Vedic forecast.',
  },
];

export default function FreeKundli() {
  return (
    <section
      id="free-kundli"
      aria-labelledby="free-kundli-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: keyword-rich text */}
          <div>
            <p className="section-eyebrow mb-3">Free · No Card Required</p>
            <h2
              id="free-kundli-heading"
              className="font-body font-semibold text-star text-display-sm leading-tight mb-4"
            >
              Free Kundli Online —{' '}
              <span className="text-amber">Janam Kundali</span>{' '}
              in Minutes
            </h2>
            <p className="font-body text-body-lg text-dust leading-relaxed mb-6">
              VedicHour is a free Kundli generator built on classical Jyotish. Enter
              your birth date, time, and city to get your Janam Kundali instantly.
              No astrologer needed. No card required.
            </p>
            <p className="font-body text-body-md text-dust/80 leading-relaxed mb-8">
              Our AI Kundli report goes beyond a traditional chart printout — it explains
              every placement in plain English, tells you which Dasha you&apos;re in,
              and gives you a sample Jyotish hourly forecast so you can see exactly how
              your day is likely to flow.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/onboard?plan=free"
                className="btn-primary text-base px-8 py-3.5"
              >
                Get Free Kundli →
              </Link>
              <Link
                href="/pricing"
                className="btn-secondary text-base px-8 py-3.5"
              >
                See AI Jyotish Plans
              </Link>
            </div>

            <p className="mt-4 font-mono text-mono-sm text-dust/50">
              Swiss Ephemeris · Lahiri Ayanamsa · Vimshottari Dasha · 100% free
            </p>
          </div>

          {/* Right: what's included */}
          <div className="grid sm:grid-cols-2 gap-4">
            {KUNDLI_FEATURES.map((f) => (
              <div
                key={f.title}
                className="card p-5"
              >
                <div className="text-amber text-lg mb-2">✦</div>
                <h3 className="font-body font-semibold text-star text-title-md mb-1.5">
                  {f.title}
                </h3>
                <p className="font-body text-body-sm text-dust leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom: SEO prose — keyword-rich paragraph block */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="card p-7 md:p-9">
            <h3 className="font-body text-headline-md text-star mb-4">
              What is a Kundli? What is Jyotish?
            </h3>
            <div className="space-y-3 font-body text-body-md text-dust leading-relaxed">
              <p>
                A <strong className="text-star">Kundli</strong> (also spelledKundali, or called
                Janam Kundali / Janam Patri) is a birth chart in classical{' '}
                <strong className="text-star">Jyotish</strong> astrology — the ancient Indian
                system also known as Vedic astrology. It maps the positions of the 9 Jyotish
                planets (<em>grahas</em>) at the exact moment of your birth, across the 12 houses.
              </p>
              <p>
                A <strong className="text-star">Jyotish forecast</strong> (or{' '}
                <strong className="text-star">Vedic astrology forecast</strong>) uses your Kundli
                along with predictive tools — primarily Vimshottari Dasha and transit analysis —
                to identify favourable and challenging periods ahead. Unlike Western horoscopes,
                Jyotish uses the sidereal zodiac (actual star positions, not the tropical/seasonal
                zodiac).
              </p>
              <p>
                VedicHour is an <strong className="text-star">AI Jyotish</strong> platform. We
                compute your chart and every hourly window using the Swiss Ephemeris (the same
                engine used by professional Jyotish astrologers worldwide), then use AI to turn
                those calculations into readable, actionable{' '}
                <strong className="text-star">Vedic astrology reports</strong> — from a free
                Kundli preview to a full 365-day{' '}
                <strong className="text-star">Jyotish forecast</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
