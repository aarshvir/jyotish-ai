import { headers, cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, CirclePause, BookOpen, UserRound } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { commercialAvailability } from '@/lib/commercial/availability';
import { currencyForRequest, getDisplayPrice, PLAN_CARDS } from '@/lib/pricing';
import { getPlanAmount } from '@/lib/ziina/server';
import { FREE_CHART_FEATURES, FREE_CHART_HREF } from '@/lib/landingCopy';

// Availability must be evaluated at request time, not frozen into a static sales page.
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const availability = commercialAvailability();
  const requestHeaders = headers();
  const cookieStore = cookies();
  const currency = currencyForRequest(cookieStore.get('vh_currency')?.value, requestHeaders.get('x-vercel-ip-country'));
  const paidPlans = availability.checkoutEnabled ? PLAN_CARDS.filter((plan) => plan.id !== 'free') : [];
  const rawUrl = (process.env.NEXT_PUBLIC_URL ?? '').trim();
  const siteUrl = (!rawUrl || rawUrl.startsWith('http://localhost') ? 'https://www.vedichour.com' : rawUrl).replace(/\/+$/, '');

  return (
    <div className="public-experience">
      <Navbar />
      <main id="main-content">
        <header className="public-pricing-intro public-container">
          <p className="public-kicker">Pricing and availability</p>
          <h1>Start free with VedicHour.</h1>
          <p className="public-body mt-4 max-w-xl">The birth chart calculators are available now. Written readings and personalized hourly forecasts are separate from the free chart.</p>
        </header>
        <section className="public-band pt-0" aria-labelledby="free-plan-heading">
          <div className="public-container public-pricing-grid">
            <div className="public-free-plan">
              <div className="public-section-heading mb-5">
                <div><p className="public-kicker">Available now</p><h2 id="free-plan-heading">Free chart facts</h2></div>
                <span className="public-free-price">Free</span>
              </div>
              <p className="public-body">A factual starting point for exploring your Vedic birth chart.</p>
              <ul className="public-feature-list">{FREE_CHART_FEATURES.map((feature) => <li key={feature}><Check size={18} aria-hidden="true" className="shrink-0" /><span>{feature}</span></li>)}</ul>
              <Link href={FREE_CHART_HREF} className="public-button public-button-primary">Create my free chart <ArrowRight size={18} aria-hidden="true" /></Link>
              <p className="public-meta mt-4">No personalized hourly forecast or written reading is included.</p>
            </div>
            <div className="public-availability" data-commercial-status={availability.status}>
              {availability.checkoutEnabled ? <Check size={25} aria-hidden="true" /> : <CirclePause size={25} aria-hidden="true" />}
              <h2 className="mt-4">{availability.checkoutEnabled ? 'Written readings are available.' : 'New paid readings are unavailable.'}</h2>
              <p className="public-body mt-3">{availability.message}</p>
              {!availability.checkoutEnabled && <p className="public-body mt-3">There is no new purchase to make here. Explore a calculated example or return to reports you already have.</p>}
              <div className="flex flex-col items-start gap-4 mt-6">
                <Link href="/sample-report" className="public-text-link"><BookOpen size={17} aria-hidden="true" /> Read the example</Link>
                <Link href="/dashboard" className="public-text-link"><UserRound size={17} aria-hidden="true" /> Open your reports</Link>
              </div>
            </div>
          </div>
        </section>
        {availability.checkoutEnabled && (
          <section className="public-band" aria-labelledby="paid-plans-heading">
            <div className="public-container">
              <div className="public-section-heading">
                <div><p className="public-kicker">Written readings</p><h2 id="paid-plans-heading">Monthly or yearly</h2></div>
                <p className="public-meta">Prices in {currency}. Review the total before payment.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {paidPlans.map((plan) => (
                  <article key={plan.id} className="public-paid-plan">
                    <h3>{plan.name}</h3>
                    <p className="public-body mt-2">{plan.description}</p>
                    <p className="public-plan-price mt-5">{getDisplayPrice(plan.id, currency)} <span>per {plan.id === 'sub_annual' ? 'year' : 'month'}</span></p>
                    <ul className="public-feature-list">{plan.features.map((feature) => <li key={feature}><Check size={17} aria-hidden="true" className="shrink-0" /><span>{feature}</span></li>)}</ul>
                    <Link href={plan.href} className="public-button public-button-secondary">{plan.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
                  </article>
                ))}
              </div>
            </div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              '@context': 'https://schema.org', '@type': 'Product', name: 'VedicHour written readings', url: `${siteUrl}/pricing`,
              offers: paidPlans.map((plan) => ({
                '@type': 'Offer', name: plan.name, price: (getPlanAmount(plan.id, 'USD') / 100).toFixed(2),
                priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${siteUrl}${plan.href}`,
              })),
            }) }} />
          </section>
        )}
        <section className="public-band public-method" aria-labelledby="pricing-help-heading">
          <div className="public-container">
            <h2 id="pricing-help-heading">Understand before you decide.</h2>
            <div className="grid sm:grid-cols-3 gap-8 mt-6">
              <div><h3>Method and limits</h3><p className="public-body mt-2">Calculated positions are distinct from written interpretation. Astrology is not a guarantee of outcomes.</p><Link href="/methodology" className="public-text-link mt-4">Read the method <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
              <div><h3>Existing reports</h3><p className="public-body mt-2">Use the account that owns your report. New checkout availability does not remove reports already in your account.</p><Link href="/dashboard" className="public-text-link mt-4">Your reports <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
              <div><h3>Account or billing help</h3><p className="public-body mt-2">Find help with account access, existing purchases and the published refund policy.</p><Link href="/help" className="public-text-link mt-4">Get help <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
