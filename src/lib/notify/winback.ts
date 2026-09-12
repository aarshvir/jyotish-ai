/**
 * Win-back email for the people who asked a real question and never came back.
 *
 * 150 people have ever used VedicHour; 49 typed a genuine question; 2 returned.
 * Those 49 already told us exactly what they wanted to know, so a generic "come
 * back and buy" blast would waste the only asset we have. Every email quotes
 * their own words and carries one real, checkable date from their own chart.
 *
 * Nothing here invents astrology. Dasha dates come from the ephemeris service;
 * the model only interprets them, and only for questions we are willing to answer.
 */
import { emailShell, emailButton, plainText } from './emailLayout';

// ── Safety ──────────────────────────────────────────────────────────────────
// Real questions people have typed include cancer diagnoses, pregnancy, whether a
// particular person loves them, and when a named individual will message them. We
// answer none of those. Astrology must never stand in for a doctor, and we will not
// read the heart of someone who never came to this site. This repo is public, so
// examples here and in the tests are paraphrased — no user is quoted verbatim.
export type QuestionCategory = 'medical' | 'third_party' | 'mortality' | 'general';

// Trailing \w* matters: a bare \bpregnan\b never matches "pregnancies", which is
// how a real health question slipped through as answerable.
const MEDICAL =
  /\b(?:cancer\w*|tumou?rs?|diagnos\w*|disease\w*|illness\w*|surger\w*|pregnan\w*|conceiv\w*|fertilit\w*|miscarriage\w*|abortion\w*|depress\w*|suicid\w*|anxiet\w*|mental health|therap(?:y|ies)|medication\w*|diabet\w*|cardiac|heart attack|stroke\w*|neurolog\w*)\b/i;
const MORTALITY =
  /\b(?:die|death\w*|dying|how long will i live|life ?span|when will i die|kill\w*)\b/i;
// he/she only. "will they call me for the interview" is a job question, not a
// question about a named person, so "they" is deliberately excluded.
const ABOUT_OTHER =
  /\b(?:(?:does|do|will|is|would) (?:he|she) (?:love|like|miss|care|come back|call|message|text|reply|marry|cheat\w*|seeing|loving)|(?:he|she) (?:loves?|likes?|is loving|is seeing|misses|cares)|loves? me or not)\b/i;

const NAME_PAIR = /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g;
/**
 * Capitalised words that are not people. Without this, a question typed in title
 * case ("When Will I Get Job") reads as a named third party and gets the wrong
 * refusal. Misclassifying the other way only costs a softer email, so the list
 * errs towards common words, not towards completeness.
 */
const NOT_A_NAME = new Set([
  'when', 'will', 'what', 'which', 'where', 'how', 'why', 'who', 'get', 'job', 'jobs', 'my', 'your',
  'career', 'business', 'growth', 'life', 'love', 'marriage', 'married', 'vedic', 'astrology',
  'relationship', 'relationships', 'money', 'health', 'future', 'family', 'education', 'study',
  'studies', 'foreign', 'abroad', 'government', 'govt', 'private', 'sector', 'company', 'promotion',
  'month', 'months', 'year', 'years', 'january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday', 'sunday', 'india', 'indian', 'dubai', 'canada', 'america',
  'australia', 'england', 'london', 'delhi', 'mumbai', 'bangalore', 'bengaluru', 'hyderabad',
  'chennai', 'kolkata', 'pune', 'please', 'tell', 'give', 'know', 'want', 'need', 'can', 'should',
  'the', 'and', 'for', 'with', 'about', 'best', 'good', 'bad', 'right', 'time', 'timing', 'date',
  'day', 'days', 'new', 'old', 'house', 'home', 'land', 'property', 'car', 'child', 'children', 'son',
  'daughter', 'wife', 'husband', 'partner', 'girlfriend', 'boyfriend', 'mother', 'father', 'parents',
  'brother', 'sister', 'friend', 'friends', 'north', 'south', 'east', 'west', 'sade', 'sati', 'rahu',
  'ketu', 'shani', 'saturn', 'jupiter', 'venus', 'mars', 'mercury', 'moon', 'sun', 'manglik', 'dosha',
  'kundli', 'kundali', 'horoscope', 'chart', 'reading', 'report', 'dasha', 'lagna', 'nakshatra',
  // Chart vocabulary. The model's own readings pass through this same detector, and
  // "your Aquarius Ascendant" or "Uttara Bhadrapada" must not read as a person's name.
  'ascendant', 'rising', 'mahadasha', 'antardasha', 'period',
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn',
  'aquarius', 'pisces', 'mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrishchika',
  'dhanu', 'makara', 'kumbha', 'meena', 'ashwini', 'bharani', 'krittika', 'rohini', 'mrigashira',
  'mrigashirsha', 'ardra', 'punarvasu', 'pushya', 'ashlesha', 'magha', 'purva', 'phalguni', 'uttara',
  'hasta', 'chitra', 'swati', 'vishakha', 'anuradha', 'jyeshtha', 'mula', 'moola', 'ashadha', 'shravana',
  'dhanishta', 'shatabhisha', 'bhadrapada', 'revati',
]);

function hasNamedPerson(q: string): boolean {
  const re = new RegExp(NAME_PAIR.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(q)) !== null) {
    if (!NOT_A_NAME.has(m[1].toLowerCase()) && !NOT_A_NAME.has(m[2].toLowerCase())) return true;
  }
  return false;
}

export function classifyQuestion(question: string): QuestionCategory {
  const q = question ?? '';
  if (MORTALITY.test(q)) return 'mortality';
  if (MEDICAL.test(q)) return 'medical';
  if (ABOUT_OTHER.test(q) || hasNamedPerson(q)) return 'third_party';
  return 'general';
}

/** Whether we may attempt a substantive reading of this question at all. */
export function mayAnswer(category: QuestionCategory): boolean {
  return category === 'general';
}

// ── Names ───────────────────────────────────────────────────────────────────
/**
 * "RAHUL" → "Rahul", "priya" → "Priya"; deliberate casing ("McKenzie") and
 * non-Latin names are left alone. The checkout draft stores "Seeker" when no name
 * was given, which must never reach a greeting.
 */
export function displayFirstName(raw: string | null | undefined): string {
  const first = (raw ?? '').trim().split(/\s+/)[0] ?? '';
  const hasLetter = /[A-Za-z]/.test(first) || Array.from(first).some((c) => c.charCodeAt(0) > 127);
  if (!first || !hasLetter || first.toLowerCase() === 'seeker') return 'there';
  if (first === first.toUpperCase() || first === first.toLowerCase()) {
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  return first;
}

// ── Chart ───────────────────────────────────────────────────────────────────
export interface WinbackChart {
  lagna: string | null;
  moonSign: string | null;
  nakshatra: string | null;
  mahadasha: string | null;
  antardasha: string | null;
  /**
   * ISO end of the running ANTARDASHA. The mahadasha is the wrong hook: it often
   * ends a decade away ("your Rahu period runs to 2040"), which tells someone asking
   * "when will I get a job" that nothing changes for fourteen years.
   */
  subPeriodEnds: string | null;
  /** The sub-period that follows. */
  next: { mahadasha: string; antardasha: string } | null;
}

const VIMSHOTTARI = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'] as const;

/**
 * The sub-period after `antar` inside `maha`. Within mahadasha M the antardashas run
 * M, M+1 … M+8, so the next is A+1 — unless that wraps back to M, in which case the
 * mahadasha itself has ended and M+1 begins with its own sub-period.
 * Fallback only: real dates from the dasha sequence are preferred when present.
 */
export function nextSubPeriod(
  maha: string | null,
  antar: string | null,
): { mahadasha: string; antardasha: string } | null {
  const order = VIMSHOTTARI as readonly string[];
  const m = maha ? order.indexOf(maha) : -1;
  const a = antar ? order.indexOf(antar) : -1;
  if (m < 0 || a < 0) return null;
  const nextA = (a + 1) % 9;
  if (nextA === m) {
    const nm = (m + 1) % 9;
    return { mahadasha: order[nm], antardasha: order[nm] };
  }
  return { mahadasha: order[m], antardasha: order[nextA] };
}

export interface DashaLike {
  planet: string;
  start_date: string;
  end_date: string;
  antardasha?: { planet: string; start_date: string; end_date: string }[];
}

export interface CurrentDashaLike {
  mahadasha?: string;
  antardasha?: string;
  start_date?: string;
  end_date?: string;
}

/** Shape the ephemeris output into the facts the email is allowed to state. */
export function winbackChartFrom(
  src: {
    lagna?: string | null;
    moonSign?: string | null;
    nakshatra?: string | null;
    current?: CurrentDashaLike | null;
    sequence?: DashaLike[] | null;
  },
  now: Date = new Date(),
): WinbackChart {
  const t = now.getTime();
  const maha = src.current?.mahadasha?.trim() || null;
  const antar = src.current?.antardasha?.trim() || null;
  const endsRaw = src.current?.end_date ?? null;
  const endsAt = endsRaw ? Date.parse(endsRaw) : NaN;
  // A sub-period that already ended is stale data, not a hook.
  const subPeriodEnds = endsRaw && !Number.isNaN(endsAt) && endsAt > t ? endsRaw : null;

  const flat: { mahadasha: string; antardasha: string; start: number; end: number }[] = [];
  for (const d of src.sequence ?? []) {
    for (const a of d.antardasha ?? []) {
      flat.push({ mahadasha: d.planet, antardasha: a.planet, start: Date.parse(a.start_date), end: Date.parse(a.end_date) });
    }
  }
  const i = flat.findIndex((f) => f.start <= t && t < f.end);
  const next =
    i >= 0 && flat[i + 1]
      ? { mahadasha: flat[i + 1].mahadasha, antardasha: flat[i + 1].antardasha }
      : nextSubPeriod(maha, antar);

  return {
    lagna: src.lagna ?? null,
    moonSign: src.moonSign ?? null,
    nakshatra: src.nakshatra ?? null,
    mahadasha: maha,
    antardasha: antar,
    subPeriodEnds,
    next,
  };
}

export function periodLabel(maha: string | null, antar: string | null): string | null {
  if (maha && antar) return `${maha}–${antar}`;
  return maha ?? null;
}

export function formatDashaDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // UTC, or a 1st-of-the-month date renders as the previous month west of Greenwich.
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function askedWhen(askedAtIso: string, now: Date = new Date()): string {
  const t = Date.parse(askedAtIso);
  if (Number.isNaN(t)) return 'A while back';
  const days = (now.getTime() - t) / 86_400_000;
  if (days < 14) return 'A few days ago';
  if (days < 60) return 'A few weeks ago';
  return 'A while back';
}

/** Trim a long question to something quotable without cutting mid-word. */
export function shortQuestion(q: string, max = 120): string {
  const clean = (q ?? '').trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > 0 ? cut.slice(0, sp) : cut) + '…';
}

// ── Email ───────────────────────────────────────────────────────────────────
export interface WinbackInput {
  /** Already display-cased — see displayFirstName. "there" when unknown. */
  firstName: string;
  /** Their question, verbatim. Quoted back so the email cannot read as a blast. */
  question: string;
  /** When they asked, ISO. */
  askedAt: string;
  chart: WinbackChart;
  /** 2–3 sentences interpreting the chart against the question. Ignored for unsafe questions. */
  insight: string;
  /** Signed resume link: lands on a pre-filled 7-day checkout with NEWUSER30 applied. */
  offerHref: string;
  unsubscribeHref: string;
  now?: Date;
}

/**
 * Subject lines lead with the concrete date, because that is the one thing no other
 * astrology mail can say. Never a discount, never a deadline we invented.
 */
export function winbackSubject(input: Pick<WinbackInput, 'firstName' | 'chart'>): string {
  const { firstName, chart } = input;
  const label = periodLabel(chart.mahadasha, chart.antardasha);
  const ends = formatDashaDate(chart.subPeriodEnds);
  const named = Boolean(firstName) && firstName !== 'there';
  if (label && ends) {
    return named ? `${firstName}, your ${label} period changes in ${ends}` : `Your ${label} period changes in ${ends}`;
  }
  if (label) return named ? `${firstName}, you are in your ${label} period` : `You are in your ${label} period`;
  return named ? `${firstName}, about the question you asked us` : 'About the question you asked us';
}

const REFUSAL: Record<Exclude<QuestionCategory, 'general'>, string> = {
  medical:
    'You asked about something health-related. We do not make health predictions from a chart — that belongs with a doctor, and pretending otherwise would be irresponsible. What we can do is show you the periods ahead, so you can plan around them.',
  mortality:
    'You asked about something we will not put a date on. No honest astrologer should. What we can show you is the shape of the periods ahead, and how to time decisions inside them.',
  third_party:
    'Your question was largely about someone else. We only read the chart of the person in front of us — we will not read the heart of somebody who never asked. What we can read is your own timing: when you are best placed to act, and when to wait.',
};

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildWinbackEmail(input: WinbackInput): {
  subject: string;
  html: string;
  text: string;
  category: QuestionCategory;
} {
  const { firstName, chart, offerHref, unsubscribeHref } = input;
  const now = input.now ?? new Date();
  const category = classifyQuestion(input.question);
  const q = shortQuestion(input.question);
  const when = askedWhen(input.askedAt, now);
  const label = periodLabel(chart.mahadasha, chart.antardasha);
  const ends = formatDashaDate(chart.subPeriodEnds);
  const nextLabel = chart.next ? periodLabel(chart.next.mahadasha, chart.next.antardasha) : null;
  const greeting = firstName && firstName !== 'there' ? `Hello ${firstName},` : 'Hello,';
  const reading = category === 'general' ? input.insight.trim() : REFUSAL[category];

  const facts: string[] = [];
  if (chart.lagna) facts.push(`Lagna (ascendant): <strong>${esc(chart.lagna)}</strong>`);
  if (chart.moonSign) facts.push(`Moon sign: <strong>${esc(chart.moonSign)}</strong>`);
  if (chart.nakshatra) facts.push(`Nakshatra: <strong>${esc(chart.nakshatra)}</strong>`);
  if (label) {
    facts.push(
      `Running period: <strong>${esc(label)}</strong>` +
        (ends ? `, until <strong>${esc(ends)}</strong>` : '') +
        (ends && nextLabel ? ` — then ${esc(nextLabel)}` : ''),
    );
  }

  const contentHtml = `
<p style="margin:0 0 18px">${esc(greeting)}</p>

<p style="margin:0 0 10px">${esc(when)} you came to VedicHour and asked:</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr>
  <td style="border-left:3px solid #d4af37;padding:2px 0 2px 14px">
    <em style="color:#1f1c26">&ldquo;${esc(q)}&rdquo;</em>
  </td>
</tr></table>

<p style="margin:0 0 16px">We never properly answered it. Here is what your chart actually says.</p>

${facts.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#faf8f3;border:1px solid #ece8df;border-radius:10px">
  <tr><td style="padding:16px 18px;font-size:15px;line-height:1.8;color:#1f1c26">
    ${facts.join('<br>')}
  </td></tr>
</table>` : ''}

<p style="margin:0 0 16px">${esc(reading)}</p>

<p style="margin:0 0 20px">The full reading takes this period down to the hour &mdash; which days favour the move you are weighing, and which to sit out. It is a one-time purchase, no subscription, and the button below already has 30% off applied for you.</p>

${emailButton('Read my full forecast', offerHref)}

<p style="margin:18px 0 0;font-size:14px;color:#6b6776">If this is not what you were after, just reply and tell me &mdash; a real person reads these.</p>

<p style="margin:22px 0 0;font-size:12px;color:#6b6776">Would rather not hear from us? <a href="${esc(unsubscribeHref)}" style="color:#6b6776">Unsubscribe</a>.</p>
`.trim();

  const text = plainText([
    greeting,
    '',
    `${when} you came to VedicHour and asked:`,
    `  "${q}"`,
    '',
    'We never properly answered it. Here is what your chart actually says.',
    '',
    ...[
      chart.lagna ? `  Lagna (ascendant): ${chart.lagna}` : '',
      chart.moonSign ? `  Moon sign: ${chart.moonSign}` : '',
      chart.nakshatra ? `  Nakshatra: ${chart.nakshatra}` : '',
      label ? `  Running period: ${label}${ends ? `, until ${ends}` : ''}${ends && nextLabel ? ` — then ${nextLabel}` : ''}` : '',
    ].filter(Boolean),
    '',
    reading,
    '',
    'The full reading takes this period down to the hour. One-time purchase, no subscription — 30% off is already applied at this link:',
    offerHref,
    '',
    'If this is not what you were after, just reply and tell me — a real person reads these.',
    '',
    `Unsubscribe: ${unsubscribeHref}`,
  ]);

  const preheader =
    label && ends
      ? `Your ${label} period changes in ${ends} — here is what that means for what you asked.`
      : 'Here is what your chart actually says about what you asked.';

  return { subject: winbackSubject({ firstName, chart }), html: emailShell({ preheader, contentHtml }), text, category };
}
