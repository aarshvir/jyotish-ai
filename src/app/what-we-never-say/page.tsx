import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'What we never say',
  description: 'The things VedicHour will not tell you, in a reading or an email, however you ask.',
  alternates: { canonical: '/what-we-never-say' },
};

const never: { what: string; why: string }[] = [
  { what: 'When someone will die, or how long anyone will live.', why: 'Nobody can know this from a chart, and a number like that frightens people and decides nothing.' },
  { what: 'Whether you have, or will get, an illness. We give no diagnosis and no medical advice.', why: 'Health belongs with a doctor. A chart can describe energy and routine as themes, never a condition.' },
  { what: 'That you or your family are cursed, or that someone has done black magic on you.', why: 'We do not use fear to explain a hard stretch, and we do not sell a ritual to remove one.' },
  { what: 'That you will divorce, or that a marriage will fail.', why: 'We can describe how a chart reads partnership and when timing looks easier or harder. We do not announce an ending.' },
  { what: 'How many children you will have, whether a pregnancy will go well, or a child’s sex.', why: 'We do not predict these. In India, telling the sex of a child before birth is also against the law.' },
  { what: 'That you will lose money, a job or a person, or that you are in danger.', why: 'We talk about tendencies and timing windows, not losses that are going to happen.' },
  { what: 'What another person feels, or what they will do next.', why: 'A chart is yours. We read it for you, not for someone who never asked.' },
  { what: 'A guarantee of any outcome.', why: 'We read timing, not fate. Nothing on this site is a promise about what will happen.' },
];

export default function NeverSayPage() {
  return (
    <div className="min-h-screen bg-space text-star font-body">
      <header className="px-5 sm:px-8 py-5 border-b border-horizon">
        <Link href="/" className="font-display text-[1.5rem] text-amber no-underline">
          VedicHour
        </Link>
      </header>
      <main id="main-content" className="max-w-[720px] mx-auto px-5 sm:px-8 pt-10 pb-20">
        <h1 className="font-display font-semibold text-[2rem] leading-[1.1] mb-3">What we never say</h1>
        <p className="font-body text-[1.0625rem] leading-[1.7] text-dust-light mb-8">
          Many astrology services lean on fear. We would rather you could check what we do, so this is the list of what we will not tell you, in a reading or in an email, however you ask.
        </p>
        <ul className="space-y-6">
          {never.map((n) => (
            <li key={n.what} className="border-l-2 border-amber/60 pl-4">
              <p className="font-body text-[1.0625rem] font-semibold leading-[1.5] text-star">{n.what}</p>
              <p className="mt-1.5 font-body text-body-md leading-[1.65] text-dust-light">{n.why}</p>
            </li>
          ))}
        </ul>

        <h2 className="font-display font-semibold text-[1.5rem] leading-tight text-amber-light mt-10 mb-3">What we do instead</h2>
        <p className="font-body text-[1.0625rem] leading-[1.7] text-dust-light">
          We calculate your chart from your birth date, time and place, then describe themes, tendencies and timing windows that come from what was calculated. If the words you type in the quiz are about health, death or what another person feels, the next screen says plainly that we do not read those.
        </p>

        <h2 className="font-display font-semibold text-[1.5rem] leading-tight text-amber-light mt-10 mb-3">How this is kept</h2>
        <p className="font-body text-[1.0625rem] leading-[1.7] text-dust-light">
          The text of the free reading on the quiz is checked against this list by automated tests every time we change it, and the build fails if a banned term appears outside a refusal. If you ever see a line that breaks this page, write to{' '}
          <a href="mailto:support@vedichour.com" className="underline underline-offset-4">
            support@vedichour.com
          </a>{' '}
          and we will fix it.
        </p>

        <p className="mt-10 font-body text-body-sm text-dust">
          Related: <Link href="/refund" className="underline underline-offset-4">refund policy</Link> ·{' '}
          <Link href="/chart-privacy" className="underline underline-offset-4">privacy notice for your saved chart</Link>
        </p>
      </main>
    </div>
  );
}
