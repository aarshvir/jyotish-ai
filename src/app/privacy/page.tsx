import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { AnalyticsPreferences } from '@/components/analytics/AnalyticsPreferences';

export const dynamic = 'force-static';

const description = 'How VedicHour processes calculator inputs, device drafts, account records and optional analytics. Change your analytics choice and find data controls.';
export const metadata: Metadata = {
  title: 'Privacy and Data Choices',
  description,
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy and Data Choices | VedicHour', description, url: '/privacy', type: 'website' },
  twitter: { card: 'summary', title: 'Privacy and Data Choices | VedicHour', description },
};

const sections = [
  {
    title: 'Free calculations and city search',
    paragraphs: [
      'The free calculators do not require an email address, an account or a language-model reading. Birth date, time, selected city and coordinates are sent to this site and its calculation service to return chart facts.',
      'City searches send the city text to OpenStreetMap Nominatim to find matching places and coordinates. The site can cache those city candidates for seven days. Hosting and request handling can process connection information such as an IP address for delivery, security and rate limiting.',
    ],
  },
  {
    title: 'Optional drafts on this device',
    paragraphs: [
      'The calculator saves a draft and result in this browser only when you choose its remember option. The saved calculator entry has a seven-day lifetime from its last save. Expired entries are discarded when the calculator reads them; this is not a background deletion timer.',
      'Quiz and onboarding workflows can also use browser or tab storage to continue a task. People using the same browser profile may be able to access device drafts. Clearing a draft does not delete a submitted chart, an account record, provider data or a report.',
    ],
  },
  {
    title: 'Accounts and saved reports',
    paragraphs: [
      'Creating or using an account processes your sign-in information and associates saved reports, chart records, preferences and payment status with the account that owns them. Account functions use Supabase for authentication and storage.',
      'The account page has export and deletion controls. Device controls are separate from those actions. For access, correction, deletion or portability requests that those controls do not cover, contact privacy@vedichour.com.',
    ],
  },
  {
    title: 'Quiz chart-link delivery and email choices',
    paragraphs: [
      'The quiz can offer an optional save-and-email step. Chart-link delivery and marketing email permission are separate choices; neither is your analytics choice. Optional delivery uses Supabase chart-save records and Resend email delivery.',
      'Account sign-in, report delivery and requested support are different from marketing emails. If you opt in, we also email you occasionally about your chart and new tools. We use Resend to send this mail. Optional marketing messages include a link to unsubscribe in one tap. You can ask privacy@vedichour.com about a previously submitted chart or address.',
    ],
  },
  {
    title: 'Generated readings and AI providers',
    paragraphs: [
      'A generated reading can send birth details, calculated chart information and the personal context you supply to a language-model provider. Do not include information in a reading request that you do not want processed for that task.',
      'The standard commentary fallback order in the current code is OpenAI, Anthropic, xAI (Grok), then DeepSeek. Some stages can select an Anthropic model before that standard chain, and unavailable providers are skipped. Google embeddings are used for retrieval when that feature is configured. Provider processing is subject to the services and settings used for the request.',
      'Free chart facts are calculated separately from language-model commentary. Disabling optional analytics does not prevent processing needed for a calculation or a reading you request.',
    ],
  },
  {
    title: 'Service providers and payments',
    paragraphs: [
      'The service uses Vercel hosting, Supabase account/database services, and configured Upstash caching/rate limiting and Inngest background jobs. Calculation requests use the calculation service. These service functions are separate from optional usage analytics.',
      'When checkout is available and you choose to pay, Ziina handles the payment process. This site records payment status and report entitlements. Disabling analytics does not sign you out, delete a report or remove payment ownership records.',
    ],
  },
  {
    title: 'Cookies and optional usage analytics',
    paragraphs: [
      'Authentication and selected site preferences are separate from optional tracking. The control above remembers your analytics choice on this browser. Optional usage analytics is off until you explicitly enable it, and browser privacy signals keep it off.',
      'When enabled, first-party events can describe a coarse page or fixed product action, and those first-party records may be associated with your account when signed in. PostHog can receive limited public-page events. Raw query strings, private route identifiers, birth details and free-text answers are not included in these client analytics events. Session replay, automatic click/form capture and analytics account identification are disabled.',
      'Source/referral cookies are only written after usage consent and have a 30-day lifetime. Source values are limited categories rather than raw campaign text. Google Analytics and Meta advertising pixels remain disabled in this release.',
    ],
  },
  {
    title: 'Keeping and removing information',
    paragraphs: [
      'The calculator device lifetime is described above. This notice does not specify a fixed automatic deletion period for account records, reports, payments, support records or provider copies. Those are distinct systems, and clearing browser storage does not erase data already submitted to them.',
      'Use account export/deletion controls or contact privacy@vedichour.com for help with records already held. Turning off optional analytics stops new optional client capture and attempts to remove known site tracking identifiers where the browser permits; it does not withdraw events already sent.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="public-experience">
      <Navbar />
      <main id="main-content" className="public-container !max-w-3xl py-10 sm:py-14">
        <p className="public-kicker">Your data and choices</p>
        <h1 className="text-3xl font-semibold leading-tight">Privacy at VedicHour</h1>
        <p className="public-meta mt-3">Updated 15 October 2026</p>
        <p className="public-body mt-5">A calculation, a draft on your device, a saved report and an analytics event are different. The controls below help you manage those choices without giving up the free calculator.</p>
        <AnalyticsPreferences />
        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8">
          <Link href="/chart-privacy" className="public-text-link">Device draft controls <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/account" className="public-text-link">Account export and deletion <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        {sections.map(({ title, paragraphs }) => (
          <section key={title} className="border-t border-[var(--public-line)] py-6">
            <h2 className="!text-xl">{title}</h2>
            {paragraphs.map(paragraph => <p key={paragraph} className="public-body mt-3">{paragraph}</p>)}
          </section>
        ))}
        <section className="border-t border-[var(--public-line)] pt-6">
          <h2 className="!text-xl">Requests, correction and withdrawal</h2>
          <p className="public-body mt-3">For access, correction, deletion, portability or withdrawal requests concerning submitted data, contact <a href="mailto:privacy@vedichour.com" className="public-text-link">privacy@vedichour.com</a>. Include enough information to locate the record, but do not send passwords or payment-card details. Identity checks may be needed before account records are disclosed or changed.</p>
          <p className="public-body mt-3">These browser analytics settings are not an account-deletion action or an email unsubscribe. For help finding the appropriate control, visit <Link href="/help" className="public-text-link">Help</Link>.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
