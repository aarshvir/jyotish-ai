import type { BlogPost } from '@/content/blog/types';

export const post: BlogPost = {
  slug: 'how-to-read-kundli',
  title: 'How to Read Your Kundli: A Step-by-Step Guide for Beginners',
  seoTitle: "How to Read Your Kundli: Beginner's Guide",
  description:
    'Read your Kundli step by step: check birth details, find Lagna and Moon placements, then explore traditional houses, planets and dasha with clear limits.',
  keywords: [
    'how to read kundli',
    'janam kundali',
    'vedic birth chart',
    'kundli houses',
    'lagna',
    'read kundli yourself',
    'kundli kaise dekhe',
    'north indian chart',
  ],
  date: '2026-06-14',
  updated: '2026-10-15',
  readingTimeMin: 7,
  html: `<p><strong>To read a Kundli, go in this order: find the Lagna (rising sign, the 1st house), then the Moon sign and nakshatra, then the 12 houses and the planets in them, then where each house's lord sits, and finally the dasha period you are in now. You do not need to memorise anything. A table lookup for each step is enough to start.</strong></p>

<p>A Kundli (Janam Kundali, Janam Patri) records calculated placements for a birth moment and place. Their meanings belong to the Jyotish tradition, not a fixed script or a guarantee about your life. The <a href="/free-kundli">free Kundli calculator</a> shows a snapshot with the rising sign, Moon sign, birth star, Sun sign, current planetary period and available traditional pattern checks. It needs no account, email or card.</p>

<h2>Step 1: Make sure the chart is right</h2>

<p>Start with the birth date, local clock time and birthplace. Check AM or PM, then search for and select the correct city and country. A different time or location can change the rising sign and other placements, especially near a boundary; there is no universal safe amount of rounding.</p>

<ul>
<li><strong>Known:</strong> enter the time you know. This selects the time for calculation; it does not verify a birth record.</li>
<li><strong>Approximate:</strong> enter an estimate you actually have. All results are provisional at that single estimate. The calculator does not check a time interval or certify which details would stay unchanged.</li>
<li><strong>Unknown:</strong> the calculator does not compute a chart or substitute noon. Read <a href="/blog/kundli-without-birth-time">what missing birth time means</a>, use <a href="/help?q=birth%20time#birth-time">birth-time help</a> or view an example instead.</li>
</ul>

<p>For comparisons, match the zodiac, ayanamsa and house system as well as the inputs. VedicHour uses the Lahiri sidereal setting and whole-sign houses; <a href="/methodology">the methodology page</a> explains those choices. A tropical chart uses a different zodiac reference, so compare like with like rather than declaring one chart wrong.</p>

<h2>Step 2: Know your chart style</h2>

<ul>
<li><strong>North Indian:</strong> a diamond-shaped chart. The houses are fixed in position (the top diamond is always the 1st house) and the numbers inside are the signs.</li>
<li><strong>South Indian:</strong> a square grid. The signs are fixed in position (Aries is always second from the left on the top row) and you find the Lagna by the mark in its box.</li>
</ul>

<p>These are different ways of arranging the same placements when the inputs and calculation settings match. The free VedicHour result is currently a list of chart facts, not a full drawn diagram or a list of every planet's house. The chart-style and house-reading steps below explain how to read a more detailed chart when you have one; they are not extra outputs promised by the free snapshot.</p>

<h2>Step 3: Find the Lagna</h2>

<p>The Lagna (ascendant) is the sign rising on the eastern horizon at the entered birth moment and place. In the whole-sign system, that sign is the 1st house and the following signs are counted from it. Jyotish traditionally associates it with self, body and temperament. The <a href="/lagna-calculator">Lagna calculator</a> shows the calculated rising sign; an estimated time makes it provisional.</p>

<h2>Step 4: Read the Moon sign and nakshatra</h2>

<p>The Moon sign is its sidereal zodiac sign at the entered time; the Nakshatra is its traditional lunar division and the pada is a subdivision. Jyotish associates the Moon with mind and mood. Its birth position also supplies inputs for dasha and matching calculations, but these are not measured predictions of personality or relationships. Use the <a href="/moon-sign-calculator">Moon sign calculator</a>, <a href="/nakshatra-finder">Nakshatra finder</a> or <a href="/blog/nakshatra-birth-star-guide">Nakshatra table</a>. A Moon placement can change near a boundary, so keep an approximate-time result provisional.</p>

<h2>Step 5: Read the houses and planets</h2>

<p>The following tables summarise common Jyotish associations. They are an introduction to the tradition, not diagnoses, guaranteed outcomes or a substitute for qualified advice.</p>

<table>
<thead><tr><th>House</th><th>Traditional associations</th></tr></thead>
<tbody>
<tr><td>1</td><td>Self, body, temperament</td></tr>
<tr><td>2</td><td>Money, family, speech</td></tr>
<tr><td>3</td><td>Effort, courage, siblings, short trips</td></tr>
<tr><td>4</td><td>Home, mother, peace of mind, property</td></tr>
<tr><td>5</td><td>Children, study, creativity, romance</td></tr>
<tr><td>6</td><td>Daily work, health habits, debts, rivals</td></tr>
<tr><td>7</td><td>Marriage, partnerships, dealings with others</td></tr>
<tr><td>8</td><td>Sudden change, shared money, research</td></tr>
<tr><td>9</td><td>Luck, teachers, belief, long journeys</td></tr>
<tr><td>10</td><td>Career, status, public role</td></tr>
<tr><td>11</td><td>Gains, friends, long-term goals</td></tr>
<tr><td>12</td><td>Expenses, rest, solitude, foreign places</td></tr>
</tbody>
</table>

<table>
<thead><tr><th>Planet</th><th>Traditional associations</th></tr></thead>
<tbody>
<tr><td>Sun (Surya)</td><td>Self, authority, father, vitality</td></tr>
<tr><td>Moon (Chandra)</td><td>Mind, mood, mother, comfort</td></tr>
<tr><td>Mars (Mangal)</td><td>Drive, courage, conflict</td></tr>
<tr><td>Mercury (Budha)</td><td>Speech, intellect, trade</td></tr>
<tr><td>Jupiter (Guru)</td><td>Growth, learning, goodwill, children</td></tr>
<tr><td>Venus (Shukra)</td><td>Relationships, comfort, the arts</td></tr>
<tr><td>Saturn (Shani)</td><td>Discipline, work, delay, responsibility</td></tr>
<tr><td>Rahu</td><td>Appetite, ambition, unusual routes</td></tr>
<tr><td>Ketu</td><td>Detachment, focus, letting go</td></tr>
</tbody>
</table>

<p>A traditional reading starts with a topic, its associated house and any planets placed there. Career is associated with the 10th house, partnerships with the 7th. This is a way of reading symbolic associations in context, not a way to establish that a career or relationship event will happen.</p>

<h2>Step 6: Follow the house lords</h2>

<p>A house lord is the planet traditionally assigned rulership of that house's sign. To follow it, identify the sign in the house, look up its ruler, then find where that planet sits in the detailed chart.</p>

<p><strong>Invented example, not a calculated birth chart:</strong> suppose the 10th house is Aries. Its traditional ruler is Mars, so the next step is to find Mars's sign and house. This demonstrates a lookup, not someone's actual placement or a prediction of career success.</p>

<h2>Step 7: Check the dasha</h2>

<p><a href="/blog/vimshottari-dasha-current-period">Vimshottari dasha</a> is a traditional planetary-period system whose starting balance depends on the Moon's position at birth. The <a href="/vimshottari-dasha-calculator">dasha calculator</a> shows period dates and the current period at the calculation timestamp. An approximate birth time gives provisional dates, not a verified life-event timetable.</p>

<h2>Common beginner mistakes</h2>

<ul>
<li><strong>Reading one planet alone.</strong> "Saturn in the 7th" means little until you know its sign, its aspects and the dasha running.</li>
<li><strong>Treating labels as verdicts.</strong> Words like "afflicted" or "dosha" describe traditional patterns, not a prediction of harm. Schools differ on definitions and exceptions; see <a href="/blog/manglik-dosha-marriage">Manglik dosha</a> or <a href="/blog/kaal-sarp-dosha-explained">Kaal Sarp</a>. A check marked Unavailable is not the same as a pattern being absent.</li>
<li><strong>Mixing zodiacs.</strong> A Western sun-sign horoscope is a different system. See <a href="/blog/vedic-vs-western-astrology">Vedic vs Western astrology</a>.</li>
<li><strong>Taking the chart as a script.</strong> A calculated placement does not establish that its traditional interpretation predicts your future.</li>
</ul>

<h2>Check the method and take a useful next step</h2>

<p><a href="https://www.astro.com/swisseph/swephprg.htm">Astrodienst's Swiss Ephemeris documentation</a> explains sidereal settings and time-and-place inputs for house and ascendant calculations (sections 12.1 and 15.2). These explain how placements are calculated, not whether traditional meanings predict events. Compare them with <a href="/methodology">VedicHour's methodology</a> and <a href="/help?q=calculation%20interpretation#calculation-and-interpretation">help on calculation versus interpretation</a>.</p>

<p><a href="/free-kundli">Create a free chart snapshot</a> using a known or explicitly approximate time, or <a href="/sample-report">read an example interpretation</a>. New paid readings are currently unavailable. For a field or loading problem, <a href="/help?q=loading#troubleshooting">open calculator help</a>. Do not use an astrology reading as medical, legal, financial or safety advice.</p>`,
  faqs: [
    {
      q: 'How do I read my own Kundli?',
      a: 'Check the birth inputs and time certainty first. Read the rising sign, Moon sign and birth star in the free snapshot; a detailed chart can add houses, planets and house lords. Read dasha as a traditional period system, not a guaranteed future.',
    },
    {
      q: 'What is the difference between North and South Indian charts?',
      a: 'Layout only. In a North Indian chart the houses are fixed and the signs move; in a South Indian chart the signs are fixed and the houses move. Both show the same planets and signs.',
    },
    {
      q: 'Which is more important, Lagna or Moon sign?',
      a: 'They describe different calculated placements. Lagna sets whole-sign houses. The Moon birth position supplies inputs for dasha and matching rules. Their traditional meanings are separate from the calculation, and both remain provisional with an approximate time.',
    },
    {
      q: 'Why is my birth time so important?',
      a: 'Time and place determine the calculated rising sign and lunar position. A boundary can change a label or period date. The calculator checks only an entered known or approximate time; Unknown does not compute a chart and no interval is checked.',
    },
    {
      q: 'Can a Kundli predict my future?',
      a: 'It shows tendencies and timing in a traditional framework. It has not been shown to predict events, so use it for reflection and planning and not as a script.',
    },
  ],
  sources: [
    'House and planet significations: standard Jyotish references, as in Brihat Parashara Hora Shastra',
    'Chart styles: North Indian (fixed houses) and South Indian (fixed signs) conventions',
    'Astrodienst Swiss Ephemeris programming interface, sections 12.1 and 15.2: https://www.astro.com/swisseph/swephprg.htm (checked 2026-10-15)',
    'VedicHour methodology and task-filtered calculator help: /methodology and /help; current calculator contract reviewed 2026-10-15',
    'The Aries/Mars house-lord example is invented to demonstrate a lookup, not a calculated chart or customer observation',
  ],
};
