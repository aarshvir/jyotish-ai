import type { Metadata } from 'next';
import Link from 'next/link';
import { NOTICE_HINDI, NOTICE_VERSION, PRIVACY_CONTACT } from '@/lib/leads/consentText';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacy notice for your saved chart',
  description: 'What VedicHour keeps when you save your chart from the quiz, why, who handles it, and how to withdraw or delete it.',
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
      'To see, correct or delete what we hold, write to ' + PRIVACY_CONTACT + '. We reply within 30 days. You can also complain to the Data Protection Board of India.',
      'The first box on the save screen and the second box are separate. The first is only for the chart link. The second is optional and is never ticked for you. You can skip the whole screen and still see your chart.',
    ],
  },
  {
    title: 'Under 18',
    body: ['If the birth date entered is under 18 we do not ask for an email and we do not save anything. The chart is shown and nothing more is kept.'],
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
        <h1 className="font-display font-semibold text-[2rem] leading-[1.1] mb-2">Privacy notice for your saved chart</h1>
        <p className="font-body text-body-md text-dust mb-8">
          Version {NOTICE_VERSION}, 12 October 2026. This covers the quiz and the &ldquo;Save your chart&rdquo; step. Our{' '}
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
