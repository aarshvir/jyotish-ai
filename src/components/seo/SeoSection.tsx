import type { Faq } from '@/lib/seo/jsonLd';

/** Crawlable education prose block. h3/strong are styled via child selectors so callers
 *  can write plain semantic markup. */
export function SeoProse({
  heading,
  id,
  children,
}: {
  heading: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="max-w-3xl mx-auto mt-16 sm:mt-20 text-left">
      <h2 id={id} className="font-display text-3xl sm:text-4xl text-star mb-6 text-center">
        {heading}
      </h2>
      <div className="space-y-4 font-body text-body-md text-dust leading-relaxed [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-amber [&_h3]:mt-8 [&_h3]:mb-2 [&_strong]:text-star">
        {children}
      </div>
    </section>
  );
}

/** Accordion FAQ using native <details> — fully server-rendered, crawlable, no client JS.
 *  Pair with faqPageLd(faqs) for the matching FAQPage schema. */
export function FaqSection({
  faqs,
  heading = 'Frequently asked questions',
}: {
  faqs: Faq[];
  heading?: string;
}) {
  return (
    <section aria-labelledby="faq-heading" className="max-w-3xl mx-auto mt-16 sm:mt-20">
      <h2 id="faq-heading" className="font-display text-3xl sm:text-4xl text-star text-center mb-8">
        {heading}
      </h2>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-card border border-horizon/40 bg-cosmos px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-body-md text-star">
              <span>{f.q}</span>
              <span className="shrink-0 text-xl leading-none text-amber transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 font-body text-body-sm text-dust leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
