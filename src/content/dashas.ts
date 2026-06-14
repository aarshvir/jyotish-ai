export type Dasha = {
  slug: string;
  planet: string;
  years: number;
  title: string;
  description: string;
  keywords: string[];
  html: string;
  faqs: { q: string; a: string }[];
};

export const DASHAS: Dasha[] = [
  {
    slug: 'ketu',
    planet: 'Ketu',
    years: 7,
    title: 'Ketu Mahadasha: Effects, Length & Remedies',
    description:
      'Ketu Mahadasha lasts 7 years and emphasises detachment, intuition and spiritual growth. Learn its effects, sub-periods and grounded remedies.',
    keywords: ['ketu mahadasha', 'ketu dasha effects', 'ketu mahadasha 7 years'],
    html:
      '<h2>What the Ketu Mahadasha Means</h2>' +
      '<p>The Ketu Mahadasha runs for seven years and is one of the most inward-looking periods in the Vimshottari cycle. Ketu is the karaka of detachment, moksha, intuition, research and sudden insight. Where most planets push you outward into the world, Ketu often quietly turns your attention within. Many people describe these years as a time when old attachments loosen and a search for deeper meaning begins.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>During this dasha you may feel less interested in status or accumulation and more drawn to introspection, healing, spirituality or specialised study. It can bring valuable breakthroughs in research and self-understanding. The flip side is that Ketu can also feel scattering or confusing if you resist its pull toward simplicity. How it actually unfolds depends heavily on where Ketu sits in your chart and which house it rules.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>Each Mahadasha is divided into nine <strong>antardashas</strong>, smaller sub-periods ruled by the nine planets in sequence. These shape the texture of the seven years, so a Ketu-Venus phase feels very different from a Ketu-Mars phase. To see your own timeline, try our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Ketu is neither simply good nor bad. It is a teacher of letting go. Handled with awareness, it supports growth; resisted, it can feel unsettling. Remember that a dasha is a season, not a verdict.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Cultivate a steady meditation or breathwork practice to channel Ketu’s introspective energy.</li>' +
      '<li>Keep daily routines simple and grounded; avoid impulsive major decisions.</li>' +
      '<li>Practise generosity and selfless service, which suit Ketu’s detached nature.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Ketu Mahadasha last?',
        a: 'The Ketu Mahadasha lasts exactly 7 years within the 120-year Vimshottari cycle.',
      },
      {
        q: 'Is the Ketu Mahadasha good or bad?',
        a: 'It is neither inherently. Ketu favours detachment, intuition and spiritual growth, and its outcome depends on Ketu’s placement in your chart and how you respond to its inward pull.',
      },
      {
        q: 'What is an antardasha in the Ketu Mahadasha?',
        a: 'An antardasha is a sub-period within the Mahadasha. Ketu’s seven years are split into nine antardashas ruled by each planet in turn, each colouring the experience differently.',
      },
    ],
  },
  {
    slug: 'venus',
    planet: 'Venus',
    years: 20,
    title: 'Venus Mahadasha: Effects, Length & Remedies',
    description:
      'Venus Mahadasha lasts 20 years and emphasises love, comfort, art and prosperity. Learn its effects, sub-periods and balanced remedies.',
    keywords: ['venus mahadasha', 'venus dasha effects', 'shukra mahadasha'],
    html:
      '<h2>What the Venus Mahadasha Means</h2>' +
      '<p>The Venus Mahadasha, or Shukra Mahadasha, is the longest in the Vimshottari cycle at twenty years. Venus is the karaka of love, relationships, beauty, art, luxury, vehicles and material comfort. For many people these two decades coincide with marriage, family life, creative flowering and a noticeable rise in the quality of everyday living.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This is often a warm, sociable and pleasure-oriented period. Partnerships deepen, artistic and aesthetic talents come forward, and there can be gains through relationships, the arts, hospitality or beauty-related fields. Because Venus is naturally benefic, the dasha tends to feel supportive, though its exact flavour depends on Venus’s strength, house lordship and placement in your chart.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The twenty years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in sequence. A Venus-Saturn phase, for example, asks for more patience than a breezy Venus-Mercury phase. See exactly which sub-period you are in with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Venus is generally benefic, so this dasha is widely considered favourable. The main caution is over-indulgence in comfort or relationships at the expense of discipline. A dasha sets a tone; your choices still shape the outcome.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Channel Venus’s energy creatively through art, music or design rather than mere consumption.</li>' +
      '<li>Nurture relationships with honesty and balance instead of avoidance of difficulty.</li>' +
      '<li>Practise moderation in luxury and spending so prosperity becomes lasting.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Venus Mahadasha last?',
        a: 'The Venus (Shukra) Mahadasha lasts exactly 20 years, the longest period in the Vimshottari cycle.',
      },
      {
        q: 'Is the Venus Mahadasha good or bad?',
        a: 'Venus is a natural benefic, so this dasha is usually favourable for love, comfort and creativity. The actual results depend on Venus’s strength and placement in your chart.',
      },
      {
        q: 'What is an antardasha in the Venus Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The twenty Venus years are divided into nine antardashas ruled by each planet, each shaping a distinct phase of the dasha.',
      },
    ],
  },
  {
    slug: 'sun',
    planet: 'Sun',
    years: 6,
    title: 'Sun Mahadasha: Effects, Length & Remedies',
    description:
      'Sun Mahadasha lasts 6 years and emphasises authority, confidence and vitality. Learn its effects, sub-periods and grounded remedies.',
    keywords: ['sun mahadasha', 'sun dasha effects', 'surya mahadasha'],
    html:
      '<h2>What the Sun Mahadasha Means</h2>' +
      '<p>The Sun Mahadasha, or Surya Mahadasha, is the shortest in the Vimshottari cycle at six years. The Sun is the karaka of the soul, vitality, authority, leadership, government, the father and one’s sense of self. These years often bring questions of identity, recognition and standing in the world to the foreground.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This dasha frequently supports career advancement, leadership roles, public recognition and renewed confidence. Connections with authority figures and government can become significant. Health and energy may improve when the Sun is well placed. Because the Sun is bright and assertive, the period can also test the ego, so humility tends to bring out its best results.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The six years are split into nine <strong>antardashas</strong>, sub-periods governed by each planet in turn. A Sun-Jupiter phase often feels expansive, while a Sun-Saturn phase asks for steadiness. Pinpoint your current phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>The Sun is a mild malefic but also deeply life-giving. A strong, well-placed Sun makes this a rewarding period of growth and authority; a weak or afflicted Sun may bring friction with superiors or pressure on the ego. The dasha highlights a theme rather than dictating an outcome.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Greet the morning Sun and build a steady early-rising routine to strengthen vitality.</li>' +
      '<li>Lead with integrity and serve others, balancing confidence with humility.</li>' +
      '<li>Honour and stay connected with father figures and mentors.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Sun Mahadasha last?',
        a: 'The Sun (Surya) Mahadasha lasts exactly 6 years, the shortest period in the Vimshottari cycle.',
      },
      {
        q: 'Is the Sun Mahadasha good or bad?',
        a: 'It depends on the Sun’s strength and placement. A well-placed Sun supports authority, confidence and recognition, while an afflicted Sun can bring ego friction or tension with superiors.',
      },
      {
        q: 'What is an antardasha in the Sun Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The six Sun years are divided into nine antardashas ruled by each planet in turn, each giving the dasha a different character.',
      },
    ],
  },
  {
    slug: 'moon',
    planet: 'Moon',
    years: 10,
    title: 'Moon Mahadasha: Effects, Length & Remedies',
    description:
      'Moon Mahadasha lasts 10 years and emphasises emotions, the mind and nurturing. Learn its effects, sub-periods and gentle remedies.',
    keywords: ['moon mahadasha', 'moon dasha effects', 'chandra mahadasha'],
    html:
      '<h2>What the Moon Mahadasha Means</h2>' +
      '<p>The Moon Mahadasha, or Chandra Mahadasha, runs for ten years and governs the mind, emotions, the mother, nurturing, home and the public. Because the Moon represents the inner emotional landscape, this dasha tends to be felt as much as it is lived. The quality of your feelings, relationships and sense of belonging often takes centre stage.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This period can bring emotional richness, caring relationships, family focus, popularity and gains connected to the public, the home or one’s mother. Creativity and imagination may flourish. The Moon waxes and wanes, so emotional ups and downs are natural here; a strong Moon brings stability, while a weak Moon can amplify moodiness or restlessness.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The ten years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in sequence. A Moon-Venus phase often feels tender and pleasant, while a Moon-Mars phase can stir the emotions. Find your exact phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>A waxing, well-placed Moon is strongly benefic and supportive; a waning or afflicted Moon can make the years emotionally sensitive. Either way, this dasha rewards emotional self-care more than force. Think of it as a season to honour, not a fate to fear.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Protect your sleep, hydration and quiet time to keep the mind steady.</li>' +
      '<li>Nurture close relationships and spend caring time with your mother or family.</li>' +
      '<li>Use journalling or meditation to process emotions rather than suppress them.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Moon Mahadasha last?',
        a: 'The Moon (Chandra) Mahadasha lasts exactly 10 years within the Vimshottari cycle.',
      },
      {
        q: 'Is the Moon Mahadasha good or bad?',
        a: 'A strong, waxing Moon makes it emotionally supportive and benefic, while a weak or afflicted Moon can heighten emotional sensitivity. Placement in your chart decides the tone.',
      },
      {
        q: 'What is an antardasha in the Moon Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The ten Moon years are split into nine antardashas ruled by each planet, each giving the decade a different emotional texture.',
      },
    ],
  },
  {
    slug: 'mars',
    planet: 'Mars',
    years: 7,
    title: 'Mars Mahadasha: Effects, Length & Remedies',
    description:
      'Mars Mahadasha lasts 7 years and emphasises energy, courage and drive. Learn its effects, sub-periods and grounded remedies.',
    keywords: ['mars mahadasha', 'mars dasha effects', 'mangal mahadasha'],
    html:
      '<h2>What the Mars Mahadasha Means</h2>' +
      '<p>The Mars Mahadasha, or Mangal Mahadasha, lasts seven years and brings a surge of energy, courage, ambition and drive. Mars is the karaka of action, competition, discipline, land and property, siblings and physical strength. These years often feel dynamic and forward-moving, with a strong urge to build, compete and assert oneself.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This dasha can favour bold initiatives, athletic and technical pursuits, property matters, and careers requiring courage or leadership. It often rewards decisive action and hard work. The shadow side of Mars is impatience, conflict and anger, so the period tends to go best when energy is directed into purposeful effort rather than friction.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The seven years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in turn. A Mars-Jupiter phase can channel drive constructively, while a Mars-Rahu phase may feel intense. Check your current phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Mars is a malefic by nature, yet a strong, well-placed Mars gives tremendous courage and achievement. An afflicted Mars may bring conflict, accidents or strained relationships. The dasha amplifies your capacity for action; how you aim that energy matters most.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Channel high energy into regular exercise, sport or disciplined work.</li>' +
      '<li>Practise patience and pause before reacting to provocation.</li>' +
      '<li>Take sensible care around vehicles, sharp tools and physical risk.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Mars Mahadasha last?',
        a: 'The Mars (Mangal) Mahadasha lasts exactly 7 years within the Vimshottari cycle.',
      },
      {
        q: 'Is the Mars Mahadasha good or bad?',
        a: 'A strong, well-placed Mars brings courage, drive and achievement, while an afflicted Mars can bring conflict or impatience. The outcome depends on Mars’s placement and how you channel its energy.',
      },
      {
        q: 'What is an antardasha in the Mars Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The seven Mars years are divided into nine antardashas ruled by each planet, each shaping a distinct stretch of the dasha.',
      },
    ],
  },
  {
    slug: 'rahu',
    planet: 'Rahu',
    years: 18,
    title: 'Rahu Mahadasha: Effects, Length & Remedies',
    description:
      'Rahu Mahadasha lasts 18 years and emphasises ambition, change and worldly desire. Learn its effects, sub-periods and grounding remedies.',
    keywords: ['rahu mahadasha', 'rahu dasha effects', 'rahu mahadasha 18 years'],
    html:
      '<h2>What the Rahu Mahadasha Means</h2>' +
      '<p>The Rahu Mahadasha runs for eighteen years and is one of the most transformative periods in the Vimshottari cycle. Rahu is the karaka of worldly desire, ambition, innovation, foreign lands, technology and sudden, unconventional change. These years often push you toward growth in areas you have not mastered, sometimes through unexpected twists and steep learning curves.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>Rahu can bring rapid rise, material gains, fascination with the new, and opportunities through foreign connections, technology or unconventional paths. It also tends to amplify cravings and can create confusion or illusion if ambition outruns clarity. The ride is often dramatic; the lessons are usually about discernment and staying grounded amid change.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The eighteen years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in sequence. A Rahu-Venus phase feels different from a Rahu-Saturn phase, which can be especially testing. See your exact phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Rahu is a shadow planet that is neither purely good nor bad. Well placed, it can deliver striking worldly success; poorly placed, it can bring instability or misjudgement. The dasha asks for clear intentions, not fear of fate.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Keep a grounding routine and avoid impulsive, high-risk shortcuts.</li>' +
      '<li>Pursue clear, ethical goals so ambition is channelled with integrity.</li>' +
      '<li>Practise meditation or quiet reflection to cut through confusion and illusion.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Rahu Mahadasha last?',
        a: 'The Rahu Mahadasha lasts exactly 18 years within the 120-year Vimshottari cycle.',
      },
      {
        q: 'Is the Rahu Mahadasha good or bad?',
        a: 'Rahu is a shadow planet, neither simply good nor bad. Well placed it can bring sudden worldly success, while poorly placed it can bring instability. Its placement and your discernment shape the result.',
      },
      {
        q: 'What is an antardasha in the Rahu Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The eighteen Rahu years are split into nine antardashas ruled by each planet, each colouring the experience differently.',
      },
    ],
  },
  {
    slug: 'jupiter',
    planet: 'Jupiter',
    years: 16,
    title: 'Jupiter Mahadasha: Effects, Length & Remedies',
    description:
      'Jupiter Mahadasha lasts 16 years and emphasises wisdom, growth and good fortune. Learn its effects, sub-periods and balanced remedies.',
    keywords: ['jupiter mahadasha', 'jupiter dasha effects', 'guru mahadasha'],
    html:
      '<h2>What the Jupiter Mahadasha Means</h2>' +
      '<p>The Jupiter Mahadasha, or Guru Mahadasha, lasts sixteen years and is widely regarded as one of the most auspicious periods in the Vimshottari cycle. Jupiter is the great benefic and the karaka of wisdom, knowledge, teachers, children, dharma, wealth and spiritual growth. These years often bring expansion, learning and a deepening sense of purpose.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This dasha tends to favour education, teaching, advisory roles, family growth, financial stability and ethical development. Mentors and guides may appear at the right time, and opportunities for travel, study or spiritual practice often open up. Jupiter expands whatever it touches, so good habits flourish, though so can complacency or overconfidence if balance is lost.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The sixteen years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in sequence. A Jupiter-Venus phase can be especially abundant, while a Jupiter-Saturn phase asks for patience. Find your phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Jupiter is the natural benefic, so this dasha is generally favourable. A strong Jupiter brings wisdom and prosperity; even a weaker Jupiter usually carries protective grace. As always, the dasha sets a tone rather than guaranteeing an outcome, and your effort still matters.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Commit to learning, teaching or mentoring to honour Jupiter’s energy.</li>' +
      '<li>Practise generosity and ethical conduct in daily decisions.</li>' +
      '<li>Stay humble and disciplined so expansion does not slide into excess.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Jupiter Mahadasha last?',
        a: 'The Jupiter (Guru) Mahadasha lasts exactly 16 years within the Vimshottari cycle.',
      },
      {
        q: 'Is the Jupiter Mahadasha good or bad?',
        a: 'Jupiter is the natural benefic, so this dasha is generally favourable for wisdom, growth and good fortune. A strong Jupiter enhances the benefits, but placement in your chart still matters.',
      },
      {
        q: 'What is an antardasha in the Jupiter Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The sixteen Jupiter years are divided into nine antardashas ruled by each planet, each shaping a distinct phase of the dasha.',
      },
    ],
  },
  {
    slug: 'saturn',
    planet: 'Saturn',
    years: 19,
    title: 'Saturn Mahadasha: Effects, Length & Remedies',
    description:
      'Saturn Mahadasha lasts 19 years and emphasises discipline, patience and hard-earned reward. Learn its effects, sub-periods and grounded remedies.',
    keywords: ['saturn mahadasha', 'saturn dasha effects', 'shani mahadasha'],
    html:
      '<h2>What the Saturn Mahadasha Means</h2>' +
      '<p>The Saturn Mahadasha, or Shani Mahadasha, lasts nineteen years and is the great teacher of the Vimshottari cycle. Saturn is the karaka of discipline, responsibility, hard work, time, longevity, service and justice. These years are less about quick rewards and more about building something lasting through patience and steady effort.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This dasha often brings serious responsibility, career consolidation, and lessons in perseverance. Saturn tests before it rewards, so early years can feel demanding while the fruits of disciplined work tend to arrive later. Maturity, structure and accountability grow during this period, and success that is earned here usually proves durable.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The nineteen years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in sequence. A Saturn-Jupiter phase can ease the load, while a Saturn-Mars phase may feel pressured. See your exact phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Saturn is a malefic by nature, yet it is fair rather than cruel. A strong, well-placed Saturn rewards honest effort with stability and respect; an afflicted Saturn can bring delays and burdens. The dasha is best met with diligence, not dread.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Build consistent routines and honour commitments to work with Saturn’s discipline.</li>' +
      '<li>Practise patience and serve others, especially the elderly and those in need.</li>' +
      '<li>Avoid shortcuts; let steady, ethical effort earn lasting results.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Saturn Mahadasha last?',
        a: 'The Saturn (Shani) Mahadasha lasts exactly 19 years within the Vimshottari cycle.',
      },
      {
        q: 'Is the Saturn Mahadasha good or bad?',
        a: 'Saturn is a malefic but a fair one. A strong, well-placed Saturn rewards discipline with lasting stability, while an afflicted Saturn can bring delays. It favours patience and honest effort.',
      },
      {
        q: 'What is an antardasha in the Saturn Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The nineteen Saturn years are divided into nine antardashas ruled by each planet, each giving the dasha a different character.',
      },
    ],
  },
  {
    slug: 'mercury',
    planet: 'Mercury',
    years: 17,
    title: 'Mercury Mahadasha: Effects, Length & Remedies',
    description:
      'Mercury Mahadasha lasts 17 years and emphasises intellect, communication and commerce. Learn its effects, sub-periods and balanced remedies.',
    keywords: ['mercury mahadasha', 'mercury dasha effects', 'budha mahadasha'],
    html:
      '<h2>What the Mercury Mahadasha Means</h2>' +
      '<p>The Mercury Mahadasha, or Budha Mahadasha, lasts seventeen years and sharpens the mind. Mercury is the karaka of intellect, communication, learning, commerce, writing, analysis and adaptability. These years often emphasise thinking, speaking, trading and connecting ideas, making them well suited to study, business and skilled work.</p>' +
      '<h3>General Life Themes</h3>' +
      '<p>This dasha tends to favour education, communication-based careers, business and trade, technology, and intellectual pursuits. Networking, negotiation and quick learning come more easily, and versatility becomes an asset. Because Mercury is restless, the period can also scatter attention, so focus and clear priorities help you make the most of its gifts.</p>' +
      '<h3>Antardashas (Sub-Periods)</h3>' +
      '<p>The seventeen years are divided into nine <strong>antardashas</strong>, sub-periods ruled by each planet in sequence. A Mercury-Venus phase can be socially and commercially rewarding, while a Mercury-Saturn phase asks for steadier focus. Find your phase with our <a href="/vimshottari-dasha-calculator">current dasha calculator</a>.</p>' +
      '<h3>Is It Benefic or Challenging?</h3>' +
      '<p>Mercury is benefic when well associated and takes on the colour of the planets it sits with. A strong Mercury brings clarity, wit and success in communication and trade; a weak or afflicted Mercury can bring indecision or miscommunication. The dasha rewards a focused, honest mind.</p>' +
      '<h3>Measured Remedies</h3>' +
      '<ul>' +
      '<li>Invest in learning a skill, language or craft to channel Mercury’s curiosity.</li>' +
      '<li>Communicate clearly and truthfully, and double-check important details.</li>' +
      '<li>Protect focus by limiting distractions and setting clear priorities.</li>' +
      '</ul>' +
      '<p>For a personalised picture, get your <a href="/free-kundli">free Kundli</a> or a deeper <a href="/kundali">full Kundli reading</a>.</p>',
    faqs: [
      {
        q: 'How long does the Mercury Mahadasha last?',
        a: 'The Mercury (Budha) Mahadasha lasts exactly 17 years within the Vimshottari cycle.',
      },
      {
        q: 'Is the Mercury Mahadasha good or bad?',
        a: 'Mercury is benefic when well placed and reflects the planets it associates with. A strong Mercury supports intellect, communication and commerce, while an afflicted Mercury can bring indecision.',
      },
      {
        q: 'What is an antardasha in the Mercury Mahadasha?',
        a: 'It is a sub-period within the Mahadasha. The seventeen Mercury years are divided into nine antardashas ruled by each planet, each shaping a distinct phase of the dasha.',
      },
    ],
  },
];

export function getDasha(slug: string): Dasha | undefined {
  return DASHAS.find((d) => d.slug === slug);
}
