import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: 'hora-planetary-hours-guide',
  title: 'Planetary Hours (Hora): The Weekday Table and Which Hour Suits What',
  seoTitle: 'Planetary Hours (Hora): Table and Which Hour for What',
  description:
    'Calculate sunrise-based planetary hours, read the weekday table, and distinguish variable horas from VedicHour\'s fixed 60-minute example windows.',
  keywords: [
    'hora',
    'planetary hours',
    'hora timing',
    'hora table by weekday',
    'what is hora in astrology',
    'jupiter hora',
    'best hora for money',
    'hora calculator',
  ],
  date: '2026-06-15',
  updated: '2026-10-15',
  readingTimeMin: 6,
  html: `<p><strong>A hora is a planetary hour. Daylight from sunrise to sunset is divided into 12 equal horas and the night from sunset to the next sunrise into 12 more. Each has a traditional ruler in the repeating order Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars. The first daytime hora belongs to the weekday ruler. A hora's duration depends on those sunrise and sunset times: it is not a fixed 60-minute clock hour.</strong></p>

<p>A city-wide hora table needs the date, location, sunrise, sunset and next sunrise, not a birth chart. Its traditional associations are a different layer from a personal chart or VedicHour's fixed clock-hour display.</p>

<h2>How to calculate it</h2>

<ol>
<li>Find sunrise, sunset and the following sunrise for your location and date. Check the timezone and the sunrise definition used by the source.</li>
<li>Daytime hora length is (sunset minus sunrise) divided by 12. The first hora starts at sunrise.</li>
<li>The first hora belongs to the weekday ruler. After that, follow the cycle: Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars, then back to Sun.</li>
<li>Night horas are (next sunrise minus sunset) divided by 12, and continue the same cycle without a break.</li>
</ol>

<p>Use elapsed durations, not just clock-label subtraction across midnight or a clock change. If the location has no sunrise or sunset for the date, this division needs special handling; do not fill in convenient times and call them calculated.</p>

<h2>A worked example with invented times</h2>

<p><strong>Invented arithmetic example, not a real city's timing or an ephemeris result:</strong> suppose a Sunday has sunrise at 07:00, sunset at 18:00 and the next sunrise at 07:00, with no clock change. Daylight lasts 660 minutes, so each daytime hora is 660 / 12 = 55 minutes. The night lasts 780 minutes, so each night hora is 780 / 12 = 65 minutes.</p>

<p>In that invented example, the first daytime horas are Sun 07:00-07:55, Venus 07:55-08:50, Mercury 08:50-09:45 and Moon 09:45-10:40. These are assumed inputs demonstrating the formula, not auspicious times to use today. The ruler sequence for the twelve daytime horas on each weekday is:</p>

<table>
<thead><tr><th>Day</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th><th>12</th></tr></thead>
<tbody>
<tr><td>Sunday</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td></tr>
<tr><td>Monday</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td></tr>
<tr><td>Tuesday</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td></tr>
<tr><td>Wednesday</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td></tr>
<tr><td>Thursday</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td></tr>
<tr><td>Friday</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td></tr>
<tr><td>Saturday</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td><td>Mercury</td><td>Moon</td><td>Saturn</td><td>Jupiter</td><td>Mars</td><td>Sun</td><td>Venus</td></tr>
</tbody>
</table>

<p>Night horas continue the cycle where the 12th day hora leaves off. After 24 horas you arrive at the next sunrise on the ruler of the next weekday, which is why the weekdays are named the way they are.</p>

<h2>What each hora is traditionally used for</h2>

<p>The following are common Jyotish associations, not measured effects or instructions that override your circumstances. Interpretations differ between schools; no planetary ruler guarantees a favourable outcome.</p>

<table>
<thead><tr><th>Hora of</th><th>Often chosen for</th><th>Often avoided for</th></tr></thead>
<tbody>
<tr><td>Sun</td><td>Meeting officials, applying for a post, taking the lead</td><td>Soft, behind-the-scenes talks</td></tr>
<tr><td>Moon</td><td>Family matters, public-facing work, travel, anything emotional or caring</td><td>Decisions that need a cool head</td></tr>
<tr><td>Mars</td><td>Exercise, tools, machinery, competition, direct confrontation</td><td>Diplomacy and patience-heavy tasks</td></tr>
<tr><td>Mercury</td><td>Trade, writing, study, contracts, communication</td><td>Little. It suits most routine work.</td></tr>
<tr><td>Jupiter</td><td>Teaching, advice, finance, ceremonies, big and well-considered starts</td><td>Rarely avoided</td></tr>
<tr><td>Venus</td><td>Relationships, art, shopping for comforts, celebrations</td><td>Hard, dry negotiation</td></tr>
<tr><td>Saturn</td><td>Slow, steady work, long-term plans, repairs, discipline</td><td>Celebrations, quick fresh starts</td></tr>
</tbody>
</table>

<p>Descriptions such as "friendly" or "heavy" belong to the interpretive tradition. A label does not measure the chance of success or failure, and there is no universally best hora.</p>

<h2>Hora next to choghadiya and Rahu Kaal</h2>

<p>Hora divides daylight into twelve equal parts and the night into twelve more; daytime and night-time durations can differ. <a href="/blog/choghadiya-guide">Choghadiya</a> divides each into eight parts with different names, while <a href="/blog/rahu-kaal-explained">Rahu Kaal</a> identifies a weekday-dependent eighth of daylight. Their boundaries and labels need not agree. The <a href="/blog/choghadiya-vs-hora-timing">comparison of Choghadiya and hora</a> explains the different systems.</p>

<h2>VedicHour's fixed windows are not sunrise-based horas</h2>

<p>VedicHour's forecast grid uses eighteen fixed <strong>60-minute windows</strong>, from 06:00 to midnight in the displayed location's local-time schedule. It is not a table of eighteen traditional horas. The timing engine calculates variable hora spans separately and labels a window with the ruler whose span has the greatest overlap with that window.</p>

<p>For example, the invented 07:00-08:00 clock-hour window above contains 55 minutes of Sun hora and 5 minutes of Venus hora. Its dominant label would be Sun, but the hora changes within the window. A single label does not mean the whole clock hour is one planetary hour.</p>

<p><a href="/sample-report">View the example reading</a> to see the clock-hour format, or read <a href="/methodology">the calculation methodology</a>. It is an example, not your own forecast. The <a href="/free-kundli">free birth-chart calculator</a> supplies chart facts, not a personal hourly forecast; new paid readings are currently unavailable.</p>

<h2>Limits</h2>

<ul>
<li>A city-wide table with the same date, location and method is the same regardless of who reads it. It does not incorporate your birth chart or dasha.</li>
<li>A hora is a traditional association, not a ban. Keep practical commitments and other people's availability in view.</li>
<li>A single hora label is not a full muhurta assessment. For the terminology, see <a href="/blog/what-is-muhurat">what is muhurat</a>; no timing rule guarantees an outcome.</li>
<li>Do not use astrology to schedule or delay medical care, or as financial, legal or safety advice.</li>
</ul>

<h2>Sources and a useful next step</h2>

<p><a href="https://www.drikpanchang.com/muhurat/hora.html">Drik Panchang's official Hora Chakra page</a> shows location/date-specific day and night horas, the weekday sequence and traditional associations. <a href="https://www.astro.com/swisseph/swephprg.htm">Astrodienst's Swiss Ephemeris documentation</a> covers rise/set calculation and sunrise definitions (sections 8.12 and 8.12.1). Different sunrise definitions can affect boundaries; neither source validates predictions about personal outcomes. Sources checked 15 October 2026; no vendor table or real city timing is reproduced in the invented example.</p>

<p>For a chart of your own, <a href="/free-kundli">open the free Kundli calculator</a>. Choose Known or enter an actual estimate as Approximate; approximate results are provisional at that single time, with no interval checked. Choosing Unknown does not compute a chart or substitute noon. Use <a href="/help?q=birth%20time#birth-time">birth-time help</a> if needed, or <a href="/help?q=chart%20terms#chart-terms">read the result glossary</a>. The <a href="/hora">hora reference page</a> provides more on the traditional sequence.</p>`,
  faqs: [
    {
      q: 'What is a hora in Vedic astrology?',
      a: 'A planetary hour. The day and night are each divided into 12 horas, ruled in turn by Sun, Venus, Mercury, Moon, Saturn, Jupiter and Mars, starting with the ruler of the weekday.',
    },
    {
      q: 'How long is a hora?',
      a: 'Daytime hora is the elapsed time from sunrise to sunset divided by 12. Night hora is sunset to the next sunrise divided by 12. Its duration depends on the date, place and sunrise definition; there is no fixed 60-minute duration.',
    },
    {
      q: 'Which hora is best?',
      a: 'It depends on the task. Jupiter, Venus, Mercury and the Moon are generally seen as friendly, and each suits particular work. There is no single best hora.',
    },
    {
      q: 'Which hora is first on Monday?',
      a: 'The Moon. The first hora of the day belongs to the ruler of the weekday.',
    },
    {
      q: 'Is hora the same as choghadiya?',
      a: 'No. Hora divides daylight into 12 equal parts and night into 12 more. Choghadiya divides each into 8 parts with names such as Amrit and Kaal. Day and night lengths can differ, and the two systems have different boundaries.',
    },
    {
      q: 'Is a forecast window the same as a hora?',
      a: 'No. VedicHour\'s example grid uses 60-minute clock-hour windows. A traditional hora varies with sunrise and sunset. A window\'s dominant hora label identifies the greatest overlap; it does not make the whole window one hora.',
    },
  ],
  sources: [
    'Drik Panchang, Hora Chakra and weekday rulers: https://www.drikpanchang.com/muhurat/hora.html (checked 2026-10-15)',
    'Astrodienst Swiss Ephemeris programming interface, sections 8.12 and 8.12.1: https://www.astro.com/swisseph/swephprg.htm (checked 2026-10-15)',
    'VedicHour methodology: /methodology; fixed clock-hour grid and greatest-overlap hora selection reviewed in the timing-engine source on 2026-10-15',
    'The 07:00/18:00 example uses invented times for arithmetic, not a real city, customer observation or ephemeris output',
  ],
};
