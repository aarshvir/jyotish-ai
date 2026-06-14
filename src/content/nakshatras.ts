export type Nakshatra = {
  slug: string;
  name: string;
  order: number;
  lord: string;
  deity: string;
  symbol: string;
  gana: string;
  nadi: string;
  yoni: string;
  signRange: string;
  title: string;
  description: string;
  keywords: string[];
  html: string;
  faqs: { q: string; a: string }[];
};

export const NAKSHATRAS: Nakshatra[] = [
  {
    slug: 'ashwini',
    name: 'Ashwini',
    order: 1,
    lord: 'Ketu',
    deity: 'Ashwini Kumaras',
    symbol: 'Horse’s head',
    gana: 'Deva',
    nadi: 'Adi',
    yoni: 'Horse',
    signRange: '0deg00 to 13deg20 Aries',
    title: 'Ashwini Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Ashwini nakshatra meaning — the swift healer of the zodiac. Explore Ashwini traits, ruling planet Ketu, career, love and compatibility.',
    keywords: ['ashwini nakshatra', 'ashwini traits', 'ashwini compatibility', 'ashwini ruling planet', 'ashwini nakshatra career'],
    html: `
<h2>Ashwini Nakshatra: the first spark of the zodiac</h2>
<p>Ashwini is the very first nakshatra, stretching across the opening 13deg20 of Aries. Its symbol is a horse’s head, and its presiding deities are the Ashwini Kumaras — the celestial twin physicians. If you were born under this star, you carry that same restless, pioneering energy: you like to be first, you move fast, and you have an almost instinctive urge to heal and help.</p>
<h3>Personality and traits</h3>
<p>People with the Moon in Ashwini tend to be youthful, enthusiastic and quick to act. You are honest, independent and dislike being slowed down. The shadow side is impatience — you can start more than you finish. Because Ketu rules this star, there is a spiritual, slightly detached quality to you, as if part of you is always looking past the obvious.</p>
<h3>Career and strengths</h3>
<p>Ashwini natives shine in fields that reward speed and initiative: medicine and healing arts, emergency services, sports, entrepreneurship, travel and anything new and untested. You are a natural starter and a gifted troubleshooter. Curious about your own placements? You can <a href="/nakshatra-finder">find your nakshatra</a> in seconds, then pull a full <a href="/free-kundli">free Kundli</a> to see how Ashwini interacts with the rest of your chart.</p>
<h3>Love and compatibility</h3>
<p>In relationships you are warm, generous and a little headstrong. You need a partner who respects your freedom. Ashwini pairs harmoniously with <strong>Bharani</strong> and <strong>Krittika</strong>, and shares an easy understanding with <strong>Pushya</strong> and <strong>Shatabhisha</strong>. For a precise look at two charts together, try VedicHour’s <a href="/synastry">Kundli matching</a>.</p>
<h3>The influence of Ketu</h3>
<p>Ketu, the south node, gives Ashwini its lightning quality and its spiritual restlessness. It can make you intuitive and a quick healer, but it also asks you to slow down and finish what you begin. Channelled well, Ketu turns Ashwini into one of the most dynamic, life-giving stars in the sky.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Ashwini nakshatra?', a: 'Ketu rules Ashwini. It gives the star its swiftness, intuition and a spiritual, slightly detached quality.' },
      { q: 'Which nakshatras are most compatible with Ashwini?', a: 'Ashwini blends well with Bharani, Krittika, Pushya and Shatabhisha. A full chart comparison through Kundli matching gives the clearest answer.' },
      { q: 'What careers suit Ashwini natives?', a: 'Medicine and healing, emergency work, sports, travel and entrepreneurship — anything that rewards speed, courage and starting something new.' },
    ],
  },
  {
    slug: 'bharani',
    name: 'Bharani',
    order: 2,
    lord: 'Venus',
    deity: 'Yama',
    symbol: 'Yoni (female reproductive organ)',
    gana: 'Manushya',
    nadi: 'Adi',
    yoni: 'Elephant',
    signRange: '13deg20 to 26deg40 Aries',
    title: 'Bharani Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Bharani nakshatra meaning — the bearer of creative and transformative power. Explore Bharani traits, ruling planet Venus, career and compatibility.',
    keywords: ['bharani nakshatra', 'bharani traits', 'bharani compatibility', 'bharani ruling planet', 'bharani nakshatra career'],
    html: `
<h2>Bharani Nakshatra: the bearer of life and limits</h2>
<p>Bharani is the second nakshatra, spanning 13deg20 to 26deg40 of Aries. Its symbol is the yoni, the womb, and its deity is Yama, the lord of death and dharma. Together they describe the great cycle of creation and release — Bharani natives understand intensity, transformation and the weight of consequences better than most.</p>
<h3>Personality and traits</h3>
<p>If your Moon sits in Bharani you are passionate, determined and full of vitality. You feel things deeply and rarely do anything by halves. There is a strong moral compass here, inherited from Yama: you sense what is fair and what is not. The challenge is to avoid extremes — Bharani energy can swing from devotion to stubbornness.</p>
<h3>Career and strengths</h3>
<p>Bharani natives carry burdens that would crush others, which makes you superb in demanding roles: leadership, medicine and midwifery, the arts, law, and any work involving transformation or crisis. You have stamina and a creative spark ruled by Venus. To see how this plays out across your chart, <a href="/nakshatra-finder">find your nakshatra</a> and then open a detailed <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted, sensual and fiercely loyal once committed. You give everything, and you expect the same. Bharani matches beautifully with <strong>Ashwini</strong> and <strong>Krittika</strong>, and finds emotional resonance with <strong>Purva Phalguni</strong> and <strong>Revati</strong>. A side-by-side <a href="/synastry">Kundli matching</a> reading will show where the chemistry truly lies.</p>
<h3>The influence of Venus</h3>
<p>Venus, the ruler, lends Bharani its beauty, creativity and sensual richness. It softens Yama’s severity with art, pleasure and love. Balanced well, Venus gives Bharani the rare ability to create, nurture and let go with grace.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Bharani nakshatra?', a: 'Venus rules Bharani, giving it creativity, sensuality and a strong appreciation of beauty and pleasure.' },
      { q: 'Which nakshatras are most compatible with Bharani?', a: 'Bharani harmonises well with Ashwini, Krittika, Purva Phalguni and Revati. Kundli matching confirms the full picture.' },
      { q: 'What careers suit Bharani natives?', a: 'Leadership, medicine and midwifery, the creative arts, law and any field that involves intensity, transformation or crisis.' },
    ],
  },
  {
    slug: 'krittika',
    name: 'Krittika',
    order: 3,
    lord: 'Sun',
    deity: 'Agni',
    symbol: 'Razor or flame',
    gana: 'Rakshasa',
    nadi: 'Madhya',
    yoni: 'Sheep',
    signRange: '26deg40 Aries to 10deg00 Taurus',
    title: 'Krittika Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Krittika nakshatra meaning — the star of fire that cuts and purifies. Explore Krittika traits, ruling planet Sun, career and compatibility.',
    keywords: ['krittika nakshatra', 'krittika traits', 'krittika compatibility', 'krittika ruling planet', 'krittika nakshatra career'],
    html: `
<h2>Krittika Nakshatra: the sacred flame that purifies</h2>
<p>Krittika is the third nakshatra, bridging the end of Aries and the start of Taurus (26deg40 Aries to 10deg00 Taurus). Its symbol is a razor or flame, and its deity is Agni, the god of fire. This is the star of sharp focus, purification and unflinching honesty — Krittika burns away whatever is false.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Krittika you are bright, direct and impossible to deceive. You see clearly and speak plainly, sometimes a little too plainly. There is real courage here and a protective streak — you defend what you love. The flame can also scorch: watch for criticism that cuts deeper than you intend.</p>
<h3>Career and strengths</h3>
<p>Krittika natives excel where precision and integrity matter: leadership, the military, surgery, teaching, criticism and the culinary arts, and anything that demands a sharp, discerning eye. Ruled by the Sun, you naturally take charge. Want to map this fire onto your whole chart? <a href="/nakshatra-finder">Find your nakshatra</a>, then study a complete <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In relationships you are loyal, passionate and protective, though your bluntness needs a partner who values honesty. Krittika pairs well with <strong>Bharani</strong> and <strong>Rohini</strong>, and connects strongly with <strong>Uttara Phalguni</strong> and <strong>Anuradha</strong>. Run a <a href="/synastry">Kundli matching</a> to see how your fire meets theirs.</p>
<h3>The influence of the Sun</h3>
<p>The Sun rules Krittika, giving it leadership, willpower and a radiant centre. It makes you proud and self-driven, with a deep need to do what is right. At its best, the solar fire of Krittika becomes wisdom — light that guides rather than burns.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Krittika nakshatra?', a: 'The Sun rules Krittika, giving it leadership, willpower, clarity and a strong sense of purpose.' },
      { q: 'Which nakshatras are most compatible with Krittika?', a: 'Krittika blends well with Bharani, Rohini, Uttara Phalguni and Anuradha. Kundli matching gives the full assessment.' },
      { q: 'What careers suit Krittika natives?', a: 'Leadership, the military, surgery, teaching, criticism and culinary arts — fields that reward precision, courage and integrity.' },
    ],
  },
  {
    slug: 'rohini',
    name: 'Rohini',
    order: 4,
    lord: 'Moon',
    deity: 'Brahma',
    symbol: 'Ox cart or chariot',
    gana: 'Manushya',
    nadi: 'Antya',
    yoni: 'Serpent',
    signRange: '10deg00 to 23deg20 Taurus',
    title: 'Rohini Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Rohini nakshatra meaning — the star of growth, beauty and abundance. Explore Rohini traits, ruling planet Moon, career and compatibility.',
    keywords: ['rohini nakshatra', 'rohini traits', 'rohini compatibility', 'rohini ruling planet', 'rohini nakshatra career'],
    html: `
<h2>Rohini Nakshatra: the star of growth and beauty</h2>
<p>Rohini is the fourth nakshatra, sitting from 10deg00 to 23deg20 of Taurus. Its symbol is an ox cart, its deity is Brahma the creator, and it is widely considered the most fertile and abundant star in the zodiac. Rohini is where things take root and flourish — beauty, wealth and growth are its natural language.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Rohini — its own sign of exaltation — you are charming, sensual and magnetic. People are simply drawn to you. You love comfort, art, food and the good things in life, and you have a gift for making others feel cared for. The shadow is attachment: you can cling to possessions, people or moods.</p>
<h3>Career and strengths</h3>
<p>Rohini natives thrive in fields tied to beauty, nature and material growth: agriculture, the arts and music, fashion, finance, hospitality and luxury goods. You have taste and staying power. To understand how this lush energy threads through your life, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are romantic, devoted and deeply sensual — a true partner of the heart and senses. Rohini pairs wonderfully with <strong>Krittika</strong> and <strong>Mrigashira</strong>, and shares warmth with <strong>Hasta</strong> and <strong>Shravana</strong>. A careful <a href="/synastry">Kundli matching</a> will reveal where lasting affection can grow.</p>
<h3>The influence of the Moon</h3>
<p>The Moon, which is exalted in Rohini, makes this star tender, emotional and creative. It gives a nurturing, comfort-loving nature and a powerful imagination. At its finest, the lunar grace of Rohini turns desire into devotion and abundance into generosity.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Rohini nakshatra?', a: 'The Moon rules Rohini — and is exalted here — giving the star emotional depth, charm and creative abundance.' },
      { q: 'Which nakshatras are most compatible with Rohini?', a: 'Rohini harmonises with Krittika, Mrigashira, Hasta and Shravana. Kundli matching confirms the deeper compatibility.' },
      { q: 'What careers suit Rohini natives?', a: 'Arts and music, agriculture, fashion, finance, hospitality and luxury — anything connected to beauty, nature and growth.' },
    ],
  },
  {
    slug: 'mrigashira',
    name: 'Mrigashira',
    order: 5,
    lord: 'Mars',
    deity: 'Soma',
    symbol: 'Deer’s head',
    gana: 'Deva',
    nadi: 'Madhya',
    yoni: 'Serpent',
    signRange: '23deg20 Taurus to 6deg40 Gemini',
    title: 'Mrigashira Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Mrigashira nakshatra meaning — the gentle seeker of the zodiac. Explore Mrigashira traits, ruling planet Mars, career and compatibility.',
    keywords: ['mrigashira nakshatra', 'mrigashira traits', 'mrigashira compatibility', 'mrigashira ruling planet', 'mrigashira nakshatra career'],
    html: `
<h2>Mrigashira Nakshatra: the gentle seeker</h2>
<p>Mrigashira is the fifth nakshatra, spanning 23deg20 Taurus to 6deg40 Gemini. Its symbol is a deer’s head, and its deity is Soma, the nectar of the moon. This is the star of searching — curious, gentle and forever on the trail of something more beautiful, more true, just over the next hill.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Mrigashira you are inquisitive, soft-spoken and quick-witted. You ask wonderful questions and love to explore ideas, places and people. There is a restless quality, like a deer that never quite settles. The shadow is fickleness — so much seeking that you struggle to commit or feel content.</p>
<h3>Career and strengths</h3>
<p>Mrigashira natives flourish in fields that reward curiosity and communication: research and writing, sales and marketing, travel, music, design and exploration of all kinds. You are a natural collector of information. To see where your seeking leads, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In relationships you are tender, playful and a little elusive; you need mental stimulation as much as affection. Mrigashira pairs sweetly with <strong>Rohini</strong> and <strong>Ardra</strong>, and connects well with <strong>Chitra</strong> and <strong>Dhanishtha</strong>. A thoughtful <a href="/synastry">Kundli matching</a> shows where curiosity becomes lasting closeness.</p>
<h3>The influence of Mars</h3>
<p>Mars rules Mrigashira, giving the gentle deer its drive, courage and persistent energy. It turns soft curiosity into purposeful pursuit. Balanced well, the Martian fire keeps Mrigashira moving forward instead of merely wandering.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Mrigashira nakshatra?', a: 'Mars rules Mrigashira, giving its gentle, searching nature a steady undercurrent of drive and courage.' },
      { q: 'Which nakshatras are most compatible with Mrigashira?', a: 'Mrigashira blends with Rohini, Ardra, Chitra and Dhanishtha. Kundli matching reveals the full compatibility.' },
      { q: 'What careers suit Mrigashira natives?', a: 'Research and writing, sales and marketing, travel, music and design — work that rewards curiosity and communication.' },
    ],
  },
  {
    slug: 'ardra',
    name: 'Ardra',
    order: 6,
    lord: 'Rahu',
    deity: 'Rudra',
    symbol: 'Teardrop or human head',
    gana: 'Manushya',
    nadi: 'Antya',
    yoni: 'Dog',
    signRange: '6deg40 to 20deg00 Gemini',
    title: 'Ardra Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Ardra nakshatra meaning — the storm star of transformation. Explore Ardra traits, ruling planet Rahu, career, love and compatibility.',
    keywords: ['ardra nakshatra', 'ardra traits', 'ardra compatibility', 'ardra ruling planet', 'ardra nakshatra career'],
    html: `
<h2>Ardra Nakshatra: the storm before clarity</h2>
<p>Ardra is the sixth nakshatra, from 6deg40 to 20deg00 of Gemini. Its symbol is a teardrop, and its deity is Rudra, the storm-form of Shiva. The name means moist or fresh — the rain that follows the thunder. Ardra is the star of upheaval and renewal, where old structures are washed away so something truer can grow.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Ardra you are sharp, intense and deeply perceptive. You feel the world strongly and think in ways others find unusual. There is a rebellious, questioning streak here, and an emotional depth that can swing between turbulence and calm. The challenge is to let the storms pass without being defined by them.</p>
<h3>Career and strengths</h3>
<p>Ardra natives excel where transformation and intellect meet: research and science, technology, psychology, crisis work, writing and activism. You see what others miss and are unafraid of hard truths. To make sense of your inner weather, <a href="/nakshatra-finder">find your nakshatra</a> and open a complete <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are passionate and loyal, but you need understanding of your emotional intensity. Ardra pairs well with <strong>Mrigashira</strong> and <strong>Punarvasu</strong>, and finds depth with <strong>Swati</strong> and <strong>Shatabhisha</strong>. A careful <a href="/synastry">Kundli matching</a> shows who can weather your storms and share your calm.</p>
<h3>The influence of Rahu</h3>
<p>Rahu, the north node, rules Ardra and gives it hunger, brilliance and a taste for the unconventional. It can amplify desire and confusion, but it also drives extraordinary insight and reinvention. Channelled well, Rahu turns Ardra’s storms into breakthroughs.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Ardra nakshatra?', a: 'Rahu rules Ardra, lending it intensity, sharp intelligence and a powerful capacity for transformation.' },
      { q: 'Which nakshatras are most compatible with Ardra?', a: 'Ardra harmonises with Mrigashira, Punarvasu, Swati and Shatabhisha. Kundli matching clarifies the full picture.' },
      { q: 'What careers suit Ardra natives?', a: 'Research and science, technology, psychology, crisis work and writing — fields that reward depth, insight and transformation.' },
    ],
  },
  {
    slug: 'punarvasu',
    name: 'Punarvasu',
    order: 7,
    lord: 'Jupiter',
    deity: 'Aditi',
    symbol: 'Quiver of arrows',
    gana: 'Deva',
    nadi: 'Adi',
    yoni: 'Cat',
    signRange: '20deg00 Gemini to 3deg20 Cancer',
    title: 'Punarvasu Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Punarvasu nakshatra meaning — the star of return and renewal. Explore Punarvasu traits, ruling planet Jupiter, career and compatibility.',
    keywords: ['punarvasu nakshatra', 'punarvasu traits', 'punarvasu compatibility', 'punarvasu ruling planet', 'punarvasu nakshatra career'],
    html: `
<h2>Punarvasu Nakshatra: the return of the light</h2>
<p>Punarvasu is the seventh nakshatra, spanning 20deg00 Gemini to 3deg20 Cancer. Its name means the return of the good or the light, its symbol is a quiver of arrows, and its deity is Aditi, the cosmic mother of the gods. This is the star of renewal, second chances and quiet, hopeful optimism.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Punarvasu you are kind, philosophical and resilient. You bounce back from setbacks better than almost anyone — life can knock you down and you simply begin again. You value simplicity, home and truth, and you have a gentle, nurturing warmth. The shadow is restlessness and a tendency to spread yourself thin.</p>
<h3>Career and strengths</h3>
<p>Punarvasu natives do well in fields that involve teaching, guidance and renewal: education, writing and publishing, counselling, spirituality, hospitality and travel. Ruled by Jupiter, you carry wisdom others lean on. To see how this hopeful star shapes your path, <a href="/nakshatra-finder">find your nakshatra</a> and study a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted, easy-going and forgiving, always ready to start fresh after a quarrel. Punarvasu pairs warmly with <strong>Ardra</strong> and <strong>Pushya</strong>, and connects beautifully with <strong>Vishakha</strong> and <strong>Purva Bhadrapada</strong>. A gentle <a href="/synastry">Kundli matching</a> shows where renewal becomes lasting love.</p>
<h3>The influence of Jupiter</h3>
<p>Jupiter rules Punarvasu, blessing it with wisdom, faith and generosity. It gives the optimism to begin again and the broad perspective to forgive. At its best, Jupiter makes Punarvasu a teacher and a healer — light that keeps returning.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Punarvasu nakshatra?', a: 'Jupiter rules Punarvasu, giving it wisdom, optimism, generosity and a remarkable ability to renew.' },
      { q: 'Which nakshatras are most compatible with Punarvasu?', a: 'Punarvasu blends with Ardra, Pushya, Vishakha and Purva Bhadrapada. Kundli matching gives the full reading.' },
      { q: 'What careers suit Punarvasu natives?', a: 'Education, writing and publishing, counselling, spirituality and travel — work built on teaching, guidance and renewal.' },
    ],
  },
  {
    slug: 'pushya',
    name: 'Pushya',
    order: 8,
    lord: 'Saturn',
    deity: 'Brihaspati',
    symbol: 'Cow’s udder or lotus',
    gana: 'Deva',
    nadi: 'Madhya',
    yoni: 'Sheep',
    signRange: '3deg20 to 16deg40 Cancer',
    title: 'Pushya Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Pushya nakshatra meaning — the most auspicious star of nourishment. Explore Pushya traits, ruling planet Saturn, career and compatibility.',
    keywords: ['pushya nakshatra', 'pushya traits', 'pushya compatibility', 'pushya ruling planet', 'pushya nakshatra career'],
    html: `
<h2>Pushya Nakshatra: the star of nourishment</h2>
<p>Pushya is the eighth nakshatra, from 3deg20 to 16deg40 of Cancer. Its symbol is a cow’s udder, its deity is Brihaspati the guru of the gods, and it is traditionally regarded as the most auspicious of all the nakshatras. The name means to nourish — Pushya feeds, supports and protects everything in its care.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Pushya you are caring, dependable and deeply principled. You are the one others turn to in hard times. There is a calm, steadying wisdom about you, and a strong sense of duty. The shadow is rigidity — you can become over-protective, controlling or stuck in your ways when you feel insecure.</p>
<h3>Career and strengths</h3>
<p>Pushya natives excel in nurturing, structured and service-oriented work: teaching, healthcare, social work, government, food and agriculture, and spiritual leadership. Ruled by Saturn, you bring discipline and reliability to everything. To see how this nourishing energy supports your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are loyal, protective and steady — the partner who stays. Pushya pairs harmoniously with <strong>Punarvasu</strong> and <strong>Ashlesha</strong>, and shares deep care with <strong>Ashwini</strong> and <strong>Anuradha</strong>. A careful <a href="/synastry">Kundli matching</a> reveals where your nurturing nature is best received.</p>
<h3>The influence of Saturn</h3>
<p>Saturn rules Pushya, giving it patience, discipline and a long, dependable strength. It grounds Brihaspati’s wisdom in duty and service. At its best, Saturn makes Pushya a pillar — slow to change, but utterly reliable and quietly nourishing.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Pushya nakshatra?', a: 'Saturn rules Pushya, giving it discipline, patience, responsibility and a steady, dependable strength.' },
      { q: 'Which nakshatras are most compatible with Pushya?', a: 'Pushya harmonises with Punarvasu, Ashlesha, Ashwini and Anuradha. Kundli matching confirms the deeper fit.' },
      { q: 'What careers suit Pushya natives?', a: 'Teaching, healthcare, social work, government and food or agriculture — nurturing, structured, service-driven roles.' },
    ],
  },
  {
    slug: 'ashlesha',
    name: 'Ashlesha',
    order: 9,
    lord: 'Mercury',
    deity: 'Nagas (serpent deities)',
    symbol: 'Coiled serpent',
    gana: 'Rakshasa',
    nadi: 'Antya',
    yoni: 'Cat',
    signRange: '16deg40 to 30deg00 Cancer',
    title: 'Ashlesha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Ashlesha nakshatra meaning — the embracing serpent star. Explore Ashlesha traits, ruling planet Mercury, career, love and compatibility.',
    keywords: ['ashlesha nakshatra', 'ashlesha traits', 'ashlesha compatibility', 'ashlesha ruling planet', 'ashlesha nakshatra career'],
    html: `
<h2>Ashlesha Nakshatra: the embrace of the serpent</h2>
<p>Ashlesha is the ninth nakshatra, completing Cancer from 16deg40 to 30deg00. Its symbol is a coiled serpent, and its deities are the Nagas, the wise serpent gods. The name means to embrace or entwine. Ashlesha holds the secret, hypnotic power of the snake — penetrating insight, healing and a strong instinct to protect itself.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Ashlesha you are intuitive, magnetic and remarkably perceptive. You read people instantly and keep your own depths private. There is real wisdom and healing ability here, along with intense emotional sensitivity. The shadow is the serpent’s sting — possessiveness, suspicion or a tendency to coil inward when hurt.</p>
<h3>Career and strengths</h3>
<p>Ashlesha natives shine in fields that reward insight and influence: psychology, medicine and healing, research, strategy, negotiation and the occult. Ruled by Mercury, you communicate with subtle power. To understand your own coiled energy, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are deep, devoted and intensely loyal, but you need a partner who earns your trust slowly. Ashlesha pairs well with <strong>Pushya</strong> and <strong>Magha</strong>, and connects strongly with <strong>Jyeshtha</strong> and <strong>Revati</strong>. A sensitive <a href="/synastry">Kundli matching</a> shows who can hold your depth with care.</p>
<h3>The influence of Mercury</h3>
<p>Mercury rules Ashlesha, giving the serpent its quick mind, persuasive speech and gift for strategy. It sharpens intuition into intelligence. Channelled well, Mercury turns Ashlesha’s hidden power into healing wisdom rather than guarded mistrust.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Ashlesha nakshatra?', a: 'Mercury rules Ashlesha, giving it a quick, strategic mind, persuasive speech and penetrating insight.' },
      { q: 'Which nakshatras are most compatible with Ashlesha?', a: 'Ashlesha blends with Pushya, Magha, Jyeshtha and Revati. Kundli matching reveals the full compatibility.' },
      { q: 'What careers suit Ashlesha natives?', a: 'Psychology, medicine and healing, research, strategy, negotiation and the occult — work that rewards insight and influence.' },
    ],
  },
  {
    slug: 'magha',
    name: 'Magha',
    order: 10,
    lord: 'Ketu',
    deity: 'Pitris (ancestors)',
    symbol: 'Royal throne',
    gana: 'Rakshasa',
    nadi: 'Adi',
    yoni: 'Rat',
    signRange: '0deg00 to 13deg20 Leo',
    title: 'Magha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Magha nakshatra meaning — the royal star of ancestry and honour. Explore Magha traits, ruling planet Ketu, career and compatibility.',
    keywords: ['magha nakshatra', 'magha traits', 'magha compatibility', 'magha ruling planet', 'magha nakshatra career'],
    html: `
<h2>Magha Nakshatra: the throne of the ancestors</h2>
<p>Magha is the tenth nakshatra, opening Leo from 0deg00 to 13deg20. Its symbol is a royal throne, and its deities are the Pitris, the honoured ancestors. The name means the mighty or the great. Magha carries the dignity of lineage, tradition and rightful authority — it remembers where it comes from and expects to lead.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Magha you are dignified, ambitious and proud in the best sense. You respect tradition, honour your roots and carry yourself with natural authority. People sense your regal bearing. The shadow is arrogance or entitlement — the throne can tip into needing recognition and looking down on others.</p>
<h3>Career and strengths</h3>
<p>Magha natives excel in leadership and positions of honour: politics, administration, law, the corporate world, history and heritage work, and ceremonial roles. You command respect and value legacy. To see how this royal energy shapes your destiny, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are generous, loyal and protective of family, with a need to be admired and respected. Magha pairs well with <strong>Ashlesha</strong> and <strong>Purva Phalguni</strong>, and connects with <strong>Mula</strong> and <strong>Ashwini</strong>. A grounded <a href="/synastry">Kundli matching</a> shows who honours your pride and shares your values.</p>
<h3>The influence of Ketu</h3>
<p>Ketu rules Magha, linking it to the past, the ancestors and the soul’s inheritance. It gives a sense of destiny and a pull toward what has been earned across lifetimes. At its best, Ketu turns Magha’s pride into purpose and its authority into service of lineage.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Magha nakshatra?', a: 'Ketu rules Magha, connecting it to ancestry, tradition and a deep sense of destiny and inheritance.' },
      { q: 'Which nakshatras are most compatible with Magha?', a: 'Magha harmonises with Ashlesha, Purva Phalguni, Mula and Ashwini. Kundli matching confirms the fit.' },
      { q: 'What careers suit Magha natives?', a: 'Politics, administration, law, corporate leadership and heritage work — roles of honour, authority and legacy.' },
    ],
  },
  {
    slug: 'purva-phalguni',
    name: 'Purva Phalguni',
    order: 11,
    lord: 'Venus',
    deity: 'Bhaga',
    symbol: 'Front legs of a bed or hammock',
    gana: 'Manushya',
    nadi: 'Madhya',
    yoni: 'Rat',
    signRange: '13deg20 to 26deg40 Leo',
    title: 'Purva Phalguni Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Purva Phalguni nakshatra meaning — the star of pleasure, love and rest. Explore its traits, ruling planet Venus, career and compatibility.',
    keywords: ['purva phalguni nakshatra', 'purva phalguni traits', 'purva phalguni compatibility', 'purva phalguni ruling planet', 'purva phalguni career'],
    html: `
<h2>Purva Phalguni Nakshatra: the star of love and leisure</h2>
<p>Purva Phalguni is the eleventh nakshatra, spanning 13deg20 to 26deg40 of Leo. Its symbol is the front legs of a bed or a hammock, and its deity is Bhaga, the god of delight, fortune and marital bliss. This is the star of pleasure, romance, creativity and well-earned rest — the joy of being alive.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Purva Phalguni you are warm, charming and generous, with a real love of beauty, comfort and good company. You know how to relax and how to make others feel cherished. There is a creative, playful spirit here. The shadow is indulgence or vanity — too much love of ease can soften ambition.</p>
<h3>Career and strengths</h3>
<p>Purva Phalguni natives thrive in fields tied to creativity, pleasure and people: arts and entertainment, fashion and design, hospitality, event management, luxury and counselling. Ruled by Venus, you bring charm and aesthetic gifts. To see how this radiant star colours your chart, <a href="/nakshatra-finder">find your nakshatra</a> and open a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are romantic, affectionate and devoted — partnership and marriage genuinely fulfil you. Purva Phalguni pairs beautifully with <strong>Magha</strong> and <strong>Uttara Phalguni</strong>, and connects warmly with <strong>Bharani</strong> and <strong>Swati</strong>. A loving <a href="/synastry">Kundli matching</a> shows where romance becomes lasting union.</p>
<h3>The influence of Venus</h3>
<p>Venus rules Purva Phalguni, giving it beauty, charm, sensuality and a deep capacity for love. It blesses relationships, art and enjoyment. At its best, Venus turns this star’s love of pleasure into generosity, grace and devoted partnership.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Purva Phalguni nakshatra?', a: 'Venus rules Purva Phalguni, giving it charm, creativity, sensuality and a strong gift for love and partnership.' },
      { q: 'Which nakshatras are most compatible with Purva Phalguni?', a: 'It blends with Magha, Uttara Phalguni, Bharani and Swati. Kundli matching gives the full reading.' },
      { q: 'What careers suit Purva Phalguni natives?', a: 'Arts and entertainment, fashion and design, hospitality, events and luxury — fields built on creativity and charm.' },
    ],
  },
  {
    slug: 'uttara-phalguni',
    name: 'Uttara Phalguni',
    order: 12,
    lord: 'Sun',
    deity: 'Aryaman',
    symbol: 'Back legs of a bed or a fig tree',
    gana: 'Manushya',
    nadi: 'Antya',
    yoni: 'Cow',
    signRange: '26deg40 Leo to 10deg00 Virgo',
    title: 'Uttara Phalguni Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Uttara Phalguni nakshatra meaning — the star of friendship and noble service. Explore its traits, ruling planet Sun, career and compatibility.',
    keywords: ['uttara phalguni nakshatra', 'uttara phalguni traits', 'uttara phalguni compatibility', 'uttara phalguni ruling planet', 'uttara phalguni career'],
    html: `
<h2>Uttara Phalguni Nakshatra: the star of noble friendship</h2>
<p>Uttara Phalguni is the twelfth nakshatra, bridging Leo and Virgo (26deg40 Leo to 10deg00 Virgo). Its symbol is the back legs of a bed, and its deity is Aryaman, the god of patronage, contracts and noble friendship. Where its sister star Purva enjoys pleasure, Uttara turns toward commitment, service and the dignity of keeping one’s word.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Uttara Phalguni you are generous, reliable and principled. You take your responsibilities seriously and treat friendship as sacred. There is warmth here married to discipline — kindness with structure. The shadow is over-giving or stubborn pride: you can exhaust yourself helping others or refuse help in return.</p>
<h3>Career and strengths</h3>
<p>Uttara Phalguni natives excel in roles built on trust and service: social work, medicine, counselling, administration, contracts and law, teaching and charitable leadership. Ruled by the Sun, you lead with integrity. To see how this noble star steadies your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted, dependable and deeply committed — you marry for life and mean it. Uttara Phalguni pairs well with <strong>Purva Phalguni</strong> and <strong>Hasta</strong>, and connects with <strong>Krittika</strong> and <strong>Uttara Ashadha</strong>. A steady <a href="/synastry">Kundli matching</a> shows where loyalty meets lasting affection.</p>
<h3>The influence of the Sun</h3>
<p>The Sun rules Uttara Phalguni, giving it leadership, integrity and a generous, radiant heart. It turns Aryaman’s ideal of noble friendship into action. At its best, the solar warmth here makes you a steadfast benefactor — kind, dependable and quietly powerful.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Uttara Phalguni nakshatra?', a: 'The Sun rules Uttara Phalguni, giving it integrity, leadership, generosity and a strong sense of duty.' },
      { q: 'Which nakshatras are most compatible with Uttara Phalguni?', a: 'It harmonises with Purva Phalguni, Hasta, Krittika and Uttara Ashadha. Kundli matching confirms the fit.' },
      { q: 'What careers suit Uttara Phalguni natives?', a: 'Social work, medicine, counselling, administration, law and teaching — roles built on trust, service and reliability.' },
    ],
  },
  {
    slug: 'hasta',
    name: 'Hasta',
    order: 13,
    lord: 'Moon',
    deity: 'Savitar (Sun god)',
    symbol: 'Hand or fist',
    gana: 'Deva',
    nadi: 'Adi',
    yoni: 'Buffalo',
    signRange: '10deg00 to 23deg20 Virgo',
    title: 'Hasta Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Hasta nakshatra meaning — the skilful hand of the zodiac. Explore Hasta traits, ruling planet Moon, career, love and compatibility.',
    keywords: ['hasta nakshatra', 'hasta traits', 'hasta compatibility', 'hasta ruling planet', 'hasta nakshatra career'],
    html: `
<h2>Hasta Nakshatra: the skilful hand</h2>
<p>Hasta is the thirteenth nakshatra, sitting from 10deg00 to 23deg20 of Virgo. Its symbol is a hand, and its deity is Savitar, a radiant form of the Sun who grants skill and creative power. The name simply means the hand — and Hasta natives are blessed with exactly that: clever hands, practical skill and the ability to grasp whatever they set out to hold.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Hasta you are dexterous, clever and quietly determined. You are good with details, good with your hands and good at getting things done. There is wit and charm here, and a strong desire to be useful. The shadow is anxiety or manipulation — the same cleverness that builds can sometimes scheme or worry too much.</p>
<h3>Career and strengths</h3>
<p>Hasta natives excel in skilled, hands-on and detail-oriented work: crafts and the arts, healing and massage, writing, trade and commerce, engineering and astrology itself. Ruled by the Moon, you blend skill with intuition. To see how your gifted hands shape your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are attentive, devoted and practical — you show affection by doing, not just saying. Hasta pairs well with <strong>Uttara Phalguni</strong> and <strong>Chitra</strong>, and connects warmly with <strong>Rohini</strong> and <strong>Shravana</strong>. A thoughtful <a href="/synastry">Kundli matching</a> shows where your care is truly valued.</p>
<h3>The influence of the Moon</h3>
<p>The Moon rules Hasta, giving its practical skill a sensitive, intuitive heart. It makes you adaptable, perceptive and emotionally aware. At its best, the lunar grace here turns clever hands into healing hands — skill guided by genuine care.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Hasta nakshatra?', a: 'The Moon rules Hasta, blending its practical skill and dexterity with intuition and emotional sensitivity.' },
      { q: 'Which nakshatras are most compatible with Hasta?', a: 'Hasta harmonises with Uttara Phalguni, Chitra, Rohini and Shravana. Kundli matching gives the full picture.' },
      { q: 'What careers suit Hasta natives?', a: 'Crafts and the arts, healing and massage, writing, trade, engineering and astrology — skilled, hands-on, detailed work.' },
    ],
  },
  {
    slug: 'chitra',
    name: 'Chitra',
    order: 14,
    lord: 'Mars',
    deity: 'Vishwakarma (Tvashtar)',
    symbol: 'Bright jewel or pearl',
    gana: 'Rakshasa',
    nadi: 'Madhya',
    yoni: 'Tiger',
    signRange: '23deg20 Virgo to 6deg40 Libra',
    title: 'Chitra Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Chitra nakshatra meaning — the brilliant jewel of the zodiac. Explore Chitra traits, ruling planet Mars, career and compatibility.',
    keywords: ['chitra nakshatra', 'chitra traits', 'chitra compatibility', 'chitra ruling planet', 'chitra nakshatra career'],
    html: `
<h2>Chitra Nakshatra: the shining jewel</h2>
<p>Chitra is the fourteenth nakshatra, spanning 23deg20 Virgo to 6deg40 Libra. Its symbol is a bright jewel or pearl, and its deity is Vishwakarma, the divine architect and craftsman of the gods. The name means brilliant or many-coloured. Chitra is the star of beauty, design and dazzling self-expression — it builds things that shine.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Chitra you are charismatic, artistic and effortlessly stylish. You have an eye for beauty and a flair for presentation, and people notice you. There is creative brilliance here and a love of fine things. The shadow is vanity or restlessness — the same desire to shine can tip into ego or scattered energy.</p>
<h3>Career and strengths</h3>
<p>Chitra natives excel in creative and design-driven fields: architecture, fashion, art and photography, jewellery, media, engineering and design of every kind. Ruled by Mars, you bring drive and precision to beauty. To see how this jewel sits in your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are passionate, attractive and a little dramatic — you want a relationship that feels beautiful and alive. Chitra pairs well with <strong>Hasta</strong> and <strong>Swati</strong>, and connects strongly with <strong>Mrigashira</strong> and <strong>Dhanishtha</strong>. A vivid <a href="/synastry">Kundli matching</a> shows where the spark becomes something real.</p>
<h3>The influence of Mars</h3>
<p>Mars rules Chitra, giving the jewel its fire, drive and precision. It turns artistic vision into the energy to build and create. At its best, the Martian force here makes Chitra a master craftsperson — brilliant, bold and able to bring beauty into form.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Chitra nakshatra?', a: 'Mars rules Chitra, giving its artistry and brilliance a strong undercurrent of drive, courage and precision.' },
      { q: 'Which nakshatras are most compatible with Chitra?', a: 'Chitra harmonises with Hasta, Swati, Mrigashira and Dhanishtha. Kundli matching confirms the deeper fit.' },
      { q: 'What careers suit Chitra natives?', a: 'Architecture, fashion, art and photography, jewellery, media and design — creative, visual, detail-rich work.' },
    ],
  },
  {
    slug: 'swati',
    name: 'Swati',
    order: 15,
    lord: 'Rahu',
    deity: 'Vayu (wind god)',
    symbol: 'Young shoot swaying in the wind',
    gana: 'Deva',
    nadi: 'Antya',
    yoni: 'Buffalo',
    signRange: '6deg40 to 20deg00 Libra',
    title: 'Swati Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Swati nakshatra meaning — the independent star of the wind. Explore Swati traits, ruling planet Rahu, career, love and compatibility.',
    keywords: ['swati nakshatra', 'swati traits', 'swati compatibility', 'swati ruling planet', 'swati nakshatra career'],
    html: `
<h2>Swati Nakshatra: the breeze that goes its own way</h2>
<p>Swati is the fifteenth nakshatra, from 6deg40 to 20deg00 of Libra. Its symbol is a young shoot swaying in the wind, and its deity is Vayu, the god of the wind. The name suggests independence and self-direction. Swati is the star of freedom, balance and movement — like the air, it cannot be held and goes wherever it pleases.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Swati you are independent, adaptable and diplomatic. You value your freedom above almost everything and dislike being controlled. You are gentle, fair and skilled at negotiation, bending without breaking like a reed in the wind. The shadow is restlessness or indecision — too much flexibility can leave you ungrounded.</p>
<h3>Career and strengths</h3>
<p>Swati natives thrive in fields that reward independence and balance: business and trade, law and diplomacy, finance, the arts, travel and self-employment. Ruled by Rahu, you have ambition and an unconventional edge. To see how this airy star moves through your chart, <a href="/nakshatra-finder">find your nakshatra</a> and open a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are charming, fair-minded and affectionate, but you need a partner who respects your independence. Swati pairs well with <strong>Chitra</strong> and <strong>Vishakha</strong>, and connects with <strong>Ardra</strong> and <strong>Shatabhisha</strong>. A balanced <a href="/synastry">Kundli matching</a> shows who can give you space and closeness at once.</p>
<h3>The influence of Rahu</h3>
<p>Rahu rules Swati, giving the gentle wind its ambition, originality and hunger for more. It can scatter focus, but it also drives worldly success and fresh thinking. Channelled well, Rahu turns Swati’s freedom into achievement on its own independent terms.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Swati nakshatra?', a: 'Rahu rules Swati, giving its independent, balanced nature a strong streak of ambition and originality.' },
      { q: 'Which nakshatras are most compatible with Swati?', a: 'Swati harmonises with Chitra, Vishakha, Ardra and Shatabhisha. Kundli matching gives the full reading.' },
      { q: 'What careers suit Swati natives?', a: 'Business and trade, law and diplomacy, finance, the arts and travel — fields that reward independence and balance.' },
    ],
  },
  {
    slug: 'vishakha',
    name: 'Vishakha',
    order: 16,
    lord: 'Jupiter',
    deity: 'Indra and Agni (Indragni)',
    symbol: 'Triumphal archway or potter’s wheel',
    gana: 'Rakshasa',
    nadi: 'Adi',
    yoni: 'Tiger',
    signRange: '20deg00 Libra to 3deg20 Scorpio',
    title: 'Vishakha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Vishakha nakshatra meaning — the star of focused ambition and triumph. Explore Vishakha traits, ruling planet Jupiter, career and compatibility.',
    keywords: ['vishakha nakshatra', 'vishakha traits', 'vishakha compatibility', 'vishakha ruling planet', 'vishakha nakshatra career'],
    html: `
<h2>Vishakha Nakshatra: the archway of triumph</h2>
<p>Vishakha is the sixteenth nakshatra, bridging Libra and Scorpio (20deg00 Libra to 3deg20 Scorpio). Its symbol is a triumphal archway, and its deities are Indragni — Indra and Agni together, lightning and fire. The name means forked or two-branched. Vishakha is the star of determined ambition: it sets a goal, gathers tremendous force, and pushes through to victory.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Vishakha you are goal-oriented, energetic and intensely focused. Once you decide what you want, very little stops you. You are determined, competitive and brave. The shadow is impatience or single-mindedness — the same drive that wins can burn bridges or fixate on the prize at any cost.</p>
<h3>Career and strengths</h3>
<p>Vishakha natives excel in ambitious, competitive fields: business and leadership, politics, research, sales, sports and any high-stakes pursuit. Ruled by Jupiter, your ambition is guided by purpose and ethics. To see how this driven star powers your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are passionate and devoted, sometimes treating the relationship itself as a goal to win and protect. Vishakha pairs well with <strong>Swati</strong> and <strong>Anuradha</strong>, and connects with <strong>Punarvasu</strong> and <strong>Purva Ashadha</strong>. A focused <a href="/synastry">Kundli matching</a> shows where your drive meets a true equal.</p>
<h3>The influence of Jupiter</h3>
<p>Jupiter rules Vishakha, giving its fierce ambition wisdom, faith and a sense of higher purpose. It keeps the drive honest and the goals worthy. At its best, Jupiter turns Vishakha’s determination into meaningful triumph — success that serves something larger.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Vishakha nakshatra?', a: 'Jupiter rules Vishakha, giving its intense ambition wisdom, purpose and an ethical sense of direction.' },
      { q: 'Which nakshatras are most compatible with Vishakha?', a: 'Vishakha harmonises with Swati, Anuradha, Punarvasu and Purva Ashadha. Kundli matching confirms the fit.' },
      { q: 'What careers suit Vishakha natives?', a: 'Business and leadership, politics, research, sales and sports — ambitious, competitive, high-stakes pursuits.' },
    ],
  },
  {
    slug: 'anuradha',
    name: 'Anuradha',
    order: 17,
    lord: 'Saturn',
    deity: 'Mitra',
    symbol: 'Lotus or staff',
    gana: 'Deva',
    nadi: 'Madhya',
    yoni: 'Deer',
    signRange: '3deg20 to 16deg40 Scorpio',
    title: 'Anuradha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Anuradha nakshatra meaning — the star of devotion and friendship. Explore Anuradha traits, ruling planet Saturn, career and compatibility.',
    keywords: ['anuradha nakshatra', 'anuradha traits', 'anuradha compatibility', 'anuradha ruling planet', 'anuradha nakshatra career'],
    html: `
<h2>Anuradha Nakshatra: the star of devotion</h2>
<p>Anuradha is the seventeenth nakshatra, from 3deg20 to 16deg40 of Scorpio. Its symbol is a lotus, and its deity is Mitra, the god of friendship, contracts and divine love. The name means following Radha, or success through devotion. Anuradha is the star of loyalty, cooperation and the blossoming of relationships even in difficult ground.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Anuradha you are devoted, disciplined and warm-hearted. You build deep friendships and honour your commitments through thick and thin. There is real emotional depth here, balanced by Saturn’s steadiness — you endure, and you bring others together. The shadow is melancholy or jealousy when devotion is not returned.</p>
<h3>Career and strengths</h3>
<p>Anuradha natives excel in fields built on teamwork, depth and persistence: management, counselling, research, healing, group leadership, organising and work abroad. Ruled by Saturn, you succeed through patience and loyalty. To see how this devoted star anchors your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are profoundly loyal, tender and committed — relationships are where your heart truly lives. Anuradha pairs beautifully with <strong>Vishakha</strong> and <strong>Jyeshtha</strong>, and connects with <strong>Krittika</strong> and <strong>Pushya</strong>. A heartfelt <a href="/synastry">Kundli matching</a> shows where your devotion is matched in kind.</p>
<h3>The influence of Saturn</h3>
<p>Saturn rules Anuradha, giving its warm devotion patience, discipline and endurance. It teaches that the deepest bonds are built slowly and kept faithfully. At its best, Saturn turns Anuradha’s loyalty into a lifelong, lotus-like blossoming through every season.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Anuradha nakshatra?', a: 'Saturn rules Anuradha, giving its devotion and warmth a foundation of patience, discipline and endurance.' },
      { q: 'Which nakshatras are most compatible with Anuradha?', a: 'Anuradha harmonises with Vishakha, Jyeshtha, Krittika and Pushya. Kundli matching gives the full picture.' },
      { q: 'What careers suit Anuradha natives?', a: 'Management, counselling, research, healing and group leadership — fields built on teamwork, depth and persistence.' },
    ],
  },
  {
    slug: 'jyeshtha',
    name: 'Jyeshtha',
    order: 18,
    lord: 'Mercury',
    deity: 'Indra',
    symbol: 'Circular amulet or umbrella',
    gana: 'Rakshasa',
    nadi: 'Antya',
    yoni: 'Deer',
    signRange: '16deg40 to 30deg00 Scorpio',
    title: 'Jyeshtha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Jyeshtha nakshatra meaning — the eldest, the star of seniority and power. Explore Jyeshtha traits, ruling planet Mercury, career and compatibility.',
    keywords: ['jyeshtha nakshatra', 'jyeshtha traits', 'jyeshtha compatibility', 'jyeshtha ruling planet', 'jyeshtha nakshatra career'],
    html: `
<h2>Jyeshtha Nakshatra: the elder’s seat of power</h2>
<p>Jyeshtha is the eighteenth nakshatra, completing Scorpio from 16deg40 to 30deg00. Its symbol is a circular amulet or an umbrella, and its deity is Indra, the king of the gods. The name means the eldest or the chief. Jyeshtha is the star of seniority, hard-won authority and protective power — the responsibility and the burden of being the one in charge.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Jyeshtha you are responsible, capable and quietly powerful. You carry an air of seniority and a strong sense of duty, often shouldering more than your share. You are protective of those you lead and proud of your competence. The shadow is isolation, secrecy or a hidden vulnerability beneath the strong exterior.</p>
<h3>Career and strengths</h3>
<p>Jyeshtha natives excel in positions of authority and protection: management, the military and police, administration, medicine, occult and research, and any role demanding responsibility. Ruled by Mercury, you combine power with sharp intelligence. To see how this commanding star shapes your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are protective, loyal and intense, though you guard your softer feelings carefully. Jyeshtha pairs well with <strong>Anuradha</strong> and <strong>Mula</strong>, and connects with <strong>Ashlesha</strong> and <strong>Revati</strong>. A perceptive <a href="/synastry">Kundli matching</a> shows who can reach the tender heart behind your strength.</p>
<h3>The influence of Mercury</h3>
<p>Mercury rules Jyeshtha, giving the elder’s power a quick, strategic and articulate mind. It sharpens authority into intelligence and adds a gift for words. At its best, Mercury turns Jyeshtha’s burden of leadership into wise, protective and skilful command.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Jyeshtha nakshatra?', a: 'Mercury rules Jyeshtha, giving its seniority and authority a sharp, strategic and articulate intelligence.' },
      { q: 'Which nakshatras are most compatible with Jyeshtha?', a: 'Jyeshtha harmonises with Anuradha, Mula, Ashlesha and Revati. Kundli matching confirms the deeper fit.' },
      { q: 'What careers suit Jyeshtha natives?', a: 'Management, military and police, administration, medicine and research — roles of authority and responsibility.' },
    ],
  },
  {
    slug: 'mula',
    name: 'Mula',
    order: 19,
    lord: 'Ketu',
    deity: 'Nirriti',
    symbol: 'Bunch of tied roots',
    gana: 'Rakshasa',
    nadi: 'Adi',
    yoni: 'Dog',
    signRange: '0deg00 to 13deg20 Sagittarius',
    title: 'Mula Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Mula nakshatra meaning — the root star of deep inquiry and upheaval. Explore Mula traits, ruling planet Ketu, career and compatibility.',
    keywords: ['mula nakshatra', 'mula traits', 'mula compatibility', 'mula ruling planet', 'mula nakshatra career'],
    html: `
<h2>Mula Nakshatra: the search for the root</h2>
<p>Mula is the nineteenth nakshatra, opening Sagittarius from 0deg00 to 13deg20. Its symbol is a bunch of tied roots, and its deity is Nirriti, goddess of dissolution and the depths. The name literally means root. Mula is the star that digs to the very bottom of things — tearing up the surface to find the truth, the cause, the foundation beneath.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Mula you are penetrating, philosophical and fearless about hard questions. You want to understand the root of everything and are not satisfied by easy answers. There is transformative power here and a knack for getting to the bottom of matters. The shadow is destructiveness or extremism — the digging can uproot good things along with the bad.</p>
<h3>Career and strengths</h3>
<p>Mula natives excel in fields of deep inquiry and transformation: research and investigation, medicine and pharmacy, philosophy and spirituality, psychology, and work that confronts crisis or hidden truths. Ruled by Ketu, you have a natural pull toward the profound. To see how this root star anchors your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are intense, honest and transformative — relationships with you go deep or not at all. Mula pairs well with <strong>Jyeshtha</strong> and <strong>Purva Ashadha</strong>, and connects with <strong>Magha</strong> and <strong>Ashwini</strong>. A grounded <a href="/synastry">Kundli matching</a> shows who can meet your depth and steady your storms.</p>
<h3>The influence of Ketu</h3>
<p>Ketu rules Mula, giving it detachment, spiritual hunger and the courage to let things dissolve. It draws you toward truth beyond the material. At its best, Ketu turns Mula’s upheaval into liberation — clearing away the false so the real can take root.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Mula nakshatra?', a: 'Ketu rules Mula, giving it detachment, spiritual depth and a fearless drive to reach the root of things.' },
      { q: 'Which nakshatras are most compatible with Mula?', a: 'Mula harmonises with Jyeshtha, Purva Ashadha, Magha and Ashwini. Kundli matching gives the full reading.' },
      { q: 'What careers suit Mula natives?', a: 'Research and investigation, medicine and pharmacy, philosophy, spirituality and psychology — fields of deep inquiry.' },
    ],
  },
  {
    slug: 'purva-ashadha',
    name: 'Purva Ashadha',
    order: 20,
    lord: 'Venus',
    deity: 'Apah (water deity)',
    symbol: 'Elephant tusk or winnowing basket',
    gana: 'Manushya',
    nadi: 'Madhya',
    yoni: 'Monkey',
    signRange: '13deg20 to 26deg40 Sagittarius',
    title: 'Purva Ashadha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Purva Ashadha nakshatra meaning — the invincible star of early victory. Explore its traits, ruling planet Venus, career and compatibility.',
    keywords: ['purva ashadha nakshatra', 'purva ashadha traits', 'purva ashadha compatibility', 'purva ashadha ruling planet', 'purva ashadha career'],
    html: `
<h2>Purva Ashadha Nakshatra: the unconquered star</h2>
<p>Purva Ashadha is the twentieth nakshatra, spanning 13deg20 to 26deg40 of Sagittarius. Its symbol is an elephant tusk or a winnowing basket, and its deity is Apah, the cosmic waters. The name means the early invincible one or the undefeated. Purva Ashadha carries the unstoppable, cleansing force of water — patient, persuasive and impossible to permanently hold back.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Purva Ashadha you are confident, idealistic and quietly invincible. You have strong convictions and a gift for inspiring and persuading others. There is optimism, ambition and a refreshing, purifying quality to your presence. The shadow is pride or stubbornness — the certainty that fuels you can harden into refusing to bend.</p>
<h3>Career and strengths</h3>
<p>Purva Ashadha natives excel in fields that reward conviction and influence: law and debate, politics, teaching, philosophy, the arts, shipping and water-related trades. Ruled by Venus, you persuade with charm as well as force. To see how this invincible star moves through your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted, idealistic and loyal, with a romantic belief in your partner. Purva Ashadha pairs well with <strong>Mula</strong> and <strong>Uttara Ashadha</strong>, and connects with <strong>Vishakha</strong> and <strong>Revati</strong>. A hopeful <a href="/synastry">Kundli matching</a> shows where your ideals meet a partner who shares them.</p>
<h3>The influence of Venus</h3>
<p>Venus rules Purva Ashadha, softening its invincible force with charm, warmth and a love of beauty. It makes your persuasion gracious and your ambition humane. At its best, Venus turns this star’s unstoppable energy into inspiring, magnetic leadership.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Purva Ashadha nakshatra?', a: 'Venus rules Purva Ashadha, softening its invincible, idealistic drive with charm, warmth and persuasive grace.' },
      { q: 'Which nakshatras are most compatible with Purva Ashadha?', a: 'It harmonises with Mula, Uttara Ashadha, Vishakha and Revati. Kundli matching confirms the full fit.' },
      { q: 'What careers suit Purva Ashadha natives?', a: 'Law and debate, politics, teaching, philosophy and the arts — fields built on conviction, idealism and influence.' },
    ],
  },
  {
    slug: 'uttara-ashadha',
    name: 'Uttara Ashadha',
    order: 21,
    lord: 'Sun',
    deity: 'Vishvadevas (universal gods)',
    symbol: 'Elephant tusk or planks of a bed',
    gana: 'Manushya',
    nadi: 'Antya',
    yoni: 'Mongoose',
    signRange: '26deg40 Sagittarius to 10deg00 Capricorn',
    title: 'Uttara Ashadha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Uttara Ashadha nakshatra meaning — the star of lasting, final victory. Explore its traits, ruling planet Sun, career and compatibility.',
    keywords: ['uttara ashadha nakshatra', 'uttara ashadha traits', 'uttara ashadha compatibility', 'uttara ashadha ruling planet', 'uttara ashadha career'],
    html: `
<h2>Uttara Ashadha Nakshatra: the later, lasting victory</h2>
<p>Uttara Ashadha is the twenty-first nakshatra, bridging Sagittarius and Capricorn (26deg40 Sagittarius to 10deg00 Capricorn). Its symbol is an elephant tusk, and its deities are the Vishvadevas, the universal gods. The name means the later invincible one. Where Purva Ashadha wins the first battle, Uttara Ashadha wins the final, lasting victory — the success that endures because it is built on integrity.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Uttara Ashadha you are principled, patient and persevering. You aim high and you finish what you start, earning respect through honesty and steadiness rather than flash. There is genuine nobility here and a strong moral backbone. The shadow is stubbornness or workaholism — the same persistence can become inflexibility.</p>
<h3>Career and strengths</h3>
<p>Uttara Ashadha natives excel in roles requiring leadership, ethics and the long game: government and law, social reform, management, research, the military and humanitarian work. Ruled by the Sun, you lead with dignity. To see how this enduring star steadies your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted, dependable and serious about commitment — you build a partnership to last. Uttara Ashadha pairs well with <strong>Purva Ashadha</strong> and <strong>Shravana</strong>, and connects with <strong>Uttara Phalguni</strong> and <strong>Rohini</strong>. A steady <a href="/synastry">Kundli matching</a> shows where loyalty and shared values align.</p>
<h3>The influence of the Sun</h3>
<p>The Sun rules Uttara Ashadha, giving it integrity, leadership and a radiant, unwavering purpose. It rewards patience with lasting recognition. At its best, the solar strength here makes you a noble, principled achiever whose victories truly endure.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Uttara Ashadha nakshatra?', a: 'The Sun rules Uttara Ashadha, giving it integrity, leadership, perseverance and a noble, lasting purpose.' },
      { q: 'Which nakshatras are most compatible with Uttara Ashadha?', a: 'It harmonises with Purva Ashadha, Shravana, Uttara Phalguni and Rohini. Kundli matching gives the full picture.' },
      { q: 'What careers suit Uttara Ashadha natives?', a: 'Government and law, social reform, management, research and humanitarian work — roles that reward ethics and persistence.' },
    ],
  },
  {
    slug: 'shravana',
    name: 'Shravana',
    order: 22,
    lord: 'Moon',
    deity: 'Vishnu',
    symbol: 'Ear or three footprints',
    gana: 'Deva',
    nadi: 'Adi',
    yoni: 'Monkey',
    signRange: '10deg00 to 23deg20 Capricorn',
    title: 'Shravana Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Shravana nakshatra meaning — the star of listening and learning. Explore Shravana traits, ruling planet Moon, career and compatibility.',
    keywords: ['shravana nakshatra', 'shravana traits', 'shravana compatibility', 'shravana ruling planet', 'shravana nakshatra career'],
    html: `
<h2>Shravana Nakshatra: the art of listening</h2>
<p>Shravana is the twenty-second nakshatra, from 10deg00 to 23deg20 of Capricorn. Its symbol is an ear, and its deity is Vishnu, the preserver who takes three great strides across the universe. The name means hearing or listening. Shravana is the star of knowledge gained through attentive listening — wisdom that comes from truly hearing the world.</p>
<h3>Personality and traits</h3>
<p>With the Moon in Shravana you are thoughtful, knowledgeable and an exceptional listener. People confide in you because you genuinely pay attention. You value learning, tradition and good counsel, and you have a calm, trustworthy presence. The shadow is over-sensitivity to gossip or criticism — what you hear can affect you more than it should.</p>
<h3>Career and strengths</h3>
<p>Shravana natives excel in fields built on knowledge, communication and counsel: teaching, writing and media, languages, music, counselling, law and advisory roles. Ruled by the Moon, you blend learning with empathy. To see how this listening star shapes your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are attentive, loyal and emotionally present — you listen, and your partner feels heard. Shravana pairs well with <strong>Uttara Ashadha</strong> and <strong>Dhanishtha</strong>, and connects with <strong>Rohini</strong> and <strong>Hasta</strong>. A caring <a href="/synastry">Kundli matching</a> shows where deep understanding can grow.</p>
<h3>The influence of the Moon</h3>
<p>The Moon rules Shravana, giving its love of knowledge a sensitive, intuitive and nurturing heart. It makes you empathetic and emotionally perceptive. At its best, the lunar grace here turns careful listening into wisdom and genuine connection.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Shravana nakshatra?', a: 'The Moon rules Shravana, blending its love of learning and listening with empathy and emotional intuition.' },
      { q: 'Which nakshatras are most compatible with Shravana?', a: 'Shravana harmonises with Uttara Ashadha, Dhanishtha, Rohini and Hasta. Kundli matching confirms the fit.' },
      { q: 'What careers suit Shravana natives?', a: 'Teaching, writing and media, languages, music, counselling and advisory work — fields built on knowledge and listening.' },
    ],
  },
  {
    slug: 'dhanishtha',
    name: 'Dhanishtha',
    order: 23,
    lord: 'Mars',
    deity: 'Eight Vasus',
    symbol: 'Drum or flute',
    gana: 'Rakshasa',
    nadi: 'Madhya',
    yoni: 'Lion',
    signRange: '23deg20 Capricorn to 6deg40 Aquarius',
    title: 'Dhanishtha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Dhanishtha nakshatra meaning — the rhythmic star of wealth and music. Explore Dhanishtha traits, ruling planet Mars, career and compatibility.',
    keywords: ['dhanishtha nakshatra', 'dhanishtha traits', 'dhanishtha compatibility', 'dhanishtha ruling planet', 'dhanishtha career'],
    html: `
<h2>Dhanishtha Nakshatra: the drumbeat of abundance</h2>
<p>Dhanishtha is the twenty-third nakshatra, bridging Capricorn and Aquarius (23deg20 Capricorn to 6deg40 Aquarius). Its symbol is a drum or flute, and its deities are the eight Vasus, gods of the elements and earthly abundance. The name means the wealthiest or most prosperous. Dhanishtha keeps the rhythm of life — musical, prosperous and full of vital energy.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Dhanishtha you are lively, generous and naturally talented, often with a strong feel for music, rhythm and timing. You are ambitious and good at accumulating wealth and status. There is warmth and sociability here. The shadow is materialism or restlessness — the drive for prosperity and recognition can crowd out deeper contentment.</p>
<h3>Career and strengths</h3>
<p>Dhanishtha natives excel in fields that reward rhythm, ambition and resourcefulness: music and performance, business and finance, real estate, sports, the military and group ventures. Ruled by Mars, you bring energy and drive. To see how this prosperous star powers your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are warm, generous and sociable, though you sometimes prize independence and status. Dhanishtha pairs well with <strong>Shravana</strong> and <strong>Shatabhisha</strong>, and connects with <strong>Mrigashira</strong> and <strong>Chitra</strong>. A balanced <a href="/synastry">Kundli matching</a> shows where prosperity and affection move in rhythm.</p>
<h3>The influence of Mars</h3>
<p>Mars rules Dhanishtha, giving its musical, prosperous nature drive, courage and competitive fire. It turns talent into achievement and ambition into momentum. At its best, the Martian energy here makes Dhanishtha a generous, dynamic force that creates abundance for many.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Dhanishtha nakshatra?', a: 'Mars rules Dhanishtha, giving its musical, prosperous nature strong drive, courage and competitive energy.' },
      { q: 'Which nakshatras are most compatible with Dhanishtha?', a: 'Dhanishtha harmonises with Shravana, Shatabhisha, Mrigashira and Chitra. Kundli matching gives the full reading.' },
      { q: 'What careers suit Dhanishtha natives?', a: 'Music and performance, business and finance, real estate, sports and the military — fields rewarding rhythm and ambition.' },
    ],
  },
  {
    slug: 'shatabhisha',
    name: 'Shatabhisha',
    order: 24,
    lord: 'Rahu',
    deity: 'Varuna',
    symbol: 'Empty circle or hundred healers',
    gana: 'Rakshasa',
    nadi: 'Antya',
    yoni: 'Horse',
    signRange: '6deg40 to 20deg00 Aquarius',
    title: 'Shatabhisha Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Shatabhisha nakshatra meaning — the star of a hundred healers and mysteries. Explore its traits, ruling planet Rahu, career and compatibility.',
    keywords: ['shatabhisha nakshatra', 'shatabhisha traits', 'shatabhisha compatibility', 'shatabhisha ruling planet', 'shatabhisha career'],
    html: `
<h2>Shatabhisha Nakshatra: the circle of a hundred healers</h2>
<p>Shatabhisha is the twenty-fourth nakshatra, from 6deg40 to 20deg00 of Aquarius. Its symbol is an empty circle, and its deity is Varuna, lord of the cosmic waters and hidden laws. The name means a hundred healers or a hundred medicines. Shatabhisha is the star of healing, mystery and solitude — a veiled, scientific mind drawn to what lies beneath the surface.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Shatabhisha you are independent, secretive and deeply curious. You value your privacy and think for yourself, often arriving at unconventional conclusions. There is a healing gift here and a fascination with mysteries, both scientific and mystical. The shadow is isolation or stubbornness — the same self-reliance can become a wall.</p>
<h3>Career and strengths</h3>
<p>Shatabhisha natives excel in fields of healing, research and the hidden: medicine and alternative healing, science and technology, astrology, research, aviation and electricity. Ruled by Rahu, you are drawn to the cutting edge. To see how this mysterious star shapes your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are loyal but private, needing space and a partner who respects your independence. Shatabhisha pairs well with <strong>Dhanishtha</strong> and <strong>Purva Bhadrapada</strong>, and connects with <strong>Ashwini</strong> and <strong>Swati</strong>. A perceptive <a href="/synastry">Kundli matching</a> shows who can share your solitude without feeling shut out.</p>
<h3>The influence of Rahu</h3>
<p>Rahu rules Shatabhisha, giving it originality, scientific brilliance and a pull toward the unconventional and the unseen. It can deepen secrecy, but it also drives discovery and reform. Channelled well, Rahu turns Shatabhisha’s mysteries into healing and innovation.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Shatabhisha nakshatra?', a: 'Rahu rules Shatabhisha, giving it originality, scientific insight and a fascination with healing and the unseen.' },
      { q: 'Which nakshatras are most compatible with Shatabhisha?', a: 'Shatabhisha harmonises with Dhanishtha, Purva Bhadrapada, Ashwini and Swati. Kundli matching confirms the fit.' },
      { q: 'What careers suit Shatabhisha natives?', a: 'Medicine and alternative healing, science and technology, astrology, research and aviation — fields of healing and discovery.' },
    ],
  },
  {
    slug: 'purva-bhadrapada',
    name: 'Purva Bhadrapada',
    order: 25,
    lord: 'Jupiter',
    deity: 'Aja Ekapada',
    symbol: 'Front legs of a funeral cot or a sword',
    gana: 'Manushya',
    nadi: 'Adi',
    yoni: 'Lion',
    signRange: '20deg00 Aquarius to 3deg20 Pisces',
    title: 'Purva Bhadrapada Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Purva Bhadrapada nakshatra meaning — the intense star of fiery idealism. Explore its traits, ruling planet Jupiter, career and compatibility.',
    keywords: ['purva bhadrapada nakshatra', 'purva bhadrapada traits', 'purva bhadrapada compatibility', 'purva bhadrapada ruling planet', 'purva bhadrapada career'],
    html: `
<h2>Purva Bhadrapada Nakshatra: the fire of conviction</h2>
<p>Purva Bhadrapada is the twenty-fifth nakshatra, bridging Aquarius and Pisces (20deg00 Aquarius to 3deg20 Pisces). Its symbol is the front legs of a funeral cot or a two-faced figure, and its deity is Aja Ekapada, the one-footed goat, a fiery form of cosmic fire. The name means the former blessed feet. This is a star of intense idealism, transformation and burning conviction.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Purva Bhadrapada you are passionate, idealistic and intensely principled. You feel things deeply and care about big questions of meaning, justice and the beyond. There is visionary fire here and a willingness to sacrifice for your beliefs. The shadow is extremism, anxiety or a dark, pessimistic streak when that fire turns inward.</p>
<h3>Career and strengths</h3>
<p>Purva Bhadrapada natives excel in fields that engage conviction and depth: spirituality and the occult, research, finance, medicine, social reform, teaching and the priesthood. Ruled by Jupiter, your intensity is steered toward higher purpose. To see how this fiery star moves through your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted and intense, giving yourself fully to a partner who shares your ideals. Purva Bhadrapada pairs well with <strong>Shatabhisha</strong> and <strong>Uttara Bhadrapada</strong>, and connects with <strong>Punarvasu</strong> and <strong>Revati</strong>. A thoughtful <a href="/synastry">Kundli matching</a> shows who can hold your depth and ground your fire.</p>
<h3>The influence of Jupiter</h3>
<p>Jupiter rules Purva Bhadrapada, giving its fiery intensity wisdom, faith and a longing for the transcendent. It channels passion toward philosophy and spirit. At its best, Jupiter turns this star’s burning idealism into visionary, soul-deep purpose.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Purva Bhadrapada nakshatra?', a: 'Jupiter rules Purva Bhadrapada, giving its fiery idealism wisdom, faith and a strong spiritual orientation.' },
      { q: 'Which nakshatras are most compatible with Purva Bhadrapada?', a: 'It harmonises with Shatabhisha, Uttara Bhadrapada, Punarvasu and Revati. Kundli matching gives the full picture.' },
      { q: 'What careers suit Purva Bhadrapada natives?', a: 'Spirituality and the occult, research, finance, medicine and social reform — fields that engage deep conviction.' },
    ],
  },
  {
    slug: 'uttara-bhadrapada',
    name: 'Uttara Bhadrapada',
    order: 26,
    lord: 'Saturn',
    deity: 'Ahir Budhnya',
    symbol: 'Back legs of a funeral cot or twins',
    gana: 'Manushya',
    nadi: 'Madhya',
    yoni: 'Cow',
    signRange: '3deg20 to 16deg40 Pisces',
    title: 'Uttara Bhadrapada Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Uttara Bhadrapada nakshatra meaning — the serene star of deep wisdom. Explore its traits, ruling planet Saturn, career and compatibility.',
    keywords: ['uttara bhadrapada nakshatra', 'uttara bhadrapada traits', 'uttara bhadrapada compatibility', 'uttara bhadrapada ruling planet', 'uttara bhadrapada career'],
    html: `
<h2>Uttara Bhadrapada Nakshatra: the calm depths of wisdom</h2>
<p>Uttara Bhadrapada is the twenty-sixth nakshatra, from 3deg20 to 16deg40 of Pisces. Its symbol is the back legs of a funeral cot, and its deity is Ahir Budhnya, the serpent of the deep ocean floor. The name means the latter blessed feet. Where its sister star burns with fire, Uttara Bhadrapada settles into still, deep water — patient, wise and quietly profound.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Uttara Bhadrapada you are calm, compassionate and deeply wise. You carry a serene inner stability that others find reassuring, and a gift for seeing situations clearly without drama. There is spiritual depth and genuine kindness here. The shadow is detachment or passivity — your calm can shade into withdrawal or indecision.</p>
<h3>Career and strengths</h3>
<p>Uttara Bhadrapada natives excel in fields that value wisdom, patience and service: counselling and therapy, spirituality and teaching, writing, research, healing and charitable work. Ruled by Saturn, you bring discipline to compassion. To see how this serene star anchors your chart, <a href="/nakshatra-finder">find your nakshatra</a> and read a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are gentle, loyal and emotionally steady — a calm harbour for your partner. Uttara Bhadrapada pairs well with <strong>Purva Bhadrapada</strong> and <strong>Revati</strong>, and connects with <strong>Pushya</strong> and <strong>Anuradha</strong>. A tender <a href="/synastry">Kundli matching</a> shows where quiet devotion can deepen over time.</p>
<h3>The influence of Saturn</h3>
<p>Saturn rules Uttara Bhadrapada, giving its compassion patience, depth and lasting discipline. It grounds spiritual wisdom in steady, dependable service. At its best, Saturn turns this star’s calm into a deep, oceanic strength that endures any storm.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Uttara Bhadrapada nakshatra?', a: 'Saturn rules Uttara Bhadrapada, giving its calm compassion patience, discipline and lasting inner depth.' },
      { q: 'Which nakshatras are most compatible with Uttara Bhadrapada?', a: 'It harmonises with Purva Bhadrapada, Revati, Pushya and Anuradha. Kundli matching confirms the fit.' },
      { q: 'What careers suit Uttara Bhadrapada natives?', a: 'Counselling and therapy, spirituality and teaching, writing, research and healing — fields that value wisdom and service.' },
    ],
  },
  {
    slug: 'revati',
    name: 'Revati',
    order: 27,
    lord: 'Mercury',
    deity: 'Pushan',
    symbol: 'Fish or a pair of fish',
    gana: 'Deva',
    nadi: 'Antya',
    yoni: 'Elephant',
    signRange: '16deg40 to 30deg00 Pisces',
    title: 'Revati Nakshatra: Traits, Ruling Planet & Compatibility',
    description: 'Revati nakshatra meaning — the nourishing star that guides souls home. Explore Revati traits, ruling planet Mercury, career and compatibility.',
    keywords: ['revati nakshatra', 'revati traits', 'revati compatibility', 'revati ruling planet', 'revati nakshatra career'],
    html: `
<h2>Revati Nakshatra: the gentle guide to safe harbour</h2>
<p>Revati is the twenty-seventh and final nakshatra, completing Pisces and the zodiac from 16deg40 to 30deg00. Its symbol is a fish, and its deity is Pushan, the nourishing shepherd who guides travellers and souls safely to their destination. The name means the wealthy or prosperous. As the last star, Revati carries the gentle, compassionate wisdom of a journey complete.</p>
<h3>Personality and traits</h3>
<p>If your Moon is in Revati you are kind, gentle and deeply compassionate. You care for others instinctively and have a soothing, protective presence — people and animals trust you. There is creativity, spirituality and an angelic sweetness here. The shadow is over-sensitivity or self-sacrifice — you can give until there is little left for yourself.</p>
<h3>Career and strengths</h3>
<p>Revati natives excel in nurturing and creative fields: healing and medicine, animal care, spirituality and teaching, the arts and music, travel and hospitality, and charitable work. Ruled by Mercury, you communicate with warmth and imagination. To see how this gentle star completes your chart, <a href="/nakshatra-finder">find your nakshatra</a> and explore a full <a href="/free-kundli">free Kundli</a>.</p>
<h3>Love and compatibility</h3>
<p>In love you are devoted, tender and selfless — a nurturing, deeply caring partner. Revati pairs beautifully with <strong>Uttara Bhadrapada</strong> and <strong>Ashwini</strong>, and connects with <strong>Bharani</strong> and <strong>Pushya</strong>. A loving <a href="/synastry">Kundli matching</a> shows who will cherish your gentle heart and care for you in return.</p>
<h3>The influence of Mercury</h3>
<p>Mercury rules Revati, giving its compassion a quick, imaginative and articulate mind. It helps you express care through words, art and guidance. At its best, Mercury turns Revati’s gentleness into wise, nurturing communication that helps others find their way.</p>
`,
    faqs: [
      { q: 'What is the ruling planet of Revati nakshatra?', a: 'Mercury rules Revati, giving its gentle compassion a quick, imaginative and articulate mind.' },
      { q: 'Which nakshatras are most compatible with Revati?', a: 'Revati harmonises with Uttara Bhadrapada, Ashwini, Bharani and Pushya. Kundli matching gives the full reading.' },
      { q: 'What careers suit Revati natives?', a: 'Healing and medicine, animal care, spirituality, the arts, travel and charitable work — nurturing, creative roles.' },
    ],
  },
];

export function getNakshatra(slug: string): Nakshatra | undefined {
  return NAKSHATRAS.find((n) => n.slug === slug);
}
