export type Comparison = {
  slug: string;
  /** Used for <title> (the layout template appends " | VedicHour"). */
  title: string;
  /** On-page H1. */
  h1: string;
  description: string;
  keywords: string[];
  /** Lead paragraph under the H1. */
  intro: string;
  /** Body HTML: only <h2>,<h3>,<p>,<ul><li>,<strong>,<a href="/...">,<table>. No <h1>. */
  html: string;
  faqs: { q: string; a: string }[];
};

const DISCLAIMER =
  '<p><strong>For reflection and planning only.</strong> VedicHour is a structured second lens for timing awareness, not medical, legal, financial, or emergency advice.</p>';

const CTA =
  '<ul>' +
  '<li>Generate your <a href="/free-kundli">free Kundli</a> — Lagna, Moon sign, nakshatra and current dasha in plain English.</li>' +
  '<li>Open a <a href="/kundali">deep Kundli report</a> for a full chart reading across seven life areas.</li>' +
  '<li>See the <a href="/pricing">plans</a> — free preview, then one-time reports (no subscription).</li>' +
  '</ul>';

export const COMPARISONS: Comparison[] = [
  {
    slug: 'astrosage-alternative',
    title: 'AstroSage Alternative — VedicHour vs AstroSage',
    h1: 'A modern AstroSage alternative',
    description:
      'Looking for an AstroSage alternative? VedicHour pairs Swiss Ephemeris Kundli with an AI Jyotish report in plain English and an hour-by-hour Vedic timing grid. Free preview, no card.',
    keywords: [
      'astrosage alternative',
      'alternative to astrosage',
      'sites like astrosage',
      'astrosage vs vedichour',
      'free kundli alternative',
    ],
    intro:
      'AstroSage is one of the oldest and most comprehensive free astrology portals in India, with a deep library of tools, kundli matching and panchang. VedicHour is a newer, narrower take on the same tradition: the same classical Jyotish, computed with the Swiss Ephemeris, but written for you in plain English and organised around an hour-by-hour timing grid. Here is an honest look at where each one fits.',
    html:
      '<h2>What AstroSage does well</h2>' +
      '<p>AstroSage is a broad, long-established platform. It covers a large range of free tools, detailed kundli generation, ashtakoot matching, daily panchang and an active community. If you want one place that does a little of everything in classical Vedic astrology, it is a reasonable default and a lot of people use it.</p>' +
      '<h2>Where VedicHour is different</h2>' +
      '<p>VedicHour deliberately does less, in more depth, in three ways:</p>' +
      '<ul>' +
      '<li><strong>Plain-English AI reading.</strong> Instead of dense tables and jargon, your chart is turned into a readable report — what each placement tends to mean, which dasha you are running, and how to think about the year ahead.</li>' +
      '<li><strong>An hour-by-hour timing grid.</strong> VedicHour rates all 18 planetary hours (horas) of your day as clearer or heavier windows for reflection and planning — a structured second lens you do not get from a static panchang.</li>' +
      '<li><strong>Real astronomy, stated openly.</strong> Every chart and window is computed with the Swiss Ephemeris and the Lahiri ayanamsa — the sidereal standard professional astrologers use.</li>' +
      '</ul>' +
      '<h2>Side by side</h2>' +
      '<table>' +
      '<tr><th>&nbsp;</th><th>AstroSage</th><th>VedicHour</th></tr>' +
      '<tr><td>Free Kundli</td><td>Yes</td><td>Yes (Swiss Ephemeris, Lahiri)</td></tr>' +
      '<tr><td>Plain-English AI report</td><td>Limited</td><td>Core focus</td></tr>' +
      '<tr><td>Hour-by-hour timing grid</td><td>Panchang / choghadiya tables</td><td>All 18 horas scored as clearer / heavier windows</td></tr>' +
      '<tr><td>Kundli matching (Gun Milan)</td><td>Yes</td><td>Yes — <a href="/synastry">free 36-point score</a></td></tr>' +
      '<tr><td>Pricing</td><td>Free + paid consultations</td><td>Free preview, then one-time reports (no subscription)</td></tr>' +
      '</table>' +
      '<h2>Which should you choose?</h2>' +
      '<p>If you want the widest possible toolbox and an established community, AstroSage is a sensible choice. If you would rather have your chart explained in plain English and see your day broken into clearer and heavier windows, VedicHour is built for exactly that. You can try the core for free and decide — no card needed.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'Is VedicHour free like AstroSage?',
        a: 'Yes. Your Kundli — Lagna, Moon sign, nakshatra, current dasha and the classical dosha flags — is free with no card. Deep reports are a one-time payment, not a subscription.',
      },
      {
        q: 'Does VedicHour use the same calculations as AstroSage?',
        a: 'Both use the sidereal (Vedic) zodiac. VedicHour computes every chart with the Swiss Ephemeris and the Lahiri ayanamsa, the standard used across professional Jyotish, so core placements line up with any accurate Vedic tool.',
      },
      {
        q: 'What does VedicHour offer that AstroSage does not?',
        a: 'A plain-English AI reading of your chart and an hour-by-hour grid that rates all 18 planetary hours as clearer or heavier windows for planning — a structured timing lens rather than a static panchang table.',
      },
      {
        q: 'Can I use both?',
        a: 'Of course. Many people use a broad portal for reference and VedicHour for a readable chart reading and day-by-day timing awareness. The underlying astronomy is the same.',
      },
    ],
  },
  {
    slug: 'prokerala-alternative',
    title: 'Prokerala Alternative — VedicHour vs Prokerala',
    h1: 'A modern Prokerala alternative',
    description:
      'A Prokerala alternative for free Kundli and Vedic timing. VedicHour adds a plain-English AI Jyotish report and an hour-by-hour grid of clearer and heavier windows. Swiss Ephemeris, free preview.',
    keywords: [
      'prokerala alternative',
      'alternative to prokerala',
      'sites like prokerala',
      'prokerala vs vedichour',
      'free kundli online alternative',
    ],
    intro:
      'Prokerala offers a clean set of free Vedic tools — kundli, panchang, nakshatra and dosha checks — and is a popular, no-fuss option. VedicHour covers the same classical ground with the Swiss Ephemeris, then adds two things Prokerala does not: a plain-English AI reading of your chart, and an hour-by-hour grid that scores your day into clearer and heavier windows.',
    html:
      '<h2>What Prokerala does well</h2>' +
      '<p>Prokerala is simple and fast. Its free calculators are easy to use, its panchang is reliable, and it does not bury you in clutter. For a quick kundli or a dosha check, it does the job cleanly.</p>' +
      '<h2>Where VedicHour goes further</h2>' +
      '<ul>' +
      '<li><strong>It explains, not just calculates.</strong> VedicHour turns your chart into a plain-English report — your Lagna, dasha and life-area themes written out, rather than left as raw tables.</li>' +
      '<li><strong>It scores your day.</strong> All 18 planetary hours (horas) are rated as clearer or heavier windows, so timing becomes a practical, at-a-glance lens for planning your day.</li>' +
      '<li><strong>It is transparent about the engine.</strong> Swiss Ephemeris plus the Lahiri ayanamsa, the same sidereal standard professional astrologers rely on.</li>' +
      '</ul>' +
      '<h2>Side by side</h2>' +
      '<table>' +
      '<tr><th>&nbsp;</th><th>Prokerala</th><th>VedicHour</th></tr>' +
      '<tr><td>Free Kundli &amp; calculators</td><td>Yes</td><td>Yes — <a href="/free-kundli">free Kundli</a> + 8 tools</td></tr>' +
      '<tr><td>Plain-English AI report</td><td>No</td><td>Core focus</td></tr>' +
      '<tr><td>Hour-by-hour timing grid</td><td>Panchang / muhurat tables</td><td>All 18 horas scored as clearer / heavier windows</td></tr>' +
      '<tr><td>Engine</td><td>Sidereal Vedic</td><td>Swiss Ephemeris + Lahiri ayanamsa</td></tr>' +
      '<tr><td>Pricing</td><td>Free + paid reports</td><td>Free preview, then one-time reports</td></tr>' +
      '</table>' +
      '<h2>Which should you choose?</h2>' +
      '<p>For a quick, clean calculation, Prokerala is fine. If you want your chart explained in plain language and your day organised into clearer and heavier windows for reflection and planning, VedicHour is the better fit — and the preview is free.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'Is VedicHour free like Prokerala?',
        a: 'Yes — the Kundli and core tools are free with no card. Deep, plain-English reports are a one-time payment, with no subscription.',
      },
      {
        q: 'How accurate is VedicHour compared with Prokerala?',
        a: 'Both use the sidereal Vedic zodiac. VedicHour computes with the Swiss Ephemeris and the Lahiri ayanamsa, so core placements match any accurate Vedic tool. Accuracy depends mostly on the precision of your birth time and place.',
      },
      {
        q: 'What is the hour-by-hour timing grid?',
        a: 'VedicHour rates all 18 planetary hours (horas) of your day as clearer or heavier windows — a structured second lens for planning. It is timing awareness, never a promise about outcomes.',
      },
      {
        q: 'Do I need to create an account?',
        a: 'You can generate your free Kundli preview without payment. The differentiator is the readable report and the daily timing grid, which you can try before deciding on a paid report.',
      },
    ],
  },
  {
    slug: 'best-free-ai-kundli',
    title: 'Best Free AI Kundli & Jyotish Sites (Honest 2026 Guide)',
    h1: 'Best free AI Kundli & Jyotish sites',
    description:
      'An honest guide to the best free AI Kundli and Vedic astrology sites — what each is good for, and where VedicHour fits: plain-English AI reports plus an hour-by-hour timing grid on Swiss Ephemeris.',
    keywords: [
      'best free ai kundli',
      'best ai astrology website',
      'best free kundli website',
      'best ai jyotish',
      'best free vedic astrology site',
    ],
    intro:
      'There is no single "best" Kundli site — it depends on what you want. Some sites are best for breadth, some for clean calculators, some for plain-English readings. This is an honest map of the options and what each is genuinely good for, including where VedicHour fits and where it does not.',
    html:
      '<h2>How to choose</h2>' +
      '<p>Three questions usually decide it: do you want raw tools or a readable explanation? Do you care about day-to-day timing or only the birth chart? And do you want a free start before paying anything? Match those to the option below.</p>' +
      '<h2>If you want the widest toolbox</h2>' +
      '<p>Long-established portals such as AstroSage and Prokerala cover a great deal — kundli, matching, panchang, dosha checks and more — for free. They are a sensible default when you want one place for everything and do not mind reading tables yourself.</p>' +
      '<h2>If you want authoritative panchang and muhurat</h2>' +
      '<p>For traditional panchang and muhurat reference, dedicated panchang sites are strong. They are reference tools rather than personalised readings.</p>' +
      '<h2>If you want a plain-English reading and daily timing</h2>' +
      '<p>This is where <strong>VedicHour</strong> is built to be the best fit. It computes your chart with the Swiss Ephemeris and the Lahiri ayanamsa, then does two things most free sites do not:</p>' +
      '<ul>' +
      '<li>Turns your chart into a <strong>plain-English AI report</strong> — placements, dasha and life-area themes written out, not left as tables.</li>' +
      '<li>Rates all <strong>18 planetary hours</strong> of your day as clearer or heavier windows — an hour-by-hour timing grid for planning, not a generic daily horoscope.</li>' +
      '</ul>' +
      '<p>You can generate the <a href="/free-kundli">free Kundli</a> and see a sample timing grid before paying for anything. A full <a href="/kundali">deep report</a> is a one-time cost, not a subscription.</p>' +
      '<h2>The honest summary</h2>' +
      '<table>' +
      '<tr><th>If you want…</th><th>Best fit</th></tr>' +
      '<tr><td>The widest free toolbox</td><td>Established portals (AstroSage, Prokerala)</td></tr>' +
      '<tr><td>Panchang &amp; muhurat reference</td><td>Dedicated panchang sites</td></tr>' +
      '<tr><td>A plain-English chart reading</td><td>VedicHour</td></tr>' +
      '<tr><td>Hour-by-hour timing awareness</td><td>VedicHour</td></tr>' +
      '</table>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'What is the best free AI Kundli website?',
        a: 'It depends on what you want. For the widest free toolbox, established portals like AstroSage or Prokerala are strong. For a plain-English AI reading plus an hour-by-hour timing grid computed on the Swiss Ephemeris, VedicHour is built for that specifically, with a free preview.',
      },
      {
        q: 'Are AI Kundli sites accurate?',
        a: 'The chart itself is only as accurate as the astronomy and your birth details. VedicHour uses the Swiss Ephemeris and the Lahiri ayanamsa for the calculations; the AI then explains the chart in plain English. Treat readings as a reflective second lens, not certainty.',
      },
      {
        q: 'Is a free Kundli really free?',
        a: 'On VedicHour, yes — your Kundli and core tools are free with no card. Deep reports are a one-time payment with no subscription.',
      },
      {
        q: 'What makes VedicHour different from a daily horoscope?',
        a: 'A daily horoscope is one general mood for a whole sign. VedicHour is personal to your exact birth chart and breaks the day into 18 hourly windows rated as clearer or heavier — timing awareness rather than a single prediction.',
      },
    ],
  },
  {
    slug: 'best-app-for-vedic-timing',
    title: 'Best App for Vedic Timing — Muhurat, Choghadiya & Hora',
    h1: 'The best app for Vedic timing',
    description:
      'Looking for the best app for Vedic timing — muhurat, choghadiya, hora and Rahu Kaal? VedicHour rates all 18 planetary hours of your day as clearer or heavier windows, personal to your chart. Free to try.',
    keywords: [
      'best app for muhurat',
      'auspicious time calculator',
      'choghadiya app',
      'vedic timing app',
      'hora timing app',
      'rahu kaal app',
    ],
    intro:
      'Most timing tools show the same generic panchang for everyone: choghadiya bands, Rahu Kaal, a muhurat table. Useful, but impersonal. VedicHour takes a different approach — it rates all 18 planetary hours (horas) of your day against your own birth chart, marking each as a clearer or a heavier window for reflection and planning. This page explains the difference and how to use it.',
    html:
      '<h2>Generic panchang vs a personal timing grid</h2>' +
      '<p>Classical timing draws on several layers: the hora (planetary hour), choghadiya bands, and cautionary periods like Rahu Kaal. Traditional apps display these the same way for the whole city. That is a fine reference, but two people with very different charts get an identical table.</p>' +
      '<p>VedicHour instead reads each hour <strong>against your chart</strong> — your Lagna, Moon and running dasha — and scores the day hour by hour. The result is a grid of clearer and heavier windows that is specific to you, in plain English.</p>' +
      '<h2>What it covers</h2>' +
      '<ul>' +
      '<li><strong>All 18 planetary hours (horas)</strong> rated as clearer or heavier windows for the day.</li>' +
      '<li><strong>Choghadiya and hora rulers</strong> woven in, not as a separate lookup.</li>' +
      '<li><strong>Rahu Kaal and cautionary periods</strong> flagged in context.</li>' +
      '<li>Everything computed with the <strong>Swiss Ephemeris and the Lahiri ayanamsa</strong>.</li>' +
      '</ul>' +
      '<h2>How people use it</h2>' +
      '<p>Think of it as a structured second lens for planning a demanding day — when to schedule the focused work, the difficult conversation, the launch, the long drive. It is timing <em>awareness</em>: a prompt to plan thoughtfully, never a guarantee about how things will turn out. For dated muhurat questions, pair it with the free <a href="/vimshottari-dasha-calculator">dasha</a> and dosha calculators.</p>' +
      '<h2>Try your own timing grid</h2>' +
      '<p>Generate your <a href="/free-kundli">free Kundli</a> and see a sample hour-by-hour grid for your chart. A full forecast with daily windows across a 7-day, monthly or annual span is a one-time <a href="/pricing">report</a>.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'What is the best app for auspicious Vedic timing?',
        a: 'If you want timing that is personal to your chart rather than a generic city-wide panchang, VedicHour rates all 18 planetary hours of your day as clearer or heavier windows, computed on the Swiss Ephemeris. You can try it free.',
      },
      {
        q: 'How is this different from a choghadiya or muhurat app?',
        a: 'Choghadiya and muhurat tables are the same for everyone in a location. VedicHour reads each hour against your own birth chart and running dasha, so the windows are specific to you.',
      },
      {
        q: 'Does it tell me the best and worst hours?',
        a: 'It marks clearer and heavier windows for reflection and planning — never guarantees of good or bad outcomes. Astrology here is a structured second lens, not certainty.',
      },
      {
        q: 'Is the timing grid free?',
        a: 'You can see a sample timing grid for your chart free. A full forecast with daily windows across a 7-day, monthly or annual period is a one-time report, with no subscription.',
      },
    ],
  },
  {
    slug: 'astrosage-vs-prokerala',
    title: 'AstroSage vs Prokerala vs VedicHour — Free Kundli Compared',
    h1: 'AstroSage vs Prokerala vs VedicHour',
    description:
      'AstroSage vs Prokerala vs VedicHour for a free Kundli. All three cast a sidereal chart; we compare breadth, readability and timing — and where each one fits. Honest, no hype.',
    keywords: [
      'astrosage vs prokerala',
      'prokerala vs astrosage',
      'astrosage vs vedichour',
      'best free kundli site comparison',
      'kundli site comparison',
    ],
    intro:
      'All three compute a sidereal Vedic chart, so for the raw numbers you will get broadly consistent results. The real difference is what each is built for: breadth of tools, clean calculation, or a readable reading with day-by-day timing. Here is an honest, like-for-like comparison.',
    html:
      '<h2>The short version</h2>' +
      '<p>AstroSage is the broadest toolbox. Prokerala is the cleanest quick calculator. VedicHour is the one that explains your chart in plain English and adds an hour-by-hour timing grid. None is "best" in the abstract — it depends on what you want.</p>' +
      '<h2>Side by side</h2>' +
      '<table>' +
      '<tr><th>&nbsp;</th><th>AstroSage</th><th>Prokerala</th><th>VedicHour</th></tr>' +
      '<tr><td>Free Kundli</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>' +
      '<tr><td>Breadth of free tools</td><td>Very broad</td><td>Broad</td><td>Focused (8 calculators)</td></tr>' +
      '<tr><td>Plain-English AI report</td><td>Limited</td><td>No</td><td>Core focus</td></tr>' +
      '<tr><td>Hour-by-hour timing grid</td><td>Panchang tables</td><td>Panchang tables</td><td>All 18 horas scored clearer / heavier</td></tr>' +
      '<tr><td>Engine</td><td>Sidereal Vedic</td><td>Sidereal Vedic</td><td>Swiss Ephemeris + Lahiri</td></tr>' +
      '<tr><td>Pricing</td><td>Free + consultations</td><td>Free + reports</td><td>Free preview, one-time reports</td></tr>' +
      '</table>' +
      '<h2>Which should you pick?</h2>' +
      '<ul>' +
      '<li><strong>Want one place for everything?</strong> AstroSage.</li>' +
      '<li><strong>Want a fast, clean calculation?</strong> Prokerala.</li>' +
      '<li><strong>Want your chart explained and your day broken into clearer and heavier windows?</strong> VedicHour — try the <a href="/free-kundli">free Kundli</a> first.</li>' +
      '</ul>' +
      '<p>A quick sanity check for any free site: generate the same birth details on two of them and confirm the Lagna and nakshatra match. If they do, the astronomy is sound and the rest comes down to how the chart is presented to you.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'Which is more accurate, AstroSage or Prokerala?',
        a: 'Both use the sidereal Vedic zodiac and produce consistent core placements; accuracy depends mostly on your birth-time precision. VedicHour computes with the Swiss Ephemeris and Lahiri ayanamsa, so its chart lines up with both.',
      },
      {
        q: 'What does VedicHour add over AstroSage and Prokerala?',
        a: 'A plain-English AI reading of your chart and an hour-by-hour grid that rates all 18 planetary hours as clearer or heavier windows — timing awareness rather than a static panchang.',
      },
      {
        q: 'Are all three free?',
        a: 'All three offer free Kundli generation. AstroSage and Prokerala add paid consultations or reports; VedicHour offers a free preview and one-time reports with no subscription.',
      },
      {
        q: 'Can I use more than one?',
        a: 'Yes — many people use a broad portal for reference and VedicHour for a readable reading and daily timing. The underlying astronomy is the same.',
      },
    ],
  },
  {
    slug: 'best-ai-astrology-app',
    title: 'Best AI Astrology Apps That Explain Your Chart (Honest Guide)',
    h1: 'Best AI astrology apps that explain your chart',
    description:
      'Most "AI astrology" is just generic horoscope text. Here is how to spot apps that actually read your birth chart — and where VedicHour fits, with an hour-by-hour timing grid on Swiss Ephemeris.',
    keywords: [
      'best ai astrology app',
      'ai astrology app',
      'ai kundli app',
      'best ai jyotish app',
      'ai vedic astrology',
    ],
    intro:
      'There is a lot of "AI astrology" now, and most of it is the same generic horoscope text dressed up — written for a Sun sign, not for you. A genuinely useful AI astrology app reads your actual birth chart and explains it. Here is how to tell the difference, and where VedicHour fits.',
    html:
      '<h2>Two kinds of "AI astrology"</h2>' +
      '<p>The first kind generates broad daily horoscope copy from your Sun sign — quick, but no more personal than a newspaper column. The second kind computes your real chart and uses AI to <em>explain</em> it: your Lagna, your nakshatra, your running dasha, in plain English. Only the second is worth your time.</p>' +
      '<h2>How to judge an AI astrology app</h2>' +
      '<ul>' +
      '<li><strong>Does it use your full birth details?</strong> Date, exact time and place — not just your Sun sign.</li>' +
      '<li><strong>Does it state its engine?</strong> Look for the Swiss Ephemeris and, for Vedic work, the Lahiri ayanamsa.</li>' +
      '<li><strong>Does it explain, or just label?</strong> A good report tells you what a placement tends to mean, not just that it exists.</li>' +
      '<li><strong>Is it honest about uncertainty?</strong> Reflection and planning, never guarantees or "lucky" claims.</li>' +
      '</ul>' +
      '<h2>Where VedicHour fits</h2>' +
      '<p>VedicHour is built for the second kind. It casts your chart with the Swiss Ephemeris and Lahiri ayanamsa, writes a plain-English reading, and adds the piece most apps skip: an hour-by-hour grid that rates all 18 planetary hours (horas) of your day as clearer or heavier windows. It is framed as timing awareness — a structured second lens — not a prediction engine.</p>' +
      '<p>You can generate your <a href="/free-kundli">free Kundli</a> and see a sample reading and timing grid before paying for anything.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'Is AI astrology accurate?',
        a: 'The chart is only as accurate as the astronomy and your birth details. VedicHour uses the Swiss Ephemeris and Lahiri ayanamsa for the calculation; the AI then explains the chart in plain English. Treat any reading as a reflective second lens, not certainty.',
      },
      {
        q: 'What makes a good AI Kundli app?',
        a: 'It should use your full birth details (not just your Sun sign), state its ephemeris and ayanamsa, explain placements in plain language, and frame everything as awareness rather than guaranteed outcomes.',
      },
      {
        q: 'Does VedicHour use real Vedic calculations or just AI text?',
        a: 'Both. The chart and the 18-hora timing grid are computed with the Swiss Ephemeris and Lahiri ayanamsa; the AI is used only to turn those real calculations into a readable report.',
      },
      {
        q: 'Is there a free AI astrology app?',
        a: 'VedicHour offers a free Kundli and a sample plain-English reading with no card. Full reports across a 7-day, monthly or annual horizon are a one-time payment, not a subscription.',
      },
    ],
  },
  {
    slug: 'best-kundli-matching',
    title: 'Best Kundli Matching for 36-Point Gun Milan (Free)',
    h1: 'Kundli matching (Gun Milan), explained',
    description:
      'How 36-point Gun Milan Kundli matching actually works, what each koota measures, and what to look for in a free matching tool. Try VedicHour’s free 36-point score on a sidereal chart.',
    keywords: [
      'best kundli matching online',
      'kundli matching free',
      'gun milan calculator',
      'ashtakoot matching',
      '36 point matching',
    ],
    intro:
      'Kundli matching, or Gun Milan, scores the compatibility of two birth charts across eight factors (kootas) for a maximum of 36 points. It is one input into a marriage decision, not a verdict. Here is what the 36 points actually measure, and what makes a matching tool trustworthy.',
    html:
      '<h2>What the 36 points measure</h2>' +
      '<p>The Ashtakoot system weighs eight kootas — Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot and Nadi — each carrying a set number of points. Together they look at temperament, mutual influence, mental and emotional fit, and biological compatibility, mostly from the Moon sign and birth nakshatra of each person.</p>' +
      '<h2>What to look for in a matching tool</h2>' +
      '<ul>' +
      '<li><strong>Sidereal chart with Lahiri ayanamsa</strong> — Gun Milan depends on the Moon and nakshatra, so the engine matters.</li>' +
      '<li><strong>A clear koota-by-koota breakdown</strong> — a single score hides where a match is strong or weak.</li>' +
      '<li><strong>Honest framing</strong> — a low score is a prompt for a fuller reading, not a prohibition. A high score is reassurance, not a guarantee.</li>' +
      '</ul>' +
      '<h2>VedicHour’s free matching</h2>' +
      '<p>VedicHour computes a <a href="/synastry">free 36-point Gun Milan score</a> for two birth charts, with the full eight-fold breakdown and a Manglik check, on a Swiss Ephemeris chart. It is written plainly and framed as one lens among several — the goal is understanding, never a final verdict on a relationship.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'What is a good Gun Milan score out of 36?',
        a: 'As a rough guide, many practitioners treat 18 and above as workable and higher scores as more comfortable, but the koota breakdown and the full charts matter more than the number alone. Treat any score as one input, not a verdict.',
      },
      {
        q: 'Is online Kundli matching reliable?',
        a: 'A good tool computes the Ashtakoot points accurately from a sidereal chart. It is reliable for the score itself, but a full compatibility reading also weighs Manglik status, the 7th house and the wider charts — so use the score as a starting point.',
      },
      {
        q: 'Does a low score mean we should not marry?',
        a: 'No. A low score is a prompt to look deeper, not a prohibition. Many factors outside Gun Milan shape a relationship, and classical astrology also lists mitigating placements. It is guidance for reflection, not a decision.',
      },
      {
        q: 'Is VedicHour’s Kundli matching free?',
        a: 'Yes — the 36-point Gun Milan score and the eight-fold breakdown are free. A deeper written compatibility reading is a one-time report.',
      },
    ],
  },
  {
    slug: 'best-dosha-calculators',
    title: 'Best Free Dosha Calculators — Sade Sati, Manglik, Kaal Sarp',
    h1: 'Best free dosha calculators',
    description:
      'Free Sade Sati, Manglik and Kaal Sarp dosha calculators on a Swiss Ephemeris chart — what each dosha means for reflection, not fear, and how to check yours in seconds. No signup.',
    keywords: [
      'dosha calculator',
      'manglik dosha calculator',
      'sade sati calculator',
      'kaal sarp dosha calculator',
      'free dosha check',
    ],
    intro:
      'The three doshas people ask about most — Sade Sati, Manglik (Mangal) and Kaal Sarp — are chart patterns, not curses. Understood calmly, they are useful signals for awareness and timing. Here is what each means and how to check yours free, computed from a real sidereal chart.',
    html:
      '<h2>The three most-asked doshas</h2>' +
      '<ul>' +
      '<li><strong>Manglik (Mangal) Dosha</strong> — Mars in certain houses from the ascendant, Moon and Venus. Weighed in marriage matching, with many classical cancellations. <a href="/manglik-dosha-calculator">Check yours</a>.</li>' +
      '<li><strong>Sade Sati</strong> — roughly seven and a half years of Saturn transiting around your natal Moon, in three phases. A maturing period, not a sentence. <a href="/sade-sati-calculator">Check yours</a>.</li>' +
      '<li><strong>Kaal Sarp</strong> — all seven classical planets on one side of the Rahu–Ketu axis. Common, and not a barrier to a good life. <a href="/kaal-sarp-dosha-calculator">Check yours</a>.</li>' +
      '</ul>' +
      '<h2>Reflection, not fear</h2>' +
      '<p>Classical Jyotish treats these patterns as tendencies to understand, never as guarantees of misfortune. A dosha flag is a prompt to plan with awareness — to be patient through a Sade Sati, or to read a Manglik match in full context — not a reason to worry. Any tool that sells fear or "remedies to avoid disaster" is reading the tradition wrong.</p>' +
      '<h2>How to check yours</h2>' +
      '<p>VedicHour’s calculators compute each dosha from your exact birth details on a Swiss Ephemeris chart, with a plain-English explanation and no fear-mongering. They are free with no signup. For all three in the context of your whole chart, generate your <a href="/free-kundli">free Kundli</a> or open a <a href="/kundali">deep report</a>.</p>' +
      CTA +
      DISCLAIMER,
    faqs: [
      {
        q: 'Are dosha calculators accurate?',
        a: 'They are as accurate as the astronomy and your birth time. VedicHour computes each dosha from a Swiss Ephemeris sidereal chart, so the flags match a traditional reading. An exact birth time matters most for house-based doshas like Manglik.',
      },
      {
        q: 'Is having a dosha bad?',
        a: 'No. Doshas are common chart patterns, not curses. They describe tendencies and timing to understand calmly, and classical texts list many cancellations. Treat any flag as a prompt for awareness, not a verdict.',
      },
      {
        q: 'Which doshas can I check for free?',
        a: 'VedicHour offers free calculators for Manglik (Mangal) Dosha, Shani Sade Sati and Kaal Sarp Dosha, each computed from your birth details with no signup.',
      },
      {
        q: 'Do I need my exact birth time?',
        a: 'For house-based doshas like Manglik, yes — the ascendant and houses depend on birth time. Sade Sati and Kaal Sarp are more forgiving, though an exact time always gives the most reliable result.',
      },
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
