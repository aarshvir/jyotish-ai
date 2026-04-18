'use client';

import { useState } from 'react';

interface QA {
  q: string;
  a: string;
}

export const FAQS: QA[] = [
  {
    q: 'What is Jyotish astrology?',
    a: 'Jyotish (Sanskrit: "science of light") is the classical Indian system of Vedic astrology. It uses sidereal planetary positions, the Lahiri Ayanamsa, and time-based systems like Vimshottari Dasha and hora rulers to interpret life events and optimal timing. VedicHour applies classical Jyotish rules computed via the Swiss Ephemeris to produce AI-written Jyotish forecasts for any date range.',
  },
  {
    q: 'What is a Kundli (Janam Kundali)?',
    a: 'A Kundli — also called Janam Kundali, Janam Patri, or birth chart — is a map of planetary positions at the exact moment of your birth. It shows your Lagna (rising sign), Moon sign, Sun sign, and the placement of all 9 Jyotish grahas across the 12 houses. VedicHour generates your free Kundli online from your birth date, time, and place using the Swiss Ephemeris engine.',
  },
  {
    q: 'Can I get a free Kundli here?',
    a: 'Yes — our Free Kundli plan is completely free, no credit card needed. Enter your birth date, time, and city and we will generate your Janam Kundali with your Lagna, Moon sign, current Dasha period, and a sample Jyotish hora schedule. Upgrade to a paid plan for full hourly forecasts across 7, 30, or 365 days.',
  },
  {
    q: 'What is AI Jyotish / AI Kundli?',
    a: 'AI Jyotish (or AI Kundli) refers to using artificial intelligence to interpret a classically computed Jyotish chart. VedicHour first calculates your planetary positions and timings using the Swiss Ephemeris — no guesswork. It then passes that mathematical data to AI (Anthropic Claude) to generate written commentary, narrative forecasts, and actionable guidance in plain language.',
  },
  {
    q: 'How is a Vedic forecast different from a Sun-sign horoscope?',
    a: 'A Vedic astrology forecast (Jyotish forecast) is personalised to your exact birth chart — not a generic Sun sign. It uses sidereal positions (not tropical), your natal Lagna and Moon sign, and predictive systems like Vimshottari Dasha. VedicHour goes further: it gives you 18 hourly windows per day with individual scores and written commentary, far beyond any daily horoscope column.',
  },
  {
    q: 'How is VedicHour different from other free Kundli or astrology apps?',
    a: 'Most free Kundli apps show your chart but give generic interpretations. VedicHour gives you 18 hourly windows per day (06:00–24:00 in your city\'s local time), each rated 0–100 and explained in detail. The calculations use Swiss Ephemeris with Lahiri Ayanamsa — the same engine professional Jyotish astrologers use — not simplified or pre-computed tables.',
  },
  {
    q: 'How fast is report delivery?',
    a: 'Reports typically generate in 3–8 minutes. You can safely close the tab — the pipeline runs on our servers and you\'ll find the report in your dashboard when you return.',
  },
  {
    q: 'What birth data do I need to provide?',
    a: 'Your birth date, exact birth time (important — rounded times reduce accuracy), and birth city. Your current city is used for the local-time hourly schedule. We never share or sell this information.',
  },
  {
    q: 'What happens if I\'m not satisfied?',
    a: 'We offer a 24-hour no-questions-asked refund. Email support@vedichour.com and we\'ll process it. See our refund policy for details.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. All data is TLS-encrypted in transit and at rest. We never sell personal data. Payments are handled by PCI-DSS compliant partners — we never see your card details.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'International cards (Visa, Mastercard, Amex) via Ziina. Prices auto-adjust to INR, AED, or USD based on your location.',
  },
  {
    q: 'Can I gift a Jyotish report to someone else?',
    a: 'Yes — enter their birth details during onboarding. The report is bound to your account, and you can download and share the PDF or Markdown with them.',
  },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-28 bg-space relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-3xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Questions</p>
          <h2 className="section-title text-display-md">Jyotish &amp; Kundli — Frequently Asked</h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Everything you might want to know about Jyotish, Kundli, and your AI Vedic forecast.
          </p>
        </div>

        <div className="space-y-3 mt-10">
          {FAQS.map((qa, i) => {
            const open = openIdx === i;
            return (
              <div
                key={qa.q}
                className={`card overflow-hidden transition-colors ${open ? 'border-amber/30' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 rounded-card"
                >
                  <span className="font-body font-medium text-star text-body-md">
                    {qa.q}
                  </span>
                  <span className="text-amber/70 shrink-0">
                    <ChevronIcon open={open} />
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  className={`grid transition-all duration-250 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 sm:px-6 pb-5 text-dust text-body-sm leading-relaxed">
                      {qa.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center mt-10 text-dust/60 text-body-sm">
          Something not answered? Email{' '}
          <a
            href="mailto:support@vedichour.com"
            className="text-amber hover:underline"
          >
            support@vedichour.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}
