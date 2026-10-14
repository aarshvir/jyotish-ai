import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { commercialAvailability } from '@/lib/commercial/availability';

export default function Pricing() {
  const availability = commercialAvailability();
  return (
    <section id="pricing" className="public-band" aria-labelledby="landing-pricing-heading">
      <div className="public-container">
        <h2 id="landing-pricing-heading">{availability.checkoutEnabled ? 'Written readings, separate from your free chart.' : 'Free chart facts are available now.'}</h2>
        <p className="public-body mt-3">{availability.message}</p>
        <Link href="/pricing" className="public-text-link mt-5">Pricing and availability <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
