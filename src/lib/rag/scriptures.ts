/**
 * Jyotish RAG — Classical Scripture Corpus
 * 
 * Curated excerpts from Brihat Parashara Hora Shastra (BPHS),
 * Phaladeepika, and Jaimini Sutras for retrieval-augmented generation.
 * 
 * Each entry has a topic key, source reference, and the actual text.
 * The NativityAgent queries this corpus when it detects specific yogas,
 * planetary combinations, or house lord placements.
 */

export interface ScriptureEntry {
  id: string;
  topic: string;
  source: string;
  chapter?: string;
  text: string;
  keywords: string[];
}

/**
 * Classical Jyotish scripture excerpts.
 * In a future iteration, these will be vectorized into Supabase pgvector
 * for true semantic search. For now, keyword matching provides immediate value.
 */
export const SCRIPTURE_CORPUS: ScriptureEntry[] = [
  // ── Yogas ──────────────────────────────────────────────────────────────
  {
    id: 'bphs-gajakesari',
    topic: 'Gajakesari Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 36',
    text: 'If Jupiter is in a Kendra from the Moon, Gajakesari Yoga is formed. The native will be splendorous, wealthy, intelligent, endowed with many laudable virtues, and will please the king. This yoga bestows lasting fame that endures beyond one\'s lifetime. The strength of this yoga depends on the dignity of both Jupiter and the Moon — exalted or own-sign placements amplify results enormously, while debilitation or combustion weakens them.',
    keywords: ['gajakesari', 'jupiter', 'moon', 'kendra', 'fame', 'wealth', 'intelligence'],
  },
  {
    id: 'bphs-budhaditya',
    topic: 'Budhaditya Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 36',
    text: 'When Mercury conjoins the Sun in a Kendra or Trikona and is not combust (beyond 14° from the Sun), Budhaditya Yoga arises. The native becomes highly intelligent, skillful in arts and sciences, a good speaker, and earns respect in scholarly circles. This yoga particularly enhances analytical abilities, communication skills, and commercial acumen.',
    keywords: ['budhaditya', 'mercury', 'sun', 'conjunction', 'intelligence', 'speech', 'commerce'],
  },
  {
    id: 'bphs-raja-yoga',
    topic: 'Raja Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 41',
    text: 'Raja Yoga is formed when the lords of Kendras (1,4,7,10) and Trikonas (1,5,9) are in mutual association by conjunction, aspect, or exchange. The native rises to positions of authority and power. The strongest Raja Yoga occurs when a single planet rules both a Kendra and a Trikona (Yogakaraka). For Taurus and Libra Lagnas, Saturn is Yogakaraka ruling the 9th and 10th, and 4th and 5th respectively. For Cancer and Leo Lagnas, Mars is Yogakaraka.',
    keywords: ['raja yoga', 'kendra', 'trikona', 'yogakaraka', 'authority', 'power', 'saturn', 'mars'],
  },
  {
    id: 'bphs-viparita-raja',
    topic: 'Viparita Raja Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 42',
    text: 'When lords of Dusthana houses (6th, 8th, 12th) are placed in other Dusthanas, or conjoin each other without associating with other house lords, Viparita Raja Yoga is formed. Harsha Yoga (6th lord in 8th or 12th), Sarala Yoga (8th lord in 6th or 12th), and Vimala Yoga (12th lord in 6th or 8th) bring sudden gains through adversity, unexpected inheritances, and triumph over enemies.',
    keywords: ['viparita', 'dusthana', 'harsha', 'sarala', 'vimala', '6th', '8th', '12th'],
  },
  {
    id: 'bphs-hamsa',
    topic: 'Hamsa Mahapurusha Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 75',
    text: 'When Jupiter occupies a Kendra (1st, 4th, 7th, or 10th house) in its own sign (Sagittarius, Pisces) or exaltation sign (Cancer), Hamsa Yoga is formed — one of the five Mahapurusha Yogas. The native is righteous, learned, handsome in appearance, favored by rulers, and lives a long, prosperous life. They are naturally inclined toward dharma, philosophy, and spiritual wisdom.',
    keywords: ['hamsa', 'mahapurusha', 'jupiter', 'kendra', 'sagittarius', 'pisces', 'cancer', 'dharma'],
  },
  {
    id: 'bphs-malavya',
    topic: 'Malavya Mahapurusha Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 75',
    text: 'When Venus occupies a Kendra in its own sign (Taurus, Libra) or exaltation sign (Pisces), Malavya Yoga is formed. The native possesses a strong physique, is wealthy, blessed with vehicles and comforts, learned, a connoisseur of arts, and enjoys a refined life. They are magnetic in personality and attract devoted relationships.',
    keywords: ['malavya', 'mahapurusha', 'venus', 'taurus', 'libra', 'pisces', 'luxury', 'arts'],
  },
  {
    id: 'bphs-ruchaka',
    topic: 'Ruchaka Mahapurusha Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 75',
    text: 'When Mars occupies a Kendra in its own sign (Aries, Scorpio) or exaltation sign (Capricorn), Ruchaka Yoga is formed. The native is brave, valorous, victorious over enemies, and will be a leader or commander. They possess a strong constitution, sharp features, and a commanding presence that naturally draws followers.',
    keywords: ['ruchaka', 'mahapurusha', 'mars', 'aries', 'scorpio', 'capricorn', 'valor', 'leadership'],
  },
  {
    id: 'bphs-dhana',
    topic: 'Dhana Yoga',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 41',
    text: 'Dhana Yoga (wealth yoga) forms when the lords of the 2nd and 11th houses associate with the lords of the 5th, 9th, or ascendant by conjunction, aspect, or exchange. The 2nd house governs accumulated wealth and family resources; the 11th governs gains, income, and fulfillment of desires. When both are strong and well-connected to trikona lords, substantial wealth accumulates throughout life.',
    keywords: ['dhana', 'wealth', '2nd house', '11th house', '5th', '9th', 'income', 'gains'],
  },

  // ── Planetary Dignities ────────────────────────────────────────────────
  {
    id: 'bphs-exaltation',
    topic: 'Planetary Exaltation',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 3',
    text: 'The exaltation signs of the planets are: Sun in Aries (10°), Moon in Taurus (3°), Mars in Capricorn (28°), Mercury in Virgo (15°), Jupiter in Cancer (5°), Venus in Pisces (27°), Saturn in Libra (20°). An exalted planet gives its best results — amplifying all karakatvas (significations) to their maximum. The degree of exaltation is the most powerful point; results diminish gradually as the planet moves away from this degree.',
    keywords: ['exaltation', 'uchcha', 'dignity', 'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'],
  },
  {
    id: 'bphs-debilitation',
    topic: 'Planetary Debilitation',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 3',
    text: 'The debilitation signs (exactly opposite exaltation): Sun in Libra, Moon in Scorpio, Mars in Cancer, Mercury in Pisces, Jupiter in Capricorn, Venus in Virgo, Saturn in Aries. A debilitated planet struggles to deliver its significations. However, Neecha Bhanga (cancellation of debilitation) occurs when the debilitation lord is in a Kendra from the Lagna or Moon, or when the exaltation lord of the debilitated planet aspects it.',
    keywords: ['debilitation', 'neecha', 'neecha bhanga', 'cancellation', 'weakness'],
  },

  // ── Houses ─────────────────────────────────────────────────────────────
  {
    id: 'bphs-kendras',
    topic: 'Kendra Houses',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 34',
    text: 'The Kendras (quadrants) are the 1st, 4th, 7th, and 10th houses — the pillars of the horoscope. Naturally benefic planets (Jupiter, Venus, well-associated Mercury, strong Moon) in Kendras give excellent results. However, benefics ruling Kendras can suffer from Kendradhipati Dosha — their beneficence is diluted by angular lordship alone. Conversely, natural malefics ruling Kendras can become functional benefics, especially if they also rule a Trikona.',
    keywords: ['kendra', 'quadrant', '1st', '4th', '7th', '10th', 'kendradhipati', 'angular'],
  },
  {
    id: 'bphs-trikonas',
    topic: 'Trikona Houses',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 34',
    text: 'The Trikonas (trines) are the 1st, 5th, and 9th houses — the houses of Lakshmi (fortune, dharma, and divine grace). Trikona lords are always functionally auspicious regardless of their natural benefic/malefic status. The 5th house governs Poorva Punya (past-life merit), creativity, progeny, and intelligence. The 9th house governs Bhagya (fortune), father, guru, dharma, and long journeys.',
    keywords: ['trikona', 'trine', '5th', '9th', 'lakshmi', 'fortune', 'dharma', 'poorva punya'],
  },
  {
    id: 'bphs-dusthanas',
    topic: 'Dusthana Houses',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 34',
    text: 'The Dusthanas (difficult houses) are the 6th, 8th, and 12th. The 6th governs enemies, disease, debt, and litigation. The 8th governs longevity, occult matters, sudden events, chronic illness, and inheritance. The 12th governs losses, foreign lands, moksha, and expenditure. Lords of dusthanas are functionally malefic unless they hold simultaneous trikona lordship.',
    keywords: ['dusthana', '6th', '8th', '12th', 'enemies', 'disease', 'loss', 'moksha'],
  },

  // ── Dasha ──────────────────────────────────────────────────────────────
  {
    id: 'bphs-vimshottari',
    topic: 'Vimshottari Dasha System',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 46',
    text: 'The Vimshottari Dasha is a 120-year planetary period system based on the Moon\'s nakshatra at birth. The sequence: Ketu (7 years), Venus (20), Sun (6), Moon (10), Mars (7), Rahu (18), Jupiter (16), Saturn (19), Mercury (17). During each Mahadasha, the planet\'s house rulership, placement, dignity, and aspects determine life themes. The Antardasha (sub-period) lord modulates outcomes — if the Mahadasha and Antardasha lords are mutually friendly or rule benefic houses, the period is favorable.',
    keywords: ['vimshottari', 'dasha', 'mahadasha', 'antardasha', 'nakshatra', 'moon', 'period', 'timing'],
  },

  // ── Phaladeepika ───────────────────────────────────────────────────────
  {
    id: 'pd-lagna-lord',
    topic: 'Lagna Lord Placement',
    source: 'Phaladeepika',
    chapter: 'Ch. 15',
    text: 'The Lagna Lord is the most important planet in the chart — it represents the self, body, vitality, and overall direction of life. When the Lagna Lord is in a Kendra or Trikona, the native has strong health, confidence, and the ability to overcome obstacles. When placed in the 6th, 8th, or 12th, the native faces persistent health difficulties, enemies, or feelings of displacement. The dignity (own sign, exaltation, friend\'s sign) of the Lagna Lord dramatically modifies its results.',
    keywords: ['lagna lord', 'ascendant', 'placement', 'self', 'health', 'vitality', 'dignity'],
  },

  // ── Nakshatras ─────────────────────────────────────────────────────────
  {
    id: 'bphs-nakshatras-overview',
    topic: 'Nakshatra System',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 3',
    text: 'The 27 Nakshatras divide the zodiac into 13°20\' segments. Each Nakshatra has a ruling deity and dasha lord: Ashwini (Ketu), Bharani (Venus), Krittika (Sun), Rohini (Moon), Mrigashira (Mars), Ardra (Rahu), Punarvasu (Jupiter), Pushya (Saturn), Ashlesha (Mercury), Magha (Ketu), Purva Phalguni (Venus), Uttara Phalguni (Sun), Hasta (Moon), Chitra (Mars), Swati (Rahu), Vishakha (Jupiter), Anuradha (Saturn), Jyeshtha (Mercury), Moola (Ketu), Purva Ashadha (Venus), Uttara Ashadha (Sun), Shravana (Moon), Dhanishta (Mars), Shatabhisha (Rahu), Purva Bhadrapada (Jupiter), Uttara Bhadrapada (Saturn), Revati (Mercury). The Moon\'s nakshatra at birth determines the starting dasha.',
    keywords: ['nakshatra', 'star', 'constellation', '27', 'ashwini', 'bharani', 'rohini', 'dasha lord'],
  },

  // ── Hora & Timing ─────────────────────────────────────────────────────
  {
    id: 'bphs-hora',
    topic: 'Hora System',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 4',
    text: 'Each day is divided into 24 horas (hours), each ruled by a planet in the Chaldean order: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon. The first hora of each day is ruled by the day-lord (Sunday = Sun, Monday = Moon, etc.). For any lagna, the hora of the lagna lord, 5th lord, or 9th lord is considered auspicious for initiating activities. The hora of the 6th, 8th, or 12th lord should be avoided for new ventures.',
    keywords: ['hora', 'hour', 'timing', 'chaldean', 'day lord', 'auspicious', 'muhurta'],
  },
  {
    id: 'bphs-choghadiya',
    topic: 'Choghadiya System',
    source: 'Muhurta Chintamani',
    text: 'Choghadiya divides the day and night into 8 periods each (total 16). The seven types are: Amrit (excellent — Moon), Shubh (good — Jupiter), Labh (gain — Mercury), Char (average — Venus), Kaal (inauspicious — Saturn), Rog (diseased — Mars), Udveg (anxiety — Sun). For important tasks, Amrit and Shubh are preferred. Labh is good for financial matters. Kaal, Rog, and Udveg should be avoided for initiating new work, though Rog is acceptable for medical treatments.',
    keywords: ['choghadiya', 'amrit', 'shubh', 'labh', 'char', 'kaal', 'rog', 'udveg', 'muhurta'],
  },

  // ── Transits ───────────────────────────────────────────────────────────
  {
    id: 'bphs-saturn-transit',
    topic: 'Saturn Transit (Sade Sati)',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 65',
    text: 'When Saturn transits the 12th, 1st, and 2nd houses from the natal Moon (Sade Sati — seven and a half years), the native experiences challenges related to health, career setbacks, emotional heaviness, and restructuring of life foundations. The first phase (12th from Moon) brings hidden expenses and isolation. The middle phase (over natal Moon) is most intense — bringing career crises, health problems, or family difficulties. The final phase (2nd from Moon) affects finances and family harmony. However, for Capricorn and Aquarius Moon signs, Saturn is the Moon sign lord and Sade Sati effects are significantly mitigated.',
    keywords: ['saturn', 'transit', 'sade sati', 'moon', '12th', '1st', '2nd', 'challenges', 'restructuring'],
  },
  {
    id: 'bphs-jupiter-transit',
    topic: 'Jupiter Transit',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 65',
    text: 'Jupiter transiting the 2nd, 5th, 7th, 9th, and 11th houses from the natal Moon gives favorable results — expansion of wealth, wisdom, relationships, fortune, and gains respectively. Jupiter transiting the 3rd, 6th, 8th, 10th, and 12th from Moon gives challenging results. Jupiter\'s transit through a sign lasts approximately 13 months, and its effects are most pronounced when Jupiter is in direct motion and not combust.',
    keywords: ['jupiter', 'transit', 'benefic', 'expansion', 'wisdom', 'fortune'],
  },

  // ── Rahu/Ketu ──────────────────────────────────────────────────────────
  {
    id: 'bphs-rahu-ketu',
    topic: 'Rahu and Ketu',
    source: 'Brihat Parashara Hora Shastra',
    chapter: 'Ch. 47',
    text: 'Rahu and Ketu are shadow planets (chhaaya grahas) representing the lunar nodes. Rahu amplifies worldly desires, obsessions, and unconventional paths — it acts like Saturn at its core but with the amplification quality of Jupiter. Ketu represents spiritual liberation, detachment, past-life skills, and sudden losses. Rahu in a Kendra gives material success through unconventional means; Ketu in a Kendra gives spiritual insights but material instability. Their dasha periods (Rahu 18 years, Ketu 7 years) are transformative — bringing sudden, unexpected changes aligned with their house placement.',
    keywords: ['rahu', 'ketu', 'nodes', 'shadow', 'obsession', 'liberation', 'spiritual', 'sudden'],
  },
];

/**
 * Search the scripture corpus for entries matching a topic or keywords.
 * Returns the top N most relevant entries.
 * 
 * This is a keyword-based search. In a future iteration, this will be
 * replaced by pgvector semantic search in Supabase.
 */
export function searchScriptures(query: string, topN = 3): ScriptureEntry[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = SCRIPTURE_CORPUS.map(entry => {
    let score = 0;

    // Exact topic match (highest weight)
    if (entry.topic.toLowerCase().includes(queryLower)) score += 10;

    // Keyword matches
    for (const keyword of entry.keywords) {
      if (queryLower.includes(keyword)) score += 5;
      for (const qw of queryWords) {
        if (keyword.includes(qw)) score += 2;
      }
    }

    // Text content matches
    for (const qw of queryWords) {
      if (entry.text.toLowerCase().includes(qw)) score += 1;
    }

    return { entry, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.entry);
}

/**
 * Build a RAG context block for a set of detected yogas and planetary conditions.
 * Returns a string that can be injected into LLM prompts.
 */
export function buildScriptureContext(yogaNames: string[], lagnaSign?: string): string {
  if (!yogaNames.length && !lagnaSign) return '';

  const entries: ScriptureEntry[] = [];
  const seen = new Set<string>();

  // Search for each yoga
  for (const yoga of yogaNames) {
    const results = searchScriptures(yoga, 2);
    for (const r of results) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        entries.push(r);
      }
    }
  }

  // Search for lagna-related entries
  if (lagnaSign) {
    const lagnaResults = searchScriptures(`${lagnaSign} lagna`, 2);
    for (const r of lagnaResults) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        entries.push(r);
      }
    }
  }

  if (!entries.length) return '';

  const blocks = entries.map(e =>
    `[${e.source}${e.chapter ? `, ${e.chapter}` : ''} — ${e.topic}]\n${e.text}`
  ).join('\n\n');

  return `\n\nCLASSICAL SCRIPTURE REFERENCES (use these to ground your analysis in authoritative texts):\n\n${blocks}\n`;
}
