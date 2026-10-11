import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: 'panchang-explained-beginners',
  title: 'The Panchang Explained: Tithi, Nakshatra, Yoga, Karana and Vara',
  seoTitle: 'The Panchang Explained: Tithi, Nakshatra, Yoga',
  description:
    'A panchang has five parts: vara, tithi, nakshatra, yoga and karana. How each is calculated from the Sun and Moon, with a worked example for 11 October 2026.',
  keywords: [
    'panchang',
    'what is panchang',
    'tithi nakshatra yoga karana',
    'daily panchang',
    'panchang kaise dekhe',
    'five limbs of panchang',
    'tithi calculation',
  ],
  date: '2026-06-15',
  updated: '2026-10-11',
  readingTimeMin: 6,
  html: `<p><strong>The panchang ("five limbs") is the Hindu almanac. Its five parts are the vara (weekday), the tithi (lunar day), the nakshatra (the Moon's star), the yoga (a combination of the Sun's and Moon's positions) and the karana (half a tithi). Four of the five come from the positions of the Sun and Moon, so you can calculate a panchang for any place and time.</strong></p>

<p>It is the base layer for most Hindu timing: festivals, fasting days, and the muhurta for weddings and house-warmings. Rahu Kaal, choghadiya and hora sit on top of it. Everything below is counted at sunrise, because the Hindu day runs from sunrise to sunrise.</p>

<h2>The five parts, one by one</h2>

<h3>1. Vara: the weekday</h3>
<p>Each weekday has a ruling planet: Sunday the Sun (Ravi), Monday the Moon (Soma), Tuesday Mars (Mangal), Wednesday Mercury (Budha), Thursday Jupiter (Guru), Friday Venus (Shukra), Saturday Saturn (Shani). The planet gives the day its general character and its first choghadiya and hora.</p>

<h3>2. Tithi: the lunar day</h3>
<p>A tithi is the time the Moon takes to gain 12 degrees on the Sun. Thirty tithis make a lunar month: fifteen in the bright half (Shukla paksha, from new moon to full moon) and fifteen in the dark half (Krishna paksha). They are named Pratipada, Dwitiya, Tritiya and so on up to Chaturdashi, then Purnima (full moon) or Amavasya (new moon). Because the Moon's speed varies, a tithi can be about 19 to 27 hours long, and can start or end at any time of day. The tithi in force at sunrise names the day.</p>

<h3>3. Nakshatra: the Moon's star</h3>
<p>The nakshatra is the one of 27 divisions of the zodiac that holds the Moon, each 13 degrees 20 minutes wide. See the <a href="/blog/nakshatra-birth-star-guide">full nakshatra table</a>. The Moon spends about a day in each.</p>

<h3>4. Yoga: the Sun-plus-Moon sum</h3>
<p>Add the longitudes of the Sun and the Moon and divide by 13 degrees 20 minutes. The result picks one of 27 yogas: Vishkambha, Priti, Ayushman, Saubhagya, Shobhana, Atiganda, Sukarma, Dhriti, Shula, Ganda, Vriddhi, Dhruva, Vyaghata, Harshana, Vajra, Siddhi, Vyatipata, Variyana, Parigha, Shiva, Siddha, Sadhya, Shubha, Shukla, Brahma, Indra and Vaidhriti. Tradition marks some, such as Vyatipata and Vaidhriti, as unfavourable for starts.</p>

<h3>5. Karana: half a tithi</h3>
<p>A karana is half a tithi, 6 degrees of Moon-Sun distance. There are 60 in a lunar month and 11 names. Seven repeat in a cycle: Bava, Balava, Kaulava, Taitila, Gara, Vanija and Vishti (also called Bhadra, the one traditionally avoided for starts). Four occur once a month at fixed points: Shakuni, Chatushpada, Naga and Kimstughna.</p>

<h2>A worked example</h2>

<p>On Sunday 11 October 2026 at sunrise in Delhi (about 6:19 am), calculated with the Swiss Ephemeris in the Lahiri zodiac:</p>

<table>
<thead><tr><th>Part</th><th>Value</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Vara</td><td>Sunday (Ravi)</td><td>Ruled by the Sun</td></tr>
<tr><td>Tithi</td><td>Shukla Pratipada</td><td>The Moon is 4.5 degrees ahead of the Sun, in the first 12</td></tr>
<tr><td>Nakshatra</td><td>Chitra, pada 2</td><td>The Moon is at 27 degrees 59 minutes of Virgo</td></tr>
<tr><td>Yoga</td><td>Vaidhriti</td><td>Sun plus Moon is in the 27th band</td></tr>
<tr><td>Karana</td><td>Kimstughna</td><td>The first half of the first tithi</td></tr>
</tbody>
</table>

<p>Other printed panchangs may differ in the last minutes of a boundary because of rounding and ayanamsa choice. Always check the "ends at" time given with each part, since a tithi or nakshatra can change during the day.</p>

<h2>How people use it</h2>

<ul>
<li><strong>Festivals and fasts</strong> are set by the tithi at sunrise or at a given time, such as moonrise for Karwa Chauth.</li>
<li><strong>Muhurta</strong> checks all five parts, plus the weekday-based windows like <a href="/blog/rahu-kaal-explained">Rahu Kaal</a> and <a href="/blog/choghadiya-guide">choghadiya</a>. A full list of what goes into an auspicious time is in <a href="/blog/what-is-muhurat">what is muhurat</a>.</li>
<li><strong>Daily practice.</strong> Many families read the panchang each morning to know the day's tithi and any fast or festival.</li>
</ul>

<p>A panchang is the same for everyone in the same city. A birth chart is personal. That is why a general muhurta tells you when the day is generally good, and a chart-based forecast tells you when it is good for you. The <a href="/muhurat">muhurat page</a> explains how the two fit together.</p>`,
  faqs: [
    {
      q: 'What are the five parts of a panchang?',
      a: 'Vara (weekday), tithi (lunar day), nakshatra (the Moon\'s star), yoga (a sum of the Sun and Moon longitudes) and karana (half a tithi).',
    },
    {
      q: 'How is a tithi calculated?',
      a: 'It is the time the Moon takes to move 12 degrees ahead of the Sun. There are 30 in a lunar month, 15 in each half.',
    },
    {
      q: 'Why does the tithi change during the day?',
      a: 'Tithis are tied to the Moon and Sun, not to sunrise, so they can begin and end at any hour and range from about 19 to 27 hours. The one in force at sunrise names the day.',
    },
    {
      q: 'How many yogas and karanas are there?',
      a: 'Twenty-seven yogas and eleven karanas (seven that repeat and four fixed ones).',
    },
    {
      q: 'Is the panchang the same everywhere?',
      a: 'The tithi, nakshatra, yoga and karana are the same at the same instant everywhere, but the day they are assigned to depends on local sunrise. So the daily panchang differs by city.',
    },
  ],
  sources: [
    'Five limbs and their definitions: standard panchang (Surya Siddhanta tradition and modern drik methods)',
    'Worked example: Swiss Ephemeris, Lahiri ayanamsa, Delhi sunrise on 11 October 2026',
  ],
};
