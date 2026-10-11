import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: 'choghadiya-guide',
  title: 'Choghadiya: The Seven Names, the Weekday Table, and How to Use Them',
  seoTitle: 'Choghadiya: Names, Weekday Table and Meaning',
  description:
    'Choghadiya splits the day into eight slots of about 90 minutes. Which are good (Amrit, Shubh, Labh), which to avoid, and the day table by weekday.',
  keywords: [
    'choghadiya',
    'choghadiya today',
    'choghadiya meaning',
    'amrit choghadiya',
    'shubh choghadiya',
    'day choghadiya table',
    'good and bad time in choghadiya',
  ],
  date: '2026-06-15',
  updated: '2026-10-11',
  readingTimeMin: 6,
  html: `<p><strong>Choghadiya splits the daylight (and the night) into eight slots of about 90 minutes, each with one of seven names. Amrit, Shubh and Labh are considered good, Chal is neutral and suits travel, and Udveg, Kaal and Rog are the ones to avoid for new starts. Which name opens the day depends on the weekday.</strong></p>

<p>It is a folk-level tool, the kind a family checks before leaving for a trip or signing something. It does not use your chart, only the weekday and the local sunrise, so it is the same for everyone in the same city. For a personal read, see the last section.</p>

<h2>The word and the slot length</h2>

<p>Choghadiya comes from chau (four) and ghadi, an old unit of about 24 minutes. Four ghadis is roughly 96 minutes. In practice each slot is one eighth of the time between sunrise and sunset (or sunset and the next sunrise), so the clock times shift with the season and the city.</p>

<h2>The seven names</h2>

<table>
<thead><tr><th>Name</th><th>Planet</th><th>Quality</th><th>Usual advice</th></tr></thead>
<tbody>
<tr><td>Amrit</td><td>Moon</td><td>Best</td><td>Good for almost any start: work, travel, conversations</td></tr>
<tr><td>Shubh</td><td>Jupiter</td><td>Good</td><td>Ceremonies, study, anything meaningful</td></tr>
<tr><td>Labh</td><td>Mercury</td><td>Good</td><td>Trade, deals, learning, anything where you want a return</td></tr>
<tr><td>Chal (Char)</td><td>Venus</td><td>Neutral</td><td>Travel and routine tasks</td></tr>
<tr><td>Udveg</td><td>Sun</td><td>Avoid</td><td>Restless time. Some people use it for dealing with officials.</td></tr>
<tr><td>Kaal</td><td>Saturn</td><td>Avoid</td><td>The least favoured for beginnings and signings</td></tr>
<tr><td>Rog</td><td>Mars</td><td>Avoid</td><td>Not for peaceful starts. Some use it when you need force on your side.</td></tr>
</tbody>
</table>

<h2>The day table by weekday</h2>

<p>Each weekday opens with the slot of its own planet (Sunday with Udveg, Monday with Amrit, Tuesday with Rog, Wednesday with Labh, Thursday with Shubh, Friday with Chal, Saturday with Kaal) and then runs through a fixed cycle. The eighth slot repeats the first. From sunrise, in order:</p>

<table>
<thead><tr><th>Day</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th></tr></thead>
<tbody>
<tr><td>Sunday</td><td>Udveg</td><td>Chal</td><td>Labh</td><td>Amrit</td><td>Kaal</td><td>Shubh</td><td>Rog</td><td>Udveg</td></tr>
<tr><td>Monday</td><td>Amrit</td><td>Kaal</td><td>Shubh</td><td>Rog</td><td>Udveg</td><td>Chal</td><td>Labh</td><td>Amrit</td></tr>
<tr><td>Tuesday</td><td>Rog</td><td>Udveg</td><td>Chal</td><td>Labh</td><td>Amrit</td><td>Kaal</td><td>Shubh</td><td>Rog</td></tr>
<tr><td>Wednesday</td><td>Labh</td><td>Amrit</td><td>Kaal</td><td>Shubh</td><td>Rog</td><td>Udveg</td><td>Chal</td><td>Labh</td></tr>
<tr><td>Thursday</td><td>Shubh</td><td>Rog</td><td>Udveg</td><td>Chal</td><td>Labh</td><td>Amrit</td><td>Kaal</td><td>Shubh</td></tr>
<tr><td>Friday</td><td>Chal</td><td>Labh</td><td>Amrit</td><td>Kaal</td><td>Shubh</td><td>Rog</td><td>Udveg</td><td>Chal</td></tr>
<tr><td>Saturday</td><td>Kaal</td><td>Shubh</td><td>Rog</td><td>Udveg</td><td>Chal</td><td>Labh</td><td>Amrit</td><td>Kaal</td></tr>
</tbody>
</table>

<p>To get clock times, take sunrise and add (slot number minus one) times one eighth of the daylight. On Sunday 11 October 2026 in Delhi, with sunrise about 6:20 am and sunset about 5:56 pm, one slot is about 87 minutes, so Udveg runs to about 7:47 am, Chal to 9:14 am, Labh to 10:41 am and Amrit to 12:08 pm. Night choghadiya uses the same seven names in a different order, starting from a different planet, so use a panchang for it.</p>

<h2>Choghadiya and Rahu Kaal</h2>

<p>The two overlap on the clock. A slot can be Amrit and still sit inside <a href="/blog/rahu-kaal-explained">Rahu Kaal</a>. Traditions differ on which wins, so the simple approach is to pick a slot that passes both checks.</p>

<h2>How much weight to give it</h2>

<ul>
<li>It is a convenience tool for small decisions. Do not move a wedding or a surgery date for it.</li>
<li>It sits next to the <a href="/blog/hora-planetary-hours-guide">planetary hour (hora)</a>, a different system with a different count. They do not always agree, and the <a href="/blog/choghadiya-vs-hora-timing">comparison of choghadiya and hora</a> explains why.</li>
<li>It is the same for everyone in your city, so it cannot know your chart. A slot that is poor for the weekday may be fine for you, and the reverse.</li>
</ul>

<p>That last point is where VedicHour does something different. The forecast scores each hour of your day against your own chart and dasha, using choghadiya and hora as two of the inputs. The <a href="/sample-report">sample report</a> shows a full day.</p>`,
  faqs: [
    {
      q: 'What is Choghadiya?',
      a: 'A system that divides the day and night into eight slots each, about 90 minutes long, named Amrit, Shubh, Labh, Chal, Udveg, Kaal and Rog. The first slot of the day depends on the weekday.',
    },
    {
      q: 'Which Choghadiya is the best?',
      a: 'Amrit is considered the best, followed by Shubh and Labh. Chal is neutral and suits travel.',
    },
    {
      q: 'Which Choghadiya should I avoid?',
      a: 'Udveg, Kaal and Rog, for new beginnings. Some traditions allow Udveg for dealing with officials and Rog when force is needed.',
    },
    {
      q: 'What is the first Choghadiya on Monday?',
      a: 'Amrit. Monday opens with Amrit, then Kaal, Shubh, Rog, Udveg, Chal, Labh and Amrit again.',
    },
    {
      q: 'Is Choghadiya the same as hora?',
      a: 'No. Hora divides the day into 12 planetary hours of unequal length counted from sunrise, while Choghadiya uses eight equal slots with different names. The two can disagree.',
    },
  ],
  sources: [
    'Weekday order of the day choghadiya: standard panchang practice',
    'Delhi example: sunrise and sunset from the Swiss Ephemeris for 11 October 2026',
  ],
};
