/** Synthetic positions for transport/UI regressions, not an accuracy reference. */
export const syntheticNatal = {
  lagna: 'Gemini', lagna_degree: 15,
  planets: Object.fromEntries(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((name, i) => [name, {
    sign: name === 'Moon' ? 'Sagittarius' : name === 'Rahu' ? 'Aries' : name === 'Ketu' ? 'Libra' : 'Taurus',
    degree: i + 1, house: i + 1, nakshatra: name === 'Moon' ? 'Mula' : 'Rohini', nakshatra_pada: 1, is_retrograde: false,
  }])),
  current_dasha: { mahadasha: 'Venus', antardasha: 'Moon', start_date: '2020-01-01', end_date: '2040-01-01' },
  dasha_sequence: [{ planet: 'Venus', start_date: '2020-01-01', end_date: '2040-01-01' }],
};
