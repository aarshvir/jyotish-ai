'use client'
import Link from 'next/link'

export default function PricingPage() {
  const plans = [
    {
      name: 'Preview Report',
      price: 'Free',
      priceNote: 'No credit card required',
      description: 'Discover your cosmic blueprint',
      features: ['Complete natal birth chart','Lagna (rising sign) analysis','Sample hora schedule for today','Dasha period overview','Planetary strength indicators'],
      cta: 'Get Free Preview',
      href: '/onboard?plan=free',
      highlight: false,
      badge: null,
    },
    {
      name: '7-Day Forecast',
      price: '$9.99',
      priceNote: 'One-time payment',
      description: 'Hour-by-hour cosmic timing for a week',
      features: ['Full natal chart analysis','7-day hour-by-hour forecast','18 hourly slots per day with scores','Choghadiya & hora timing','Daily STRATEGY section','Auspicious window identification','Rahu Kaal warnings','PDF download'],
      cta: 'Get 7-Day Forecast',
      href: '/onboard?plan=7day',
      highlight: false,
      badge: null,
    },
    {
      name: 'Monthly Oracle',
      price: '$19.99',
      priceNote: 'One-time payment',
      description: '30 days of precision cosmic guidance',
      features: ['Everything in 7-Day Forecast','30-day complete forecast','Monthly theme analysis','Weekly synthesis','Career, wealth, health windows','Best muhurta dates highlighted','Nativity deep analysis','High-resolution PDF report'],
      cta: 'Get Monthly Oracle',
      href: '/onboard?plan=monthly',
      highlight: true,
      badge: 'Most Popular',
    },
    {
      name: 'Annual Oracle',
      price: '$49.99',
      priceNote: 'One-time payment',
      description: 'Your complete cosmic year ahead',
      features: ['Everything in Monthly Oracle','Full 12-month forecast','Month-by-month breakdown','Annual theme & dasha analysis','Peak opportunity windows','Yearly muhurta calendar','Priority generation','Premium PDF + digital access'],
      cta: 'Get Annual Oracle',
      href: '/onboard?plan=annual',
      highlight: false,
      badge: 'Best Value',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-space via-dark to-space text-star font-display">
      {/* Header */}
      <header className="px-5 sm:px-8 lg:px-12 py-5 flex justify-between items-center border-b border-amber/15">
        <Link href="/" className="no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 rounded-sm">
          <span className="text-xl sm:text-2xl font-bold text-amber tracking-wider font-mono">VedicHour</span>
        </Link>
        <Link
          href="/onboard"
          className="px-5 py-2.5 min-h-[44px] flex items-center bg-gradient-to-r from-amber to-amber/80 text-space rounded-md text-sm font-semibold font-mono hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
        >
          Get Started
        </Link>
      </header>

      {/* Hero */}
      <section className="text-center px-5 sm:px-8 pt-14 sm:pt-20 pb-12 sm:pb-16">
        <p className="text-xs tracking-[0.25em] text-amber uppercase mb-4 font-mono">Transparent Pricing</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light mb-5 leading-tight">Choose Your Oracle</h1>
        <p className="text-base sm:text-lg text-dust/70 max-w-lg mx-auto leading-relaxed font-sans">
          AI-powered Vedic astrology reports with hour-by-hour precision. One-time payments. Instant delivery. No subscriptions.
        </p>
      </section>

      {/* Plans grid */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-7 sm:p-8 ${
                plan.highlight
                  ? 'bg-gradient-to-br from-amber/12 to-amber/4 border border-amber/50'
                  : 'bg-white/[0.03] border border-white/8'
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase font-mono whitespace-nowrap ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-amber to-amber/80 text-space'
                    : 'bg-amber/20 text-amber'
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h2 className={`text-lg sm:text-xl font-semibold mb-2 ${plan.highlight ? 'text-amber' : 'text-star'}`}>
                  {plan.name}
                </h2>
                <p className="text-sm text-dust/60 font-sans mb-4 leading-relaxed">{plan.description}</p>
                <span className={`text-4xl font-bold ${plan.price === 'Free' ? 'text-emerald' : 'text-star'}`}>
                  {plan.price}
                </span>
                <p className="text-xs text-dust/50 font-mono mt-1">{plan.priceNote}</p>
              </div>

              {/* Features */}
              <ul className="list-none p-0 mb-7 flex-1 space-y-0">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 py-2 border-b border-white/4 text-sm text-dust/70 font-sans leading-snug">
                    <span className="text-amber flex-shrink-0 mt-0.5">✦</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className={`flex items-center justify-center text-center px-4 py-3.5 min-h-[48px] rounded-lg text-sm font-semibold font-mono no-underline transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-amber to-amber/80 text-space border-0'
                    : plan.price === 'Free'
                    ? 'bg-transparent text-emerald border border-emerald/40 hover:bg-emerald/5'
                    : 'bg-amber/15 text-amber border border-amber/30 hover:bg-amber/20'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 px-5 sm:px-8 lg:px-12 py-7 flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-xs text-dust/50">
        <span>© {new Date().getFullYear()} VedicHour. All rights reserved.</span>
        <div className="flex gap-5 sm:gap-6">
          <Link href="/terms" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Terms</Link>
          <Link href="/privacy" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Privacy</Link>
          <Link href="/refund" className="text-dust/50 hover:text-amber transition-colors no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/60 rounded-sm">Refunds</Link>
        </div>
      </footer>
    </div>
  )
}
