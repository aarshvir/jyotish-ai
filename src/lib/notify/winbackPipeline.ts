import type { SupabaseClient } from '@supabase/supabase-js';
import type Anthropic from '@anthropic-ai/sdk';
import {
  buildWinbackEmail,
  classifyQuestion,
  displayFirstName,
  formatDashaDate,
  mayAnswer,
  periodLabel,
  winbackChartFrom,
  type CurrentDashaLike,
  type DashaLike,
  type QuestionCategory,
  type WinbackChart,
} from './winback';

/**
 * The data half of the win-back email: who receives it, their chart, and the
 * model's interpretation. Rendering lives in winback.ts.
 *
 * One audience definition is shared by the admin send action and the local
 * preview script, so a preview and a send can never disagree about who is on
 * the list.
 */

export const WINBACK_CAMPAIGN = 'first_question_2026_09';

export interface WinbackRecipient {
  email: string;
  reportId: string;
  firstName: string;
  question: string;
  askedAt: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLat: number;
  birthLng: number;
}

/**
 * Internal accounts are never an audience. Owner testing and e2e fixtures are the
 * large majority of report rows. Extra addresses can be excluded through
 * INTERNAL_EMAILS (comma-separated) without putting anyone's address in the repo.
 */
export function isInternalEmail(email: string): boolean {
  const x = (email ?? '').trim().toLowerCase();
  if (x.endsWith('@vedichour.com') || x.includes('e2e') || x.endsWith('@example.com')) return true;
  const extra = (process.env.INTERNAL_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extra.indexOf(x) >= 0;
}

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Supabase caps a response at 1000 rows no matter what .limit() says, so page. */
async function pageAll<T>(fetchPage: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

interface ReportRow {
  id: string;
  user_email: string | null;
  native_name: string | null;
  personal_context: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  created_at: string;
}

/**
 * People who typed a real question, have not paid, and have not unsubscribed.
 *
 * `requireSuppressionList` must be true for a real send: if the unsubscribe list
 * cannot be read, sending would email people who asked us to stop.
 */
export async function winbackAudience(
  db: SupabaseClient,
  opts: { requireSuppressionList: boolean },
): Promise<WinbackRecipient[]> {
  const rows = await pageAll<ReportRow>(
    (from, to) =>
      db
        .from('reports')
        .select('id, user_email, native_name, personal_context, birth_date, birth_time, birth_city, birth_lat, birth_lng, created_at')
        .not('personal_context', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to) as unknown as PageResult<ReportRow>,
  );

  const paid = await pageAll<{ user_email: string | null }>(
    (from, to) =>
      db
        .from('reports')
        .select('user_email')
        .in('payment_status', ['paid', 'promo'])
        .range(from, to) as unknown as PageResult<{ user_email: string | null }>,
  );
  const paidSet = new Set(paid.map((r) => (r.user_email ?? '').trim().toLowerCase()).filter(Boolean));

  let suppressed = new Set<string>();
  try {
    const sup = await pageAll<{ email: string }>(
      (from, to) => db.from('email_suppressions').select('email').range(from, to) as unknown as PageResult<{ email: string }>,
    );
    suppressed = new Set(sup.map((s) => s.email.trim().toLowerCase()));
  } catch (e) {
    if (opts.requireSuppressionList) {
      throw new Error(`Unsubscribe list unavailable: ${(e as Error).message}`);
    }
  }

  const seen = new Set<string>();
  const out: WinbackRecipient[] = [];
  for (const r of rows) {
    const email = (r.user_email ?? '').trim().toLowerCase();
    const question = (r.personal_context ?? '').trim();
    if (!email.includes('@') || isInternalEmail(email) || question.length < 4) continue;
    // Rows are newest-first: the latest question wins, and older rows never re-enter.
    if (seen.has(email)) continue;
    seen.add(email);
    if (paidSet.has(email) || suppressed.has(email)) continue;
    if (!r.birth_date || r.birth_lat == null || r.birth_lng == null) continue;
    out.push({
      email,
      reportId: r.id,
      firstName: displayFirstName(r.native_name),
      question,
      askedAt: r.created_at,
      birthDate: r.birth_date,
      birthTime: r.birth_time || '12:00:00',
      birthCity: r.birth_city ?? '',
      birthLat: r.birth_lat,
      birthLng: r.birth_lng,
    });
  }
  return out;
}

export interface ChartFacts {
  lagna?: string | null;
  moonSign?: string | null;
  nakshatra?: string | null;
  current?: CurrentDashaLike | null;
  sequence?: DashaLike[] | null;
}

/** Injected so production can use the ephemeris service directly and a local preview can use the public endpoint. */
export type ChartFetcher = (r: WinbackRecipient) => Promise<ChartFacts | null>;

const SYSTEM = [
  'You are a careful Vedic astrologer writing two or three sentences of a personal email.',
  'RULES, all absolute:',
  '- Interpret ONLY the chart facts given. Never invent a planet, house, yoga, date or year.',
  '- Mention a date or year only exactly as it is given to you.',
  '- No health, medical, pregnancy, mental-health or death claims of any kind.',
  '- Never describe the feelings or future actions of any other person.',
  '- No guarantees. Write about tendency and timing, never certainty.',
  '- Plain English a non-astrologer understands. No Sanskrit beyond the terms supplied.',
  '- Speak to their actual question, anchored on the running period. Do not restate the question.',
  '- Do not sell, do not mention price, do not add a call to action.',
  '- No greeting and no sign-off — this drops into the middle of a letter.',
  '- 2-3 sentences, under 70 words total.',
].join('\n');

/**
 * Defence in depth. The prompt forbids all of this, but a rule the model broke
 * must not reach an inbox: an insight that drifts into health, death or someone
 * else's feelings, or that states a year it was never given, is discarded.
 */
export function acceptInsight(raw: string, chart: WinbackChart, now: Date = new Date()): string {
  const text = (raw ?? '').trim().replace(/^["'“]+|["'”]+$/g, '').trim();
  if (!text || text.length > 900) return '';

  // Sign names are chart vocabulary, not claims: a Cancer Moon is not a diagnosis.
  let scrubbed = text;
  for (const term of [chart.lagna, chart.moonSign, chart.nakshatra]) {
    if (term) scrubbed = scrubbed.split(term).join(' ');
  }
  if (classifyQuestion(scrubbed) !== 'general') return '';

  const allowedYears = new Set<string>([String(now.getUTCFullYear())]);
  if (chart.subPeriodEnds) allowedYears.add(chart.subPeriodEnds.slice(0, 4));
  const years = text.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  for (const y of years) {
    if (!allowedYears.has(y)) return '';
  }
  return text;
}

export async function winbackInsight(
  client: Anthropic,
  args: { question: string; firstName: string; chart: WinbackChart; now?: Date },
): Promise<string> {
  const { question, firstName, chart } = args;
  const now = args.now ?? new Date();
  const label = periodLabel(chart.mahadasha, chart.antardasha);
  const ends = formatDashaDate(chart.subPeriodEnds);
  const nextLabel = chart.next ? periodLabel(chart.next.mahadasha, chart.next.antardasha) : null;

  const msg = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 300,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          `Their name: ${firstName}`,
          `Their question: "${question}"`,
          '',
          'Their chart:',
          `- Lagna (ascendant): ${chart.lagna ?? 'unknown'}`,
          `- Moon sign: ${chart.moonSign ?? 'unknown'}`,
          `- Nakshatra: ${chart.nakshatra ?? 'unknown'}`,
          `- Running period (mahadasha–antardasha): ${label ?? 'unknown'}${ends ? `, until ${ends}` : ''}`,
          `- Next period: ${nextLabel ?? 'unknown'}`,
        ].join('\n'),
      },
    ],
  });
  const block = msg.content.find((b) => b.type === 'text');
  return acceptInsight(block && block.type === 'text' ? block.text : '', chart, now);
}

export type ComposedWinback =
  | { ok: true; subject: string; html: string; text: string; category: QuestionCategory }
  | { ok: false; reason: string };

export async function composeWinback(args: {
  recipient: WinbackRecipient;
  fetchChart: ChartFetcher;
  anthropic: Anthropic;
  offerHref: string;
  unsubscribeHref: string;
  now?: Date;
}): Promise<ComposedWinback> {
  const { recipient: r, fetchChart, anthropic, offerHref, unsubscribeHref } = args;
  const now = args.now ?? new Date();

  const facts = await fetchChart(r);
  if (!facts) return { ok: false, reason: 'chart unavailable' };
  const chart = winbackChartFrom(facts, now);

  const category = classifyQuestion(r.question);
  let insight = '';
  if (mayAnswer(category)) {
    insight = await winbackInsight(anthropic, { question: r.question, firstName: r.firstName, chart, now });
    if (!insight) return { ok: false, reason: 'reading rejected by safety checks' };
  }

  const mail = buildWinbackEmail({
    firstName: r.firstName,
    question: r.question,
    askedAt: r.askedAt,
    chart,
    insight,
    offerHref,
    unsubscribeHref,
    now,
  });
  return { ok: true, subject: mail.subject, html: mail.html, text: mail.text, category: mail.category };
}
