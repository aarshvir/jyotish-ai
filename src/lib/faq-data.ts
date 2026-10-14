// Shared by the visible FAQ and its server-rendered structured data.
export interface QA { q: string; a: string; }

export const FAQS: QA[] = [
  {
    q: 'Can I get a free Kundli here?',
    a: 'Yes. The free calculators show chart facts: your rising sign, Moon sign, birth star and dasha periods. No sign-up or payment card is needed. Personalized hourly forecasts and written readings are not part of the free chart.',
  },
  {
    q: 'What birth details do I need?',
    a: 'Your birth date, birth time and birth city. Select the matching city from the suggestions so its location is confirmed. The time should be the local clock time at your birthplace, not converted to your current timezone.',
  },
  {
    q: 'What if I do not know my birth time?',
    a: 'Choose the uncertain-time option in the calculator. An unknown or approximate time cannot support a reliable rising sign or house-based chart. Moon sign, birth star and dasha may also change near a boundary. The calculator should make those limits explicit rather than present a guessed time as exact.',
  },
  {
    q: 'Does AI calculate my chart?',
    a: 'No. The free chart facts are calculated from birth details using the astrology engine. Written readings are a separate interpretation and may use AI-generated commentary. That commentary can be mistaken and is not a guarantee of future events.',
  },
  {
    q: 'Can I buy a written reading or hourly forecast?',
    a: 'Paid readings are separate from the free calculators. The pricing page shows current availability; a price or purchase action is shown only when new checkout is available. You can still open existing reports from your dashboard.',
  },
  {
    q: 'Is the sample a real customer reading?',
    a: 'No. It uses an invented birth and scenario. The chart positions and timing values are calculated by the existing engine, and the commentary is illustrative. It is not a testimonial or evidence that astrology predicts outcomes.',
  },
  {
    q: 'How should I use these results?',
    a: 'Use the chart to explore Vedic astrology as an interpretive tradition. It is not medical, legal or financial advice. Keep your own judgment and real-world information central, especially for consequential decisions.',
  },
];
