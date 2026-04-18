// Shared FAQ data — imported by both the FAQ client component (for UI)
// and the marketing page server component (for JSON-LD structured data).

export interface QA {
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
    a: "A Vedic astrology forecast (Jyotish forecast) is personalised to your exact birth chart — not a generic Sun sign. It uses sidereal positions (not tropical), your natal Lagna and Moon sign, and predictive systems like Vimshottari Dasha. VedicHour goes further: it gives you 18 hourly windows per day with individual scores and written commentary, far beyond any daily horoscope column.",
  },
  {
    q: 'How is VedicHour different from other free Kundli or astrology apps?',
    a: "Most free Kundli apps show your chart but give generic interpretations. VedicHour gives you 18 hourly windows per day (06:00–24:00 in your city's local time), each rated 0–100 and explained in detail. The calculations use Swiss Ephemeris with Lahiri Ayanamsa — the same engine professional Jyotish astrologers use — not simplified or pre-computed tables.",
  },
  {
    q: 'How fast is report delivery?',
    a: "Reports typically generate in 3–8 minutes. You can safely close the tab — the pipeline runs on our servers and you'll find the report in your dashboard when you return.",
  },
  {
    q: 'What birth data do I need to provide?',
    a: 'Your birth date, exact birth time (important — rounded times reduce accuracy), and birth city. Your current city is used for the local-time hourly schedule. We never share or sell this information.',
  },
  {
    q: "What happens if I'm not satisfied?",
    a: "We offer a 24-hour no-questions-asked refund. Email support@vedichour.com and we'll process it. See our refund policy for details.",
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
