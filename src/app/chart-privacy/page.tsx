import type { Metadata } from 'next';
import Link from 'next/link';
import { NOTICE_HINDI, NOTICE_VERSION, PRIVACY_CONTACT } from '@/lib/leads/consentText';
import { DeviceDraftControls } from '@/components/help/DeviceDraftControls';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Chart privacy and device controls',
  description: 'Distinguish browser drafts, saved account reports, optional chart-link delivery and provider processing. Clear device drafts without deleting account records.',
  alternates: { canonical: '/chart-privacy' },
  robots: { index: false, follow: true },
};

const sections: { title: string; body: string[] }[] = [
  {
    title: 'What we keep when you save your chart',
    body: [
      'Your email address, and your first name if you gave one.',
      'Your birth date, birth time (or that you did not know it) and birth place, and the options you chose in the quiz. These are what your chart is calculated from, and what the link in your email uses to rebuild it.',
      'What you typed in the "in your own words" box stays in your browser. We do not store it with your saved chart. It is only sent with your order if you buy a reading, so it can go into the brief your reading is written from.',
      'Your approximate country (from your connection), the campaign tags on the link you arrived from, and a random session number. We use these to see which ads bring people to the quiz.',
    ],
  },
  {
    title: 'Why we keep it',
    body: [
      'To calculate and show your chart.',
      'To email you your chart link and keep your chart saved so you can open it again. This is the reason you gave us your address.',
      'Only if you tick the second box: to email you occasionally about your chart and new tools.',
      'To measure our ads. This uses page events and random numbers only, never your email or birth details.',
    ],
  },
  {
    title: 'Who handles it for us',
    body: [
      'Supabase keeps the saved chart and the record of what you agreed to. Resend delivers the email. Vercel runs the site. We do not sell your data and we do not share it for advertising.',
    ],
  },
  {
    title: 'Your choices',
    body: [
      'Every email has a link that stops further emails from us about your chart, in one tap. We record that and do not send to that address again.',
      'To request access, correction or deletion of what we hold, write to ' + PRIVACY_CONTACT + '. Clearing a browser draft does not withdraw a saved chart or remove account records.',
      'The first box on the save screen and the second box are separate. The first is only for the chart link. The second is optional and is never ticked for you. You can skip the whole screen and still see your chart.',
    ],
  },
  {
    title: 'Under 18',
    body: ['The optional quiz chart-save flow does not save or email a chart when the entered birth date is under 18. This does not mean calculation inputs are never processed or that browser drafts are automatically cleared.'],
  },
];

export default function ChartPrivacyPage() {
  return (
    <div className="min-h-screen bg-space text-star font-body">
      <header className="px-5 sm:px-8 py-5 border-b border-horizon">
        <Link href="/" className="font-display text-[1.5rem] text-amber no-underline">
          VedicHour
        </Link>
      </header>
      <main id="main-content" className="max-w-[720px] mx-auto px-5 sm:px-8 pt-10 pb-20">
        <h1 className="font-body font-semibold text-[2rem] leading-tight mb-3">Chart privacy and device controls</h1>
        <p className="mb-6 text-base leading-relaxed text-dust">A draft on this device, a report in your account, and data submitted to a service are different. Clearing one does not clear the others.</p>
        <section className="mb-8 border-t border-horizon pt-6">
          <h2 className="mb-3 text-xl font-semibold text-star">On this device</h2>
          <p className="mb-3 text-base leading-relaxed text-dust">Chart-form and quiz drafts can be stored in this browser to continue a task. Someone using the same browser profile may be able to access them. Private browsing, blocked storage or a different device may not restore your work.</p>
          <DeviceDraftControls />
        </section>
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-star">In your account</h2>
          <p className="text-base leading-relaxed text-dust">Saved reports and account preferences remain associated with their owning account. <Link href="/dashboard" className="text-amber underline underline-offset-4">Sign in to find existing reports</Link>. Changing default birth details does not edit an older report. The device clear control does not delete reports, payments or account preferences.</p>
        </section>
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-star">Sent for processing</h2>
          <p className="mb-3 text-base leading-relaxed text-dust">A free calculation sends birth inputs to this site and its calculation service. It is not a language-model reading. Hosting uses Vercel, and account storage and authentication use Supabase.</p>
          <p className="text-base leading-relaxed text-dust">Generated readings can send birth details, calculated chart information and supplied context to model providers such as Anthropic, OpenAI or Google. Optional chart-link delivery uses Resend and stores the chart-save record in Supabase. Clearing a device draft does not erase already submitted data or provider records. See the <Link href="/privacy" className="text-amber underline underline-offset-4">full privacy policy</Link> for the wider site.</p>
        </section>
        <h2 className="mb-3 text-xl font-semibold text-star">Optional quiz chart-link delivery</h2>
        <p className="font-body text-body-md text-dust mb-8">
          Consent notice version {NOTICE_VERSION}, 12 October 2026. The sections below cover the quiz and the optional &ldquo;Save your chart&rdquo; step, not every account or calculator workflow. Our{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            full privacy policy
          </Link>{' '}
          covers the rest of the site.
        </p>
        {sections.map((s) => (
          <section key={s.title} className="mb-8">
            <h2 className="font-display font-semibold text-[1.375rem] leading-tight text-amber-light mb-3">{s.title}</h2>
            <ul className="space-y-3">
              {s.body.map((b) => (
                <li key={b} className="font-body text-[1.0625rem] leading-[1.7] text-dust-light">
                  {b}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="mb-8">
          <h2 className="font-display font-semibold text-[1.375rem] leading-tight text-amber-light mb-3">Hindi</h2>
          <p lang="hi" className="font-body text-[1.0625rem] leading-[1.8] text-dust-light">
            {NOTICE_HINDI}
          </p>
        </section>
        <p className="mb-6 text-sm text-dust"><Link href="/help/edit-save-clear" className="text-amber underline underline-offset-4">Help with editing, saving and clearing</Link></p>
        <p className="font-body text-body-sm text-dust">
          Questions, withdrawal or deletion:{' '}
          <a href={`mailto:${PRIVACY_CONTACT}`} className="underline underline-offset-4">
            {PRIVACY_CONTACT}
          </a>
        </p>
      </main>
    </div>
  );
}
