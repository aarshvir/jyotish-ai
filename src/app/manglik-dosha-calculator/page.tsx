import type { Metadata } from 'next';
import { CalculatorPage } from '@/components/tools/CalculatorPage';
import { faqPageLd, breadcrumbLd, softwareAppLd, howToLd, type Faq } from '@/lib/seo/jsonLd';

export const metadata: Metadata = {
  title: 'Manglik Dosha Calculator — Free Mangal Dosh Check by Date of Birth',
  description:
    'Check if you are Manglik free in seconds. Enter your date, time and place of birth to see Mars’s placement, dosha strength and the classical cancellation rules — no signup.',
  alternates: { canonical: '/manglik-dosha-calculator' },
};

const SECTIONS: { h: string; p: string }[] = [
  { h: '', p: 'Manglik Dosha — also called Mangal Dosha or Kuja Dosha — is one of the most-checked factors in Vedic marriage matching. This free calculator uses your exact birth details and the Swiss Ephemeris to find where Mars sits in your chart and whether it forms the dosha, checked from your ascendant, Moon and Venus.' },
  { h: 'What makes someone Manglik', p: 'You are considered Manglik when Mars occupies the 1st, 2nd, 4th, 7th, 8th or 12th house — traditionally counted from the Lagna (ascendant), and also cross-checked from the Moon and Venus. These are the houses tied to self, family, home, marriage, longevity and intimacy, which is why Mars there is weighed in partnership.' },
  { h: 'How serious is it?', p: 'Severity depends on how many reference points trigger it and which house Mars sits in — the 7th and 8th are weighed most heavily. Mars in its own or exaltation signs (Aries, Scorpio, Capricorn) softens the effect. This calculator grades the result mild, moderate or strong rather than a flat yes or no.' },
  { h: 'Cancellations (Manglik dosha nivaran)', p: 'Classical texts describe many cancellations: when both partners are Manglik the dosha is considered to offset, and certain placements, aspects and the partner’s own Mars can neutralise it. The common belief that it simply “cancels at 28” is folk simplification, not a classical rule. Treat Manglik as a factor to understand, not a barrier.' },
  { h: 'Manglik and marriage', p: 'A Manglik match is best handled with awareness, not anxiety — many fulfilling marriages carry it. Use this result alongside a full Gun Milan (Kundli matching), which weighs eight factors, not Mars alone.' },
];

const FAQS: Faq[] = [
  { q: 'How do I know if I am Manglik?', a: 'Enter your date, time and place of birth above. The calculator finds Mars’s house from your ascendant, Moon and Venus and tells you instantly whether Manglik Dosha is present and how strong it is.' },
  { q: 'Which houses cause Manglik Dosha?', a: 'Mars in the 1st, 2nd, 4th, 7th, 8th or 12th house forms the dosha. The 7th and 8th are considered the strongest placements.' },
  { q: 'Can a Manglik marry a non-Manglik?', a: 'Yes. Classical astrology lists several cancellations, and many Manglik–non-Manglik couples marry happily. A full Kundli match and, where wanted, traditional remedies are the usual approach.' },
  { q: 'Does Manglik Dosha really cancel at age 28?', a: 'That is a popular belief rather than a strict classical rule. Mars’s intensity does tend to mature with age, but genuine cancellation comes from chart factors — placement, signs and the partner’s chart — not a birthday.' },
  { q: 'Anshik (partial) vs full Manglik — what is the difference?', a: 'Anshik Manglik is a partial or mild dosha, often when only one reference point triggers it or Mars sits in a comfortable sign. The result grades severity (mild / moderate / strong) so you can see which applies to you.' },
  { q: 'Is this calculator free?', a: 'Yes, completely free with no login. For a full plain-English birth-chart reading with Manglik shown in context, the deep Kundli report is a one-time $9.99 / ₹899.' },
];

export default function Page() {
  return (
    <CalculatorPage
      eyebrow="Free tool · Mangal Dosh"
      h1="Manglik Dosha Calculator —"
      h1Accent="Are You Manglik?"
      intro="Find out instantly whether your chart carries Manglik (Mangal) Dosha. Enter your birth details and we check Mars’s placement from your ascendant, Moon and Venus, grade the strength, and explain it in plain English — no fear, no signup."
      view="manglik"
      ctaHref="/kundali"
      ctaLabel="See Manglik in your full Kundli"
      proseHeading="Understanding Manglik (Mangal) Dosha"
      proseId="manglik-explained"
      sections={SECTIONS}
      faqs={FAQS}
      faqHeading="Manglik dosha — frequently asked"
      schema={[
        softwareAppLd({
          name: 'Manglik Dosha Calculator',
          path: '/manglik-dosha-calculator',
          description: 'Free Manglik (Mangal) Dosha calculator. Checks Mars placement from the ascendant, Moon and Venus and grades dosha strength by date of birth.',
          price: '0',
        }),
        faqPageLd(FAQS),
        howToLd({
          name: 'How to check Manglik Dosha',
          steps: [
            'Enter your date of birth.',
            'Enter your time and place of birth so we can locate your chart.',
            'See instantly whether Manglik Dosha is present, its strength, and what it means.',
          ],
        }),
        breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: 'Manglik Dosha Calculator', path: '/manglik-dosha-calculator' },
        ]),
      ]}
    />
  );
}
