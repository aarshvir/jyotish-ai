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
      href: '/onboard?plan=preview',
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d0d2b 50%, #0a0a1a 100%)', color: '#e8e0d0', fontFamily: "'Georgia', serif" }}>
      <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#d4af37', letterSpacing: '0.05em' }}>VedicHour</span>
        </Link>
        <Link href="/onboard" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #d4af37, #b8962e)', color: '#0a0a1a', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', fontFamily: 'system-ui' }}>Get Started</Link>
      </header>
      <section style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.25em', color: '#d4af37', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'system-ui' }}>Transparent Pricing</p>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: '400', margin: '0 0 20px', lineHeight: 1.2 }}>Choose Your Oracle</h1>
        <p style={{ fontSize: '18px', color: '#a09880', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7, fontFamily: 'system-ui' }}>AI-powered Vedic astrology reports with hour-by-hour precision. One-time payments. Instant delivery. No subscriptions.</p>
      </section>
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {plans.map((plan) => (
          <div key={plan.name} style={{ background: plan.highlight ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))' : 'rgba(255,255,255,0.03)', border: plan.highlight ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '36px 28px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {plan.badge && (
              <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: plan.highlight ? 'linear-gradient(135deg, #d4af37, #b8962e)' : 'rgba(212,175,55,0.2)', color: plan.highlight ? '#0a0a1a' : '#d4af37', padding: '4px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui', whiteSpace: 'nowrap' }}>{plan.badge}</div>
            )}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: plan.highlight ? '#d4af37' : '#e8e0d0' }}>{plan.name}</h2>
              <p style={{ fontSize: '13px', color: '#6b6350', fontFamily: 'system-ui', marginBottom: '20px' }}>{plan.description}</p>
              <span style={{ fontSize: '40px', fontWeight: '700', color: plan.price === 'Free' ? '#6baa6b' : '#e8e0d0' }}>{plan.price}</span>
              <p style={{ fontSize: '12px', color: '#6b6350', fontFamily: 'system-ui', marginTop: '4px' }}>{plan.priceNote}</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', flex: 1 }}>
              {plan.features.map((feature) => (
                <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px', color: '#a09880', fontFamily: 'system-ui', lineHeight: 1.5 }}>
                  <span style={{ color: '#d4af37', flexShrink: 0 }}>✦</span>{feature}
                </li>
              ))}
            </ul>
            <Link href={plan.href} style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: '600', fontFamily: 'system-ui', background: plan.highlight ? 'linear-gradient(135deg, #d4af37, #b8962e)' : plan.price === 'Free' ? 'transparent' : 'rgba(212,175,55,0.15)', color: plan.highlight ? '#0a0a1a' : plan.price === 'Free' ? '#6baa6b' : '#d4af37', border: plan.price === 'Free' ? '1px solid rgba(107,170,107,0.4)' : plan.highlight ? 'none' : '1px solid rgba(212,175,55,0.3)' }}>{plan.cta}</Link>
          </div>
        ))}
      </section>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontFamily: 'system-ui', fontSize: '13px', color: '#6b6350' }}>
        <span>© 2026 VedicHour. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link href="/terms" style={{ color: '#6b6350', textDecoration: 'none' }}>Terms</Link>
          <Link href="/privacy" style={{ color: '#6b6350', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/refund" style={{ color: '#6b6350', textDecoration: 'none' }}>Refunds</Link>
        </div>
      </footer>
    </div>
  )
}
