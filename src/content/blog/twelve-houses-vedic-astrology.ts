import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: 'twelve-houses-vedic-astrology',
  title: 'The 12 Houses (Bhavas) in Vedic Astrology: What Each Covers and Which Planet Rules It',
  seoTitle: 'The 12 Houses (Bhavas) Explained Simply',
  description:
    'What each of the 12 Vedic houses covers, its natural significator planet, the groups (kendra, trikona, dusthana, upachaya), and a way to read them.',
  keywords: [
    '12 houses vedic astrology',
    'bhavas',
    'houses in kundli',
    '7th house marriage',
    '10th house career',
    'kendra trikona dusthana',
    'natural karaka of houses',
  ],
  date: '2026-06-15',
  updated: '2026-10-11',
  readingTimeMin: 6,
  html: `<p><strong>A Vedic birth chart has twelve houses (bhavas), counted from the Lagna (ascendant) as the 1st. Each covers an area of life, has a natural significator planet (karaka), and belongs to groups such as kendra (angles), trikona (trines), dusthana (6, 8, 12) and upachaya (3, 6, 10, 11). To read a topic, find its house, then see which planet sits in it and which planet rules it.</strong></p>

<p>Find your Lagna with the <a href="/lagna-calculator">Lagna calculator</a>, or open the <a href="/free-kundli">free Kundli</a> to see your houses filled in.</p>

<h2>The 12 houses at a glance</h2>

<table>
<thead><tr><th>House</th><th>Sanskrit</th><th>Covers</th><th>Natural significator</th></tr></thead>
<tbody>
<tr><td>1</td><td>Tanu</td><td>Self, body, temperament, vitality</td><td>Sun</td></tr>
<tr><td>2</td><td>Dhana</td><td>Money, family, speech, food</td><td>Jupiter</td></tr>
<tr><td>3</td><td>Sahaja</td><td>Effort, courage, siblings, skills, short trips</td><td>Mars</td></tr>
<tr><td>4</td><td>Sukha</td><td>Home, mother, property, peace of mind</td><td>Moon</td></tr>
<tr><td>5</td><td>Putra</td><td>Children, study, creativity, romance</td><td>Jupiter</td></tr>
<tr><td>6</td><td>Ripu</td><td>Daily work, debts, health habits, rivals</td><td>Mars, Saturn</td></tr>
<tr><td>7</td><td>Jaya</td><td>Marriage, partners, open dealings</td><td>Venus</td></tr>
<tr><td>8</td><td>Ayu</td><td>Sudden change, shared money, research, longevity</td><td>Saturn</td></tr>
<tr><td>9</td><td>Dharma</td><td>Luck, teachers, belief, long journeys, father</td><td>Jupiter, Sun</td></tr>
<tr><td>10</td><td>Karma</td><td>Career, status, public role</td><td>Mercury, Sun, Jupiter, Saturn</td></tr>
<tr><td>11</td><td>Labha</td><td>Gains, friends, long-term goals</td><td>Jupiter</td></tr>
<tr><td>12</td><td>Vyaya</td><td>Expenses, sleep, solitude, foreign places, liberation</td><td>Saturn</td></tr>
</tbody>
</table>

<h2>The groups that matter</h2>

<ul>
<li><strong>Kendra (1, 4, 7, 10):</strong> the angles. Strength and action. Planets here are the most visible.</li>
<li><strong>Trikona (1, 5, 9):</strong> the trines. Fortune and merit. Their lords are considered the most helpful planets in a chart.</li>
<li><strong>Dusthana (6, 8, 12):</strong> houses of difficulty and change. They are also where growth through effort happens, so "difficult" does not mean "bad".</li>
<li><strong>Upachaya (3, 6, 10, 11):</strong> houses that improve with time. Mars, Saturn and Rahu are said to do well here.</li>
</ul>

<h2>How to read a house in four moves</h2>

<ol>
<li><strong>Pick the topic.</strong> Career is the 10th, marriage the 7th, children the 5th, money the 2nd and 11th.</li>
<li><strong>See what sits in the house.</strong> Planets in the house colour the topic with their own nature.</li>
<li><strong>Find the house lord.</strong> The planet that rules the sign on the house shows where the topic is "managed" from. The 10th lord in the 7th house, for example, links career and partnership.</li>
<li><strong>Add timing.</strong> Check the planets' dasha periods with the <a href="/vimshottari-dasha-calculator">dasha calculator</a>, because a house comes alive mainly when the planets connected to it run.</li>
</ol>

<h2>Some houses people ask about</h2>

<ul>
<li><strong>7th house.</strong> Marriage and partnerships, and also business partners. <a href="/blog/manglik-dosha-marriage">Manglik dosha</a> is judged largely by Mars's relationship to this house.</li>
<li><strong>10th house.</strong> Career. See <a href="/blog/career-astrology-10th-house">career astrology and the 10th house</a>.</li>
<li><strong>8th house.</strong> The house people fear without cause. It covers sudden change, inheritance, shared money and research.</li>
<li><strong>12th house.</strong> Expenses and sleep, but also retreat, foreign stays and spiritual practice.</li>
</ul>

<p>In a North Indian chart the houses are fixed in position; in a South Indian chart the signs are. Either way, the 1st house is the Lagna. For a full walk-through, see <a href="/blog/how-to-read-kundli">how to read your Kundli</a>.</p>`,
  faqs: [
    {
      q: 'How many houses are there in a Vedic chart?',
      a: 'Twelve. Each covers an area of life and is counted from the Lagna (ascendant) as the 1st house.',
    },
    {
      q: 'What are kendra and trikona houses?',
      a: 'Kendra houses (1, 4, 7, 10) are the angles and stand for action and stability. Trikona houses (1, 5, 9) are the trines and stand for fortune and merit.',
    },
    {
      q: 'Which house is for career?',
      a: 'The 10th. Look at the planets in it, its lord and the dasha running.',
    },
    {
      q: 'Which house is for marriage?',
      a: 'The 7th, with Venus as the natural significator.',
    },
    {
      q: 'Are the 6th, 8th and 12th houses bad?',
      a: 'They are called dusthana (houses of difficulty), but they also cover work, research and retreat. Many strong charts rely on them.',
    },
  ],
  sources: [
    'House significations and natural karakas: Brihat Parashara Hora Shastra and standard Jyotish manuals',
    'Kendra, trikona, dusthana and upachaya groups: standard classical definitions',
  ],
};
