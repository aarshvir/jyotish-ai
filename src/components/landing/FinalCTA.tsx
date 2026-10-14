import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FREE_CHART_HREF } from '@/lib/landingCopy';

export default function FinalCTA() {
  return (
    <section className="public-band public-close" aria-labelledby="start-heading">
      <div className="public-container flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h2 id="start-heading">Begin with your birth chart.</h2><p className="public-body mt-2">Your chart facts, free. No sign-up or payment card.</p></div>
        <Link href={FREE_CHART_HREF} className="public-button public-button-primary self-start md:self-auto">Create my free chart <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
