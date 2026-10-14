import Link from 'next/link';
import { ArrowUpRight, Calculator, BookOpen, Clock3 } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="public-band public-method" aria-labelledby="method-heading">
      <div className="public-container">
        <div className="public-section-heading"><div><p className="public-kicker">Method and limits</p><h2 id="method-heading">Calculation is not interpretation.</h2></div></div>
        <div className="grid md:grid-cols-2 gap-8 md:gap-14">
          <div><Calculator size={22} aria-hidden="true" /><h3 className="mt-4">The free chart is calculated.</h3><p className="public-body mt-2">Birth details are used to calculate sidereal positions with Lahiri ayanamsa. Your rising sign, Moon sign, nakshatra and dasha are chart facts within that system, not AI-written predictions.</p></div>
          <div><BookOpen size={22} aria-hidden="true" /><h3 className="mt-4">A reading adds an interpretation.</h3><p className="public-body mt-2">Vedic astrology is an interpretive tradition. Written readings, including generated commentary, can be mistaken. Use them for reflection, not as certainty or a substitute for professional advice.</p></div>
        </div>
        <div className="public-time-note"><Clock3 size={20} aria-hidden="true" className="shrink-0 mt-0.5" /><p>Birth time matters, especially for the rising sign. If yours is uncertain, say so in the calculator; an assumed time is not an exact birth chart.</p></div>
        <Link href="/methodology" className="public-text-link mt-5">Read the calculation method <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
