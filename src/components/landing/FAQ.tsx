import Link from 'next/link';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { FAQS } from '@/lib/faq-data';

export default function FAQ() {
  return (
    <section id="faq" className="public-band" aria-labelledby="faq-heading">
      <div className="public-container public-faq-layout">
        <div><p className="public-kicker">Before you begin</p><h2 id="faq-heading">A few useful answers.</h2><Link href="/help" className="public-text-link mt-5">Visit help <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div>
          {FAQS.map(({ q, a }) => (
            <details key={q} className="public-faq">
              <summary><span>{q}</span><ChevronDown size={19} aria-hidden="true" className="shrink-0" /></summary>
              <p className="public-body">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
