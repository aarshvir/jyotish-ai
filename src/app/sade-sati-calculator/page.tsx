import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Sade Sati Calculator — Free Shani Sade Sati Check by Date of Birth',
  description:
    'Check your Shani Sade Sati in seconds. Enter your date, time and place of birth to see whether Saturn is transiting near your natal Moon, which of the three phases you are in, and what it really means — no signup.',
  alternates: { canonical: '/sade-sati-calculator' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Sade Sati is the roughly seven-and-a-half-year period when Saturn (Shani) transits the 12th, 1st and 2nd signs counted from your natal Moon. This free calculator uses your exact birth details and the live position of Saturn from the Swiss Ephemeris to tell you whether Sade Sati is running for you right now and which phase you are in.' },
  { h: 'What Sade Sati actually is', p: 'Saturn takes about 30 years to circle the zodiac, spending close to two and a half years in each sign. When it enters the sign just before your Moon sign, sits on your Moon sign, and then moves to the sign just after, it stays within that three-sign window for about seven and a half years in total. That whole stretch is called Sade Sati, literally “seven and a half”.' },
  { h: 'The three phases', p: 'Sade Sati unfolds in three phases of roughly two and a half years each. The rising phase (Saturn in the 12th from the Moon) often touches finances, sleep and behind-the-scenes worry. The peak phase (Saturn over the natal Moon) is felt most directly — it tests the mind, mood and major life structures and is generally considered the hardest. The setting phase (Saturn in the 2nd from the Moon) eases the pressure while reorganising family, money and speech.' },
  { h: 'A teacher, not a punishment', p: 'In classical Vedic thought Saturn is the great taskmaster, not a villain. Sade Sati is best read as a period of slowing down, taking responsibility and building patience — the rewards it offers are usually earned discipline, maturity and durable results rather than quick luck. Many people look back on a Sade Sati as the season that grounded them.' },
  { h: 'Dhaiya, remedies and using this tool', p: 'Separate from Sade Sati is the smaller dhaiya (or small panoti) — about two and a half years when Saturn transits the 4th or 8th from the Moon. Measured remedies focus on the practical: protect your health and sleep, stay patient with timelines, simplify commitments, and, if it suits you, keep a gentle Saturday or Hanuman practice. This calculator reads the current Saturn transit against your Moon and shows whether Sade Sati is active and which phase you are presently in.' },
];

const FAQS: Faq[] = [
  { q: 'What is Sade Sati?', a: 'Sade Sati is the period when Saturn transits the three signs around your natal Moon — the 12th, 1st and 2nd from the Moon sign. It lasts about seven and a half years and is one of the most-discussed transits in Vedic astrology.' },
  { q: 'How long does Sade Sati last?', a: 'About seven and a half years in total — roughly two and a half years for each of its three phases, because Saturn spends close to two and a half years in every sign it passes through.' },
  { q: 'Which phase of Sade Sati is the worst?', a: 'The middle, or peak, phase — when Saturn sits directly over your natal Moon — is usually felt most strongly because it affects the mind and emotions and tends to coincide with the biggest tests. The rising and setting phases are typically milder.' },
  { q: 'What is the difference between dhaiya and Sade Sati?', a: 'Sade Sati is the seven-and-a-half-year transit across the 12th, 1st and 2nd from the Moon. Dhaiya — also called the small panoti — is a shorter, roughly two-and-a-half-year transit of Saturn through the 4th or 8th from the Moon. They are different periods, though both involve Saturn pressing on the Moon.' },
  { q: 'What remedies help during Sade Sati?', a: 'The most reliable remedies are practical: guard your health and rest, be patient with delays, avoid overcommitting, and stay honest and steady in your work. Many people also keep a simple Saturday discipline or a gentle Hanuman or Shani practice. Treat these as support for the right mindset, not a magic switch.' },
  { q: 'Is Sade Sati always bad?', a: 'No. It is a demanding, slowing period rather than a guaranteed misfortune, and its effect depends on where Saturn sits in your chart and how strong it is. For many people Sade Sati brings hard-won growth, maturity and lasting results, especially when met with patience.' },
  { q: 'Is this calculator free?', a: 'Yes, completely free with no login. For a full plain-English birth-chart reading that shows Sade Sati in the context of your whole chart, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Shani Sade Sati"
      h1="Sade Sati Calculator —"
      h1Accent="Your Shani Status"
      intro="Find out instantly whether Shani Sade Sati is running in your chart. Enter your birth details and we check the live position of Saturn against your natal Moon, tell you which of the three phases you are in, and explain it in plain English — no fear, no signup."
      view="sadesati"
      ctaHref="/kundali"
      ctaLabel="See Sade Sati in your full Kundli"
      proseHeading="Understanding Shani Sade Sati"
      proseId="sade-sati-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Sade Sati — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Sade Sati Calculator',
          path: '/sade-sati-calculator',
          description: 'Free Shani Sade Sati calculator. Checks the live Saturn transit against your natal Moon and shows whether Sade Sati is active and which of its three phases you are in, by date of birth.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to check Sade Sati',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can find your natal Moon sign.',
            'See instantly whether Sade Sati is running, which phase you are in, and what it means.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Sade Sati Calculator', path: '/sade-sati-calculator' },
        ]),
      ]}
    />
  );
}
