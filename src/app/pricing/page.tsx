import { headers, cookies } from 'next/headers';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { currencyForRequest, getDisplayPrice, PLAN_CARDS, STANDALONE_PRODUCTS } from '@/lib/pricing';
import { getPlanAmount } from '@/lib/ziina/server';
import { ShieldCheckIcon } from '@/components/ui/ShieldCheckIcon';

export default async function PricingPage() {
  const h = await headers();
  const cookieStore = await cookies();
  const currency = currencyForRequest(cookieStore.get('vh_currency')?.value, h.get('x-vercel-ip-country'));

  const rawUrl = process.env.NEXT_PUBLIC_URL ?? '';
  const SITE_URL = (rawUrl.startsWith('http://localhost') || rawUrl === '' ? 'https://www.vedichour.com' : rawUrl).replace(
    /\/+$/,
    '',
  );

  // Rendered from the same table checkout charges from, so the shown price is the charged price.
  const plans = PLAN_CARDS.map((p) => ({
    ...p,
    price: p.id === 'free' ? 'Free' : getDisplayPrice(p.id, currency),
    priceNote: p.id === 'free' ? 'No sign-up, no card' : `${p.id === 'sub_annual' ? 'Per year' : 'Per month'} · ${currency}`,
  }));

  const usd = (planId: string) => (getPlanAmount(planId, 'USD') / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-space text-star">
      <Navbar />

      {/* Hero */}
      <section className="text-center px-5 sm:px-8 pt-28 sm:pt-32 pb-10 sm:pb-14">
        <p className="section-eyebrow mb-3">Free calculators · one subscription</p>
        <h1 className="font-body font-semibold text-display-lg mb-4">Your timing, planned every month.</h1>
        <p className="font-body text-body-lg text-dust max-w-lg mx-auto leading-relaxed">
          The calculators are free, with no sign-up. Your hour-by-hour forecast, written around what you tell us in a
          short quiz, comes with a subscription.
        </p>
        <p className="mt-4 font-body text-body-sm text-dust">
          Prices shown in {currency}. Nothing is charged automatically — you renew each period with one tap.
        </p>
      </section>

      {/* Deeper readings, included */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-6">
        <div className="grid sm:grid-cols-2 gap-5">
          {STANDALONE_PRODUCTS.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="group rounded-card border border-horizon/50 hover:border-amber/50 bg-cosmos p-6 transition-colors"
            >
              <div className="flex items-start justify-between mb-2 gap-3">
                <h3 className="font-display text-headline-md text-star">{p.name}</h3>
                <span className="font-body text-body-sm text-amber shrink-0">Included</span>
              </div>
              <p className="font-body text-body-sm text-dust leading-relaxed mb-3">{p.description}</p>
              <span className="font-body text-body-sm text-amber group-hover:underline">{p.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-14 sm:pb-18">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-card p-6 sm:p-7 ${
                plan.featured ? 'bg-amber/[0.06] border-2 border-amber shadow-glow-amber' : 'card'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-pill text-label-sm font-body font-medium whitespace-nowrap bg-amber text-space">
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <h2 className={`font-body text-headline-sm mb-1.5 ${plan.featured ? 'text-amber' : 'text-star'}`}>
                  {plan.name}
                </h2>
                <p className="font-body text-body-sm text-dust mb-3 leading-relaxed">{plan.description}</p>
                <span
                  className={`text-3xl font-bold font-body tabular-nums ${plan.price === 'Free' ? 'text-success' : 'text-star'}`}
                >
                  {plan.price}
                </span>
                <p className="font-body text-body-sm text-dust mt-1">{plan.priceNote}</p>
              </div>

              <ul className="list-none p-0 mb-6 flex-1 space-y-0" role="list">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 py-2 border-b border-horizon/30 text-body-sm text-dust leading-snug"
                  >
                    <span className="text-amber shrink-0 mt-0.5">✦</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.id !== 'free' && (
                <div className="flex items-center gap-2 mb-3 text-sm text-success/80">
                  <ShieldCheckIcon className="h-4 w-4 shrink-0" />
                  <Link href="/refund" className="hover:underline font-body text-body-sm">
                    24-hour money-back guarantee
                  </Link>
                </div>
              )}

              <Link
                href={plan.href}
                className={`text-center min-h-[48px] rounded-button text-body-sm font-medium transition-all ${
                  plan.featured
                    ? 'btn-primary w-full justify-center'
                    : plan.id === 'free'
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
              VedicHour calculates every chart from real astronomical data — the same math a careful astrologer uses.
              Positions are measured the traditional Indian way, from where the stars actually sit in the sky, and
              life-period timing comes from your Vimshottari dasha.
            </p>
            <p>
              Each hourly window is scored by combining hora rulers, choghadiya quality, transit lagna, and your natal
              chart&apos;s functional benefic/malefic relationships. AI interpretation layers narrative and
              recommendations on top of the mathematical framework.
            </p>
            <p>
              This is a structured analytical tool based on classical Vedic principles. Results should inform — not
              replace — your own judgment.
            </p>
          </div>
        </div>
      </section>

      {/* Support/Refund */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-14">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card p-5 text-center">
            <div className="flex justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber" aria-hidden>
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-body text-title-md text-star mb-1">24-Hour Refund</h3>
            <p className="text-body-sm text-dust">Full refund within 24 hours. No questions asked.</p>
            <Link href="/refund" className="font-body text-body-sm text-amber mt-2 inline-block hover:underline">
              Refund policy →
            </Link>
          </div>
          <div className="card p-5 text-center">
            <div className="flex justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="font-body text-title-md text-star mb-1">Privacy First</h3>
            <p className="text-body-sm text-dust">Birth data encrypted. Never sold. Never shared.</p>
            <Link href="/privacy" className="font-body text-body-sm text-amber mt-2 inline-block hover:underline">
              Privacy policy →
            </Link>
          </div>
          <div className="card p-5 text-center">
            <div className="flex justify-center mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber" aria-hidden>
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M2 8l10 7 10-7" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h3 className="font-body text-title-md text-star mb-1">Support</h3>
            <p className="text-body-sm text-dust">Questions? Reach us anytime.</p>
            <span className="font-body text-body-sm text-amber mt-2 inline-block">support@vedichour.com</span>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'VedicHour Subscription',
            url: `${SITE_URL}/pricing`,
            offers: [
              {
                '@type': 'Offer',
                name: 'Monthly',
                price: usd('sub_monthly'),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Yearly',
                price: usd('sub_annual'),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
            ],
          }),
        }}
      />

      <Footer />
    </div>
  );
}
