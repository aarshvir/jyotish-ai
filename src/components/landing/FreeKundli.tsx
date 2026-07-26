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
    title: 'Birth chart (Kundali)',
    desc: 'Your complete Vedic birth chart with all 9 planets across 12 houses — rising sign, Moon sign, and planetary placements.',
  },
  {
    title: 'Rising sign & Moon sign',
    desc: 'Your rising sign (Lagna) and Moon sign — the two most important chart factors in classical Vedic astrology.',
  },
  {
    title: 'Life-period timing',
    desc: 'Your current planetary period (Mahadasha and sub-period) — the Vedic timing system that shows which chapter of life is active.',
  },
  {
    title: 'Hourly windows (sample)',
    desc: 'A sample of today\'s hourly forecast — scores and quality ratings for each hour. Upgrade for the full 7- or 30-day forecast plus a 12-month outlook.',
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
              your birth date, time, and city to get your Janam Kundali in minutes.
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
                rel="nofollow"
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

            <p className="mt-4 font-mono text-mono-sm text-dust">
              Your full birth chart · your current life period · 100% free
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
                A <strong className="text-star">Kundli</strong> (also spelled Kundali, or called
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
                Jyotish measures from where the stars actually sit in the sky, not from the
                seasons.
              </p>
              <p>
                VedicHour is an <strong className="text-star">AI Jyotish</strong> platform. We
                compute your chart and every hourly window from your exact birth moment, then use
                AI to turn those calculations into readable, actionable{' '}
                <strong className="text-star">Vedic astrology reports</strong> — from a free
                Kundli preview to a full 30-day Jyotish forecast with a 12-month outlook.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
