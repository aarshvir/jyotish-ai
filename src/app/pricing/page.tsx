'use client';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';

export default function PricingPage() {
  const plans = [
    {
      name: 'Preview Report',
      price: 'Free',
      priceNote: 'No credit card required',
      description: 'Discover your cosmic blueprint',
      features: ['Complete natal birth chart', 'Lagna (rising sign) analysis', 'Sample hora schedule for today', 'Dasha period overview', 'Planetary strength indicators'],
      cta: 'Get Free Preview',
      href: '/onboard?plan=free',
      highlight: false,
      badge: null,
    },
    {
      name: '7-Day Forecast',
      price: '₹799',
      priceNote: 'One-time payment · ~$9.99',
      description: 'Hour-by-hour cosmic timing for a week',
      features: ['Full natal chart analysis', '7-day hour-by-hour forecast', '18 hourly slots per day with scores', 'Choghadiya & hora timing', 'Daily strategy section', 'Auspicious window identification', 'Rahu Kaal warnings', 'PDF download'],
      cta: 'Get 7-Day Forecast',
      href: '/onboard?plan=7day',
      highlight: false,
      badge: null,
    },
    {
      name: 'Monthly Oracle',
      price: '₹1,499',
      priceNote: 'One-time payment · ~$19.99',
      description: '30 days of precision cosmic guidance',
      features: ['Everything in 7-Day Forecast', '30-day complete forecast', 'Monthly theme analysis', 'Weekly synthesis', 'Career, wealth, health windows', 'Best muhurta dates highlighted', 'Nativity deep analysis', 'High-resolution PDF report'],
      cta: 'Get Monthly Oracle',
      href: '/onboard?plan=monthly',
      highlight: true,
      badge: 'Most Popular',
    },
    {
      name: 'Annual Oracle',
      price: '₹3,999',
      priceNote: 'One-time payment · ~$49.99',
      description: 'Your complete cosmic year ahead',
      features: ['Everything in Monthly Oracle', 'Full 12-month forecast', 'Month-by-month breakdown', 'Annual theme & dasha analysis', 'Peak opportunity windows', 'Yearly muhurta calendar', 'Priority generation', 'Premium PDF + digital access'],
      cta: 'Get Annual Oracle',
      href: '/onboard?plan=annual',
      highlight: false,
      badge: 'Best Value',
    },
  ];

  return (
    <div className="min-h-screen bg-space text-star">
      <Navbar />

      {/* Hero */}
      <section className="text-center px-5 sm:px-8 pt-28 sm:pt-32 pb-10 sm:pb-14">
        <p className="section-eyebrow mb-3">Transparent Pricing</p>
        <h1 className="font-body font-semibold text-display-lg mb-4">Choose Your Oracle</h1>
        <p className="font-body text-body-lg text-dust max-w-lg mx-auto leading-relaxed">
          AI-powered Vedic astrology reports with hour-by-hour precision. One-time payments. Instant delivery. No subscriptions.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-14 sm:pb-18">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-card p-6 sm:p-7 ${
                plan.highlight
                  ? 'bg-amber/[0.06] border-2 border-amber shadow-glow-amber'
                  : 'card'
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-pill text-label-sm font-mono font-medium tracking-wider uppercase whitespace-nowrap ${
                  plan.highlight
                    ? 'bg-amber text-space'
                    : 'bg-amber/15 text-amber'
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <h2 className={`font-body text-headline-sm mb-1.5 ${plan.highlight ? 'text-amber' : 'text-star'}`}>
                  {plan.name}
                </h2>
                <p className="font-body text-body-sm text-dust mb-3 leading-relaxed">{plan.description}</p>
                <span className={`text-3xl font-bold font-mono ${plan.price === 'Free' ? 'text-success' : 'text-star'}`}>
                  {plan.price}
                </span>
                <p className="font-mono text-mono-sm text-dust/50 mt-1">{plan.priceNote}</p>
              </div>

              <ul className="list-none p-0 mb-6 flex-1 space-y-0" role="list">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 py-2 border-b border-horizon/30 text-body-sm text-dust leading-snug">
                    <span className="text-amber shrink-0 mt-0.5">✦</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`text-center min-h-[48px] rounded-button text-body-sm font-medium tracking-wide transition-all ${
                  plan.highlight
                    ? 'btn-primary w-full justify-center'
                    : plan.price === 'Free'
                    ? 'btn-secondary w-full justify-center text-success border-success/30 hover:bg-success/5'
                    : 'btn-secondary w-full justify-center'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology / Trust */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-14">
        <div className="card p-7 md:p-9">
          <h2 className="font-body text-headline-md text-star mb-4">Our Methodology</h2>
          <div className="prose-reading text-body-md text-dust space-y-3">
            <p>
              VedicHour uses the Swiss Ephemeris (pyswisseph) for planetary calculations — the same engine used by professional astrologers worldwide.
              We apply the Lahiri ayanamsa for sidereal positions and Vimshottari dasha for timing predictions.
            </p>
            <p>
              Each hourly window is scored by combining hora rulers, choghadiya quality, transit lagna, and your natal chart's functional benefic/malefic relationships.
              AI interpretation layers narrative and recommendations on top of the mathematical framework.
            </p>
            <p>
              This is not entertainment astrology. It is a structured analytical tool based on classical Vedic principles.
              Results should inform — not replace — your own judgment.
            </p>
          </div>
        </div>
      </section>

      {/* Support/Refund */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-14">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-5 text-center">
            <div className="text-2xl mb-2">🛡</div>
            <h3 className="font-body text-title-md text-star mb-1">48-Hour Refund</h3>
            <p className="text-body-sm text-dust">Full refund within 48 hours, no questions asked.</p>
            <Link href="/refund" className="font-mono text-mono-sm text-amber mt-2 inline-block hover:underline">
              Refund policy →
            </Link>
          </div>
          <div className="card p-5 text-center">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-body text-title-md text-star mb-1">Privacy First</h3>
            <p className="text-body-sm text-dust">Birth data encrypted. Never sold. Never shared.</p>
            <Link href="/privacy" className="font-mono text-mono-sm text-amber mt-2 inline-block hover:underline">
              Privacy policy →
            </Link>
          </div>
          <div className="card p-5 text-center">
            <div className="text-2xl mb-2">✉</div>
            <h3 className="font-body text-title-md text-star mb-1">Support</h3>
            <p className="text-body-sm text-dust">Questions? Reach us anytime.</p>
            <span className="font-mono text-mono-sm text-amber mt-2 inline-block">support@vedichour.com</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
