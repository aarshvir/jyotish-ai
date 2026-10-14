import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { FREE_CHART_DESCRIPTION, FREE_CHART_HREF } from '@/lib/landingCopy';

export default function Hero() {
  return (
    <section className="public-hero" aria-labelledby="home-heading">
      <div className="public-container text-center">
        <p className="public-kicker">Vedic astrology, starting with your chart</p>
        <h1 id="home-heading" className="public-brand-heading">VedicHour</h1>
        <p className="public-hero-copy">{FREE_CHART_DESCRIPTION}</p>
        <div className="public-actions justify-center">
          <Link href={FREE_CHART_HREF} className="public-button public-button-primary">
            Create my free chart <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="#sample-chart" className="public-button public-button-secondary">
            See a sample <ArrowDown size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="public-meta mt-4">Chart facts only. No sign-up or payment card.</p>
      </div>
    </section>
  );
}
