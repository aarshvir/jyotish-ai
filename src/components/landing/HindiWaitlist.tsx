/**
 * HindiWaitlist — static landing section announcing forthcoming Hindi support.
 *
 * Intentionally static and backend-free. Captures intent through a mailto link
 * with a pre-populated subject so support can add the user manually until a
 * proper waitlist table + Resend/Brevo integration ships post-launch.
 *
 * Constraints honoured (from launch plan):
 * - English-first launch; no `next-intl` routing.
 * - No fake counters, no fake popularity claims.
 * - Single CTA, no popups, no form state, no JS dependency.
 */

import Link from 'next/link';

export default function HindiWaitlist() {
  const subject = encodeURIComponent('Hindi report waitlist — please add me');
  const body = encodeURIComponent(
    [
      'Hello VedicHour team,',
      '',
      'Please add me to the Hindi report waitlist. You can email me when हिंदी रिपोर्ट are ready.',
      '',
      'Name (optional):',
      '',
      'Thanks.',
    ].join('\n')
  );
  const mailto = `mailto:support@vedichour.com?subject=${subject}&body=${body}`;

  return (
    <section
      aria-labelledby="hindi-waitlist-heading"
      className="px-5 sm:px-8 py-14 sm:py-18 border-t border-horizon/30"
    >
      <div className="max-w-3xl mx-auto text-center">
        <p className="section-eyebrow mb-3">हिंदी · Hindi reports</p>
        <h2
          id="hindi-waitlist-heading"
          className="font-body font-semibold text-headline-lg sm:text-headline-xl mb-4 text-star"
        >
          Hindi reports are coming
        </h2>
        <p className="font-body text-body-lg text-dust max-w-xl mx-auto leading-relaxed mb-6">
          For now, every VedicHour report is generated in English. A reviewer-vetted Hindi
          edition — Sanskrit terms preserved, classical citations intact — is on the way.
          Email us and we&apos;ll notify you the day it launches.
        </p>
        <Link
          href={mailto}
          className="inline-flex items-center justify-center gap-2 px-7 py-3 min-h-[44px] bg-amber text-space rounded-md text-sm font-semibold font-mono no-underline hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
          aria-label="Email VedicHour support to join the Hindi waitlist"
        >
          Notify me at launch
          <span aria-hidden="true">→</span>
        </Link>
        <p className="mt-4 font-mono text-mono-sm text-dust/50">
          We won&apos;t spam — one email when Hindi reports ship.
        </p>
      </div>
    </section>
  );
}
