/**
 * Plain-English glossary appended to the report. A quick reference so the seeker
 * can decode any Vedic term they meet in their reading. Static content — safe in
 * print (no pdf-exclude) and needs no client interactivity.
 */

const GLOSSARY: { term: string; def: string }[] = [
  { term: 'Lagna (Rising sign)', def: 'The zodiac sign rising on the eastern horizon at the moment you were born. It shapes your outward personality and how you meet the world — which is why an exact birth time matters.' },
  { term: 'Rashi (Moon sign)', def: 'The zodiac sign your Moon occupies. In Vedic astrology it governs your emotions, instincts and inner nature, and is often more telling than the Sun sign.' },
  { term: 'Nakshatra (Birth star)', def: 'One of 27 lunar mansions the Moon sits in at birth. It adds finer detail to your temperament and is used for timing and matchmaking.' },
  { term: 'Dasha (Life-period)', def: 'A planetary period that colours a whole chapter of your life. The Mahadasha is the main period (years long); the Antardasha is a sub-period within it.' },
  { term: 'Mahadasha (Main life-period)', def: 'The overarching planetary chapter you are currently living through.' },
  { term: 'Antardasha (Sub-period)', def: 'A shorter planetary phase nested inside the Mahadasha that fine-tunes its themes.' },
  { term: 'Hora (Planetary hour)', def: 'An roughly one-hour window ruled by a planet. Used to pick favourable timing — e.g. a Mars hora suits bold action, a Venus hora suits relationships.' },
  { term: 'Choghadiya (Time quality)', def: 'A system that splits the day into eight quality windows. Amrit is excellent and Rog/Kaal are best avoided for important starts.' },
  { term: 'Rahu Kaal', def: 'A roughly 90-minute window each day traditionally avoided for beginning anything important.' },
  { term: 'Graha (Planet)', def: 'A celestial body used in the chart. The nine grahas include the Sun, Moon, the five visible planets, and Rahu & Ketu.' },
  { term: 'Rahu & Ketu', def: 'The Moon’s two nodes — shadow points that show where you chase growth and desire (Rahu) and where you detach or carry past patterns (Ketu).' },
  { term: 'Transit (Gochar)', def: 'Where the planets are moving in the sky right now, measured against your birth chart — the engine behind day-to-day forecasts.' },
  { term: 'House (Bhava)', def: 'One of twelve life areas in the chart — career, money, relationships, health and so on. Your report translates houses into plain "life zones".' },
  { term: 'Panchang', def: 'The Vedic daily almanac: the day’s Moon phase (tithi), birth star (nakshatra), day-quality (yoga) and more.' },
  { term: 'Manglik (Mangal Dosha)', def: 'A chart pattern based on the placement of Mars, weighed in marriage compatibility.' },
  { term: 'Kaal Sarpa Dosha', def: 'A pattern in which all planets fall on one side, between Rahu and Ketu.' },
  { term: 'Sade Sati', def: 'A roughly seven-and-a-half-year period while Saturn transits around your Moon sign — a time of testing and maturing.' },
  { term: 'Gun Milan (Ashtakoot)', def: 'The 36-point compatibility score used in Vedic matchmaking to assess a couple’s harmony.' },
];

export function Glossary() {
  return (
    <section id="glossary" className="scroll-mt-24 card border border-horizon rounded-card p-6 sm:p-8">
      <p className="section-eyebrow mb-2">Glossary</p>
      <h2 className="font-display text-headline-md text-star mb-1">Every term, in plain English</h2>
      <p className="font-body text-body-sm text-dust mb-6">A quick reference for the Vedic words used in your reading.</p>
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {GLOSSARY.map(({ term, def }) => (
          <div key={term}>
            <dt className="font-display text-body-md text-amber mb-0.5">{term}</dt>
            <dd className="font-body text-body-sm text-dust leading-relaxed">{def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
