/**
 * HindiWaitlist — landing section announcing forthcoming Hindi support.
 *
 * Captures intent through the shared NewsletterSignup form (tagged
 * source="hindi-waitlist") so signups land in the same store as the footer
 * and blog captures, attributable per source in admin.
 *
 * Constraints honoured (from launch plan):
 * - English-first launch; no `next-intl` routing.
 * - No fake counters, no fake popularity claims.
 * - Single capture form, no popups.
 */

import { NewsletterSignup } from '@/components/newsletter/NewsletterSignup';

export default function HindiWaitlist() {
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
          Leave your email and we&apos;ll notify you the day it launches.
        </p>
        <div className="flex justify-center">
          <NewsletterSignup source="hindi-waitlist" />
        </div>
        <p className="mt-4 font-mono text-mono-sm text-dust">
          We won&apos;t spam — one email when Hindi reports ship.
        </p>
      </div>
    </section>
  );
}
