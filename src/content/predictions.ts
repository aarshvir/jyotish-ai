export type Prediction = {
  slug: string;
  area: string;
  title: string;
  description: string;
  keywords: string[];
  /** Body HTML: only <h2>,<h3>,<p>,<ul><li>,<strong>,<a href="/...">. No <h1> (the page adds it). */
  html: string;
  faqs: { q: string; a: string }[];
};

export const PREDICTIONS: Prediction[] = [
  {
    slug: 'career',
    area: 'Career Prediction by Date of Birth',
    title: 'Career Prediction by Date of Birth',
    description:
      'Free career prediction by date of birth. See how the 10th house, Saturn, Sun and Mercury, and your dasha shape work, jobs and promotions.',
    keywords: [
      'career prediction by date of birth',
      'career astrology',
      'when will i get a job astrology',
      'job prediction by date of birth',
      '10th house career astrology',
    ],
    html:
      '<h2>What your birth chart says about your career</h2>' +
      '<p>In Vedic astrology, your career direction is read mainly from the <strong>10th house</strong>, the house of karma, status and profession. It is supported by the planets that naturally govern work: <strong>Saturn</strong> for discipline and long effort, the <strong>Sun</strong> for authority and recognition, and <strong>Mercury</strong> for skill, communication and commerce. The placement and strength of these factors at your moment of birth suggest the kinds of work that may suit you and the way you tend to grow over time. This is guidance for reflection, never a fixed verdict about what you can or cannot achieve.</p>' +
      '<h2>Which houses and planets govern career</h2>' +
      '<p>The 10th house is the primary house of profession, but a full reading also considers the <strong>6th house</strong> of service, employment and daily work, and the <strong>11th house</strong> of gains and income. The lord of your 10th house, the sign and house it occupies, and the planets that aspect it together hint at your natural field of work. A strong Saturn often favours structure, engineering, administration or steady institutions. A well-placed Sun leans toward leadership, government and roles with visibility. Mercury supports writing, analysis, teaching, trade and technology, while a prominent Venus can incline you toward design, the arts or relationship-driven work.</p>' +
      '<p>No single placement decides everything. Astrologers weigh the overall balance of the chart, because a supportive 10th house with a weak planet, or a challenged house with a strong significator, will read very differently. The aim is a rounded picture of your tendencies rather than a label.</p>' +
      '<h3>How career timing works</h3>' +
      '<p>Timing comes from your <strong>Vimshottari dasha</strong>, the system of planetary periods, together with current transits. A favourable period of a career-linked planet, or a supportive transit of Jupiter or Saturn over the 10th house, often coincides with new roles, promotions, relocation or a meaningful shift in direction. You can review your <a href="/vimshottari-dasha-calculator">current dasha</a> to understand which planetary period you are passing through right now and what themes it tends to bring forward.</p>' +
      '<h3>Honest framing</h3>' +
      '<p>Astrology can point to themes and timing, but it does not replace your own effort, skills and choices. Treat any career prediction as a prompt to prepare and to act with awareness, not a guarantee of outcomes. Two people with very similar charts still build remarkably different careers, because preparation, relationships and decisions all shape the result.</p>' +
      '<ul>' +
      '<li>Generate your <a href="/free-kundli">free Kundli</a> to see your 10th house and its lord.</li>' +
      '<li>Open a <a href="/kundali">deep Kundli report</a> for a fuller career and dasha analysis.</li>' +
      '<li>Check your <a href="/vimshottari-dasha-calculator">current dasha</a> for likely timing of changes.</li>' +
      '</ul>',
    faqs: [
      {
        q: 'Which house is for career in Vedic astrology?',
        a: 'The 10th house is the main house of career, profession and public status. The 6th house (service and employment) and 11th house (gains) add detail to how you earn and grow.',
      },
      {
        q: 'When will I get a job according to astrology?',
        a: 'Job timing is studied through your Vimshottari dasha and transits, especially periods of the 10th and 6th house lords. These point to favourable windows rather than exact dates, so use them to prepare.',
      },
      {
        q: 'Can date of birth predict my career field?',
        a: 'Your birth chart can suggest fields that may suit your temperament and planetary strengths, but it is one input among many. Your training, interests and choices remain decisive.',
      },
      {
        q: 'Which planets are good for career growth?',
        a: 'Saturn supports steady long-term effort, the Sun favours authority and recognition, and Mercury aids skill and communication. Their condition in your chart shapes how each theme plays out.',
      },
    ],
  },
  {
    slug: 'marriage',
    area: 'Marriage Prediction by Date of Birth',
    title: 'Marriage Prediction by Date of Birth',
    description:
      'Free marriage prediction by date of birth. Understand the 7th house, Venus and Jupiter, likely timing of marriage and a clear note on Manglik Dosha.',
    keywords: [
      'marriage prediction by date of birth',
      'marriage astrology',
      'when will i get married astrology',
      '7th house marriage astrology',
      'manglik dosha marriage prediction',
    ],
    html:
      '<h2>What your chart suggests about marriage</h2>' +
      '<p>Marriage in Vedic astrology is read primarily from the <strong>7th house</strong>, the house of partnership, marriage and committed relationships. <strong>Venus</strong> is the natural significator of love, attraction and harmony, while <strong>Jupiter</strong> is the significator of a spouse, especially in a woman&rsquo;s chart. The condition of these factors at birth hints at the nature of your relationships and the kind of partner you may be drawn to. Read it as gentle insight into patterns and timing, not as destiny set in stone.</p>' +
      '<h2>Houses and planets that govern marriage</h2>' +
      '<p>Beyond the 7th house and its lord, astrologers weigh Venus and Jupiter, the placement of the Moon, and the supportive or challenging aspects falling on the 7th house. The 2nd house of family and the 11th house of fulfilment are also considered, because marriage touches home life and shared goals as much as romance. A well-supported 7th house often suggests cooperative, steady partnership, while stress on it tends to point to lessons in patience, listening and communication rather than a fixed problem to fear.</p>' +
      '<h3>When will I get married?</h3>' +
      '<p>Timing is studied through your <strong>Vimshottari dasha</strong> and transits, particularly the periods linked to the 7th house lord, Venus or Jupiter, and Jupiter&rsquo;s transit over the 7th house or over the natal Moon. You can review your <a href="/vimshottari-dasha-calculator">current dasha</a> to see which window you are passing through. These indicate favourable phases for partnership rather than a guaranteed date, so they are best used to recognise an opening, not to count down to one.</p>' +
      '<h3>A note on Manglik Dosha</h3>' +
      '<p>Manglik Dosha, also called Mangal Dosha, arises from certain placements of Mars relative to the ascendant, Moon or Venus, and it is often discussed in marriage matching. In practice many charts carry natural cancellations, so a Manglik result is rarely the obstacle it is made out to be. Run a calm <a href="/manglik-dosha-calculator">Manglik check</a> to understand your own chart, and for two people consider full <a href="/synastry">Kundli matching</a>, which weighs overall compatibility across many factors instead of resting everything on a single placement.</p>' +
      '<ul>' +
      '<li>Start with your <a href="/free-kundli">free Kundli</a> to view your 7th house and Venus.</li>' +
      '<li>Get a <a href="/kundali">deep Kundli report</a> for fuller marriage timing and analysis.</li>' +
      '<li>Use <a href="/synastry">Kundli matching</a> and a <a href="/manglik-dosha-calculator">Manglik check</a> for compatibility.</li>' +
      '</ul>',
    faqs: [
      {
        q: 'Which house shows marriage in the birth chart?',
        a: 'The 7th house is the primary house of marriage and partnership. Venus and Jupiter, plus the 7th house lord, are also studied to understand the nature and timing of marriage.',
      },
      {
        q: 'When will I get married according to astrology?',
        a: 'Marriage timing is read from your Vimshottari dasha and transits, especially periods of the 7th lord, Venus or Jupiter. These suggest favourable phases rather than a fixed date.',
      },
      {
        q: 'Does Manglik Dosha stop marriage?',
        a: 'No. Manglik Dosha is one factor among many and often has natural cancellations. A balanced Kundli matching looks at overall compatibility, not a single placement.',
      },
      {
        q: 'Can date of birth predict my life partner?',
        a: 'Your chart can suggest themes about partnership and the kind of person you connect with, but it cannot name a specific individual. Treat it as guidance, not a guarantee.',
      },
    ],
  },
  {
    slug: 'wealth',
    area: 'Wealth & Money Prediction by Date of Birth',
    title: 'Wealth & Money Prediction by Date of Birth',
    description:
      'Free wealth and money prediction by date of birth. Explore the 2nd and 11th houses, Jupiter, Venus and Mercury, Dhana yogas and financial timing.',
    keywords: [
      'wealth prediction by date of birth',
      'money astrology',
      'dhana yoga in birth chart',
      'financial astrology prediction',
      '2nd house wealth astrology',
    ],
    html:
      '<h2>What your chart says about money and wealth</h2>' +
      '<p>Wealth in Vedic astrology is read mainly from the <strong>2nd house</strong>, which governs accumulated savings, family wealth and speech, and the <strong>11th house</strong>, which governs gains, income and the fulfilment of desires. The natural significators are <strong>Jupiter</strong> for abundance and wisdom, <strong>Venus</strong> for comfort, luxury and assets, and <strong>Mercury</strong> for commerce, trade and calculation. The strength and placement of these factors at birth hint at your relationship with money and how you tend to earn, hold and spend it. This is a lens for awareness, not a promise of riches.</p>' +
      '<h2>Houses, planets and Dhana yogas</h2>' +
      '<p>A full reading studies the lords of the 2nd and 11th houses, how they connect with each other, and the role of the 5th and 9th houses of fortune and good karma. When these wealth-giving houses and planets form supportive links, classical texts describe <strong>Dhana yogas</strong>, the combinations associated with financial growth and prosperity. The presence of a yoga points to genuine potential, yet how fully it expresses still depends on effort, timing, opportunity and circumstances. Equally, a chart without a famous yoga can still support steady, comfortable finances through disciplined habits.</p>' +
      '<h3>How financial timing works</h3>' +
      '<p>Money tends to flow with the <strong>Vimshottari dasha</strong> of wealth-linked planets and with supportive transits, especially Jupiter moving over the 2nd, 5th or 11th house. A favourable dasha can coincide with raises, new ventures, property or investment returns, while a quieter period often suits saving and consolidation. Reviewing your <a href="/vimshottari-dasha-calculator">current dasha</a> helps you see whether you are in a building phase or a consolidating one, so you can plan with the cycle rather than against it.</p>' +
      '<h3>Honest framing</h3>' +
      '<p>No chart guarantees wealth, and no placement condemns you to scarcity. Use these themes to plan, save and invest sensibly rather than to sit back and wait for fortune to arrive. Astrology can highlight timing and tendencies; your habits, discipline and decisions create the actual result.</p>' +
      '<ul>' +
      '<li>Generate your <a href="/free-kundli">free Kundli</a> to see your 2nd and 11th houses.</li>' +
      '<li>Open a <a href="/kundali">deep Kundli report</a> for Dhana yoga and wealth analysis.</li>' +
      '<li>Check your <a href="/vimshottari-dasha-calculator">current dasha</a> for likely financial timing.</li>' +
      '</ul>',
    faqs: [
      {
        q: 'Which house is for wealth in astrology?',
        a: 'The 2nd house governs accumulated wealth and savings, while the 11th house governs gains and income. The 5th and 9th houses of fortune are also considered in a full reading.',
      },
      {
        q: 'What is a Dhana yoga?',
        a: 'A Dhana yoga is a combination, often linking the lords of wealth houses, that classical texts associate with financial growth. It indicates potential that still depends on effort and timing.',
      },
      {
        q: 'Can my date of birth predict if I will be rich?',
        a: 'Your chart can describe your relationship with money and favourable phases, but it cannot guarantee wealth. Sensible saving, earning and investing remain decisive.',
      },
      {
        q: 'When is a good time financially according to astrology?',
        a: 'Favourable phases are read from the dasha of wealth-linked planets and transits such as Jupiter over money houses. These suggest supportive windows rather than certain outcomes.',
      },
    ],
  },
  {
    slug: 'health',
    area: 'Health Prediction by Date of Birth',
    title: 'Health Prediction by Date of Birth',
    description:
      'Free health and wellbeing reading by date of birth. Understand the 6th house, Sun, Mars and Saturn, and Sade Sati as awareness, not medical advice.',
    keywords: [
      'health prediction by date of birth',
      'health astrology',
      'sade sati health effects',
      '6th house health astrology',
      'wellbeing astrology reading',
    ],
    html:
      '<h2>What your chart suggests about wellbeing</h2>' +
      '<p>In Vedic astrology, the <strong>6th house</strong> relates to daily routine, vitality, immunity and the way you handle stress and recovery. The <strong>Sun</strong> reflects core energy and constitution, <strong>Mars</strong> relates to drive, heat and inflammation-type tendencies, and <strong>Saturn</strong> relates to endurance, slowing down and long, accumulating patterns. Together these factors describe themes of energy and resilience &mdash; areas to stay gently aware of, never diagnoses or fixed outcomes for your body.</p>' +
      '<p><strong>This page is for general awareness and self-reflection only. It is not medical advice. For any health concern, please consult a qualified medical professional.</strong></p>' +
      '<h2>Houses and planets linked to vitality</h2>' +
      '<p>Alongside the 6th house, the 1st house, which represents the body and overall vitality, is considered for general resilience, as is the strength of the Sun and the Moon. The Moon also reflects emotional balance and sleep, which quietly shape how you feel day to day. A well-supported chart often suggests steady energy and easy recovery, while stress on these factors simply invites more mindful routines, better rest and a calmer pace rather than any cause for alarm. The point of the reading is encouragement toward balance, not worry.</p>' +
      '<h3>How timing and Sade Sati fit in</h3>' +
      '<p>Phases of higher or lower energy can track with your <strong>Vimshottari dasha</strong> and with transits. <strong>Sade Sati</strong> &mdash; Saturn&rsquo;s roughly seven-and-a-half year transit across the sign before, on, and after the natal Moon &mdash; is often described as a demanding period that rewards patience, rest, simplicity and steady habits. Many people experience it as a time of maturing rather than misfortune. You can check your <a href="/vimshottari-dasha-calculator">current dasha</a> to see which planetary period you are in and whether a Sade Sati phase applies to you now.</p>' +
      '<h3>Honest framing</h3>' +
      '<p>Astrology can encourage helpful habits and self-awareness, but it cannot predict illness or replace medical care of any kind. Use any reading as a gentle nudge toward rest, balance, movement and routine, and always seek professional advice for real symptoms or concerns.</p>' +
      '<ul>' +
      '<li>Generate your <a href="/free-kundli">free Kundli</a> to see your 6th house and key planets.</li>' +
      '<li>Open a <a href="/kundali">deep Kundli report</a> for a fuller wellbeing overview.</li>' +
      '<li>Check your <a href="/vimshottari-dasha-calculator">current dasha</a> and any Sade Sati phase.</li>' +
      '</ul>',
    faqs: [
      {
        q: 'Which house is for health in astrology?',
        a: 'The 6th house relates to daily routine, vitality and recovery, and the 1st house relates to the body and overall energy. These describe themes of wellbeing, not medical conditions.',
      },
      {
        q: 'What is Sade Sati and how does it affect wellbeing?',
        a: 'Sade Sati is Saturn&rsquo;s roughly seven-and-a-half year transit over the natal Moon. It is often described as demanding and is best met with patience, rest and steady habits.',
      },
      {
        q: 'Can astrology predict illness from my date of birth?',
        a: 'No. Astrology can highlight phases for rest and balance, but it cannot diagnose or predict illness. Always consult a qualified medical professional for health concerns.',
      },
      {
        q: 'Is this health reading medical advice?',
        a: 'No. This reading is for general awareness and self-reflection only and is not medical advice. Please see a doctor for any symptom or health question.',
      },
    ],
  },
  {
    slug: 'education',
    area: 'Education & Studies Prediction by Date of Birth',
    title: 'Education & Studies Prediction by Date of Birth',
    description:
      'Free education and studies prediction by date of birth. Explore the 4th and 5th houses, Mercury and Jupiter, and likely timing for exams and learning.',
    keywords: [
      'education prediction by date of birth',
      'education astrology',
      'study and exam astrology',
      '5th house education astrology',
      'higher studies astrology prediction',
    ],
    html:
      '<h2>What your chart says about education</h2>' +
      '<p>Learning in Vedic astrology is read mainly from the <strong>4th house</strong>, which covers early schooling, foundations and steady study, and the <strong>5th house</strong>, which covers intelligence, memory and the capacity to grasp ideas quickly. The natural significators are <strong>Mercury</strong> for analysis, language and fast learning, and <strong>Jupiter</strong> for wisdom, teachers and higher knowledge. The condition and placement of these factors at birth hint at your natural learning style and the subjects you may find easiest. This is encouragement to play to your strengths, never a fixed ceiling on what you can learn.</p>' +
      '<h2>Houses and planets that govern studies</h2>' +
      '<p>Beyond the 4th and 5th houses, the <strong>9th house</strong> relates to higher education, long courses and mentors, and is important for advanced or specialised study. Strong Mercury and Jupiter, with supportive links to these houses, often suggest comfort with study, good concentration and an easy rapport with teachers. Stress on these factors simply points to areas that may need more structure, repetition and practice rather than any real limit on ability. Many strong students succeed by building consistent habits that gradually outweigh a difficult placement.</p>' +
      '<h3>How study and exam timing works</h3>' +
      '<p>Favourable study and exam phases are read through your <strong>Vimshottari dasha</strong> and transits, especially the periods of Mercury or Jupiter and supportive Jupiter transits over the 5th or 9th house. Such windows can align well with admissions, competitive exams or finishing a long course, while quieter periods often suit revision and groundwork. Reviewing your <a href="/vimshottari-dasha-calculator">current dasha</a> helps you see whether you are in a strong learning window. These point to supportive timing, not guaranteed results.</p>' +
      '<h3>Honest framing</h3>' +
      '<p>A chart can describe your learning tendencies and the phases that may help, but exam outcomes depend on consistent study, rest, good preparation and a steady mind. Use any reading to plan your effort and schedule wisely, not to predict a score or to excuse skipping the work.</p>' +
      '<ul>' +
      '<li>Generate your <a href="/free-kundli">free Kundli</a> to see your 4th and 5th houses.</li>' +
      '<li>Open a <a href="/kundali">deep Kundli report</a> for a fuller education analysis.</li>' +
      '<li>Check your <a href="/vimshottari-dasha-calculator">current dasha</a> for study and exam timing.</li>' +
      '</ul>',
    faqs: [
      {
        q: 'Which house is for education in astrology?',
        a: 'The 4th house relates to early schooling and foundations, and the 5th house relates to intelligence and learning. The 9th house relates to higher education and mentors.',
      },
      {
        q: 'Which planets help with studies?',
        a: 'Mercury supports analysis, language and quick learning, while Jupiter supports wisdom, teachers and higher knowledge. Their strength shapes how each theme expresses.',
      },
      {
        q: 'Can astrology predict exam success?',
        a: 'Astrology can suggest favourable study phases through dasha and transits, but it cannot guarantee a result. Consistent preparation, rest and practice remain decisive.',
      },
      {
        q: 'When is a good time for higher studies according to astrology?',
        a: 'Supportive windows are read from periods of Mercury or Jupiter and Jupiter transits over the 5th or 9th house. These indicate helpful timing rather than certain outcomes.',
      },
    ],
  },
];

export function getPrediction(slug: string): Prediction | undefined {
  return PREDICTIONS.find((p) => p.slug === slug);
}
