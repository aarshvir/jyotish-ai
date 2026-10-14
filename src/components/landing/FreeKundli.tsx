import Link from 'next/link';
import { ArrowUpRight, Compass, Moon, CalendarDays, CircleDot } from 'lucide-react';

const tools = [
  { href: '/free-kundli', title: 'Birth chart facts', description: 'Start with your rising sign, Moon sign, birth star and dasha.', icon: Compass },
  { href: '/moon-sign-calculator', title: 'Moon sign', description: 'Find the sidereal sign of the Moon at your birth.', icon: Moon },
  { href: '/nakshatra-finder', title: 'Birth star', description: 'Find your nakshatra and its quarter, called a pada.', icon: CircleDot },
  { href: '/vimshottari-dasha-calculator', title: 'Dasha periods', description: 'See the planetary periods calculated from your birth star.', icon: CalendarDays },
];

export default function FreeKundli() {
  return (
    <section id="free-kundli" className="public-band" aria-labelledby="tools-heading">
      <div className="public-container">
        <div className="public-section-heading">
          <div><p className="public-kicker">Free calculators</p><h2 id="tools-heading">Start with a question.</h2></div>
          <p className="public-body max-w-sm">Use your birth date, time and selected city. No account is needed for these chart facts.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="public-tool">
              <div className="flex items-center justify-between mb-5"><Icon size={22} aria-hidden="true" /><ArrowUpRight size={18} aria-hidden="true" /></div>
              <h3>{title}</h3><p className="public-body mt-2">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
