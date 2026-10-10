import Link from 'next/link';
import { parseRange } from '@/lib/admin2/load';
import { funnelView, opsView, reasonsFrom, revenueView } from '@/lib/admin2/views';
import { DROPOFF_REASON_LABELS, type DropoffReason } from '@/lib/analytics/events';
import { Foot, FunnelBars, Kpi, PageHead, Panel, Warnings, ago, inr, n, pctTxt, SMALL } from './_ui';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

export default async function Admin2Overview({ searchParams }: { searchParams: SP }) {
  const range = parseRange(searchParams);
  const f = await funnelView(range);
  const [rev, ops] = await Promise.all([revenueView(range, f.ctx, f.payments), opsView(range, f.ctx)]);
  const reasons = reasonsFrom(f.events, f.ctx, range, range.start);

  const st = (k: string) => f.stages.find((s) => s.key === k)?.count ?? 0;
  const pv = (k: string) => f.prevStages.find((s) => s.key === k)?.count ?? 0;

  const problems: { text: string; href: string; tone: 'bad' | 'warn' }[] = [];
  if (ops.reports.paidNotDelivered) problems.push({ text: `${ops.reports.paidNotDelivered} paid report(s) not delivered`, href: '/admin2/ops', tone: 'bad' });
  if (ops.reports.stuck) problems.push({ text: `${ops.reports.stuck} report(s) stuck generating >15 min`, href: '/admin2/ops', tone: 'bad' });
  if (ops.ephemeris.reachable && (ops.ephemeris.ok === false || ops.ephemeris.worker_thread_ok === false)) {
    problems.push({ text: 'Chart engine reports a wrong ayanamsa (worker_thread_ok is false)', href: '/admin2/ops', tone: 'bad' });
  }
  if (!ops.ephemeris.reachable) problems.push({ text: `Chart engine health check failed (${ops.ephemeris.error ?? 'unreachable'})`, href: '/admin2/ops', tone: 'bad' });
  for (const c of ops.crons) if (c.stale || c.ok === false) problems.push({ text: `Cron ${c.job}: ${c.lastAt ? (c.ok === false ? 'last run failed' : `last ran ${ago(c.lastAt)}`) : 'no run recorded yet'}`, href: '/admin2/ops', tone: 'warn' });
  for (const i of ops.integrations) if (!i.configured) problems.push({ text: `${i.key} is not set in this deployment`, href: '/admin2/ops', tone: 'warn' });

  return (
    <>
      <PageHead title="Overview" sub={`Last ${range.days === 1 ? '24 hours' : `${range.days} days`}, compared with the ${range.days === 1 ? 'day' : `${range.days} days`} before.`} range={range} path="/admin2" slugs={f.slugs} sources={f.sources} />
      <Warnings items={[...f.warnings, ...rev.warnings]} />

      {problems.length > 0 && (
        <div className={`a2-note ${problems.some((p) => p.tone === 'bad') ? 'bad' : 'warn'}`} role="status">
          <strong>Needs attention:</strong>{' '}
          {problems.map((p, i) => (
            <span key={p.text}>
              {i > 0 && ' · '}
              <Link href={p.href}>{p.text}</Link>
            </span>
          ))}
        </div>
      )}

      <div className="a2-kpis k7">
        <Kpi label="Visitors" value={n(st('visit'))} curr={st('visit')} prev={pv('visit')} spark={f.daily.visitors} />
        <Kpi label="Started quiz" value={n(st('quiz'))} curr={st('quiz')} prev={pv('quiz')} spark={f.daily.quiz} />
        <Kpi label="Saw offer" value={n(st('offer'))} curr={st('offer')} prev={pv('offer')} />
        <Kpi label="Started checkout" value={n(st('checkout'))} curr={st('checkout')} prev={pv('checkout')} />
        <Kpi label="Paid (from funnel)" value={n(st('paid'))} curr={st('paid')} prev={pv('paid')} spark={f.daily.paid} />
        <Kpi label="Revenue" value={inr(rev.state.revenueInr)} curr={rev.state.revenueInr} prev={rev.prevState.revenueInr} spark={rev.dailyRevenue} />
        <Kpi label="MRR (active subs)" value={rev.mrr ? inr(rev.mrr.mrrInr) : '—'} title={rev.mrr ? `${rev.mrr.activeSubs} active subscription(s)` : 'Subscription tables not readable'} />
      </div>

      <div className="a2-grid two">
        <Panel
          title="Funnel"
          meta={<Link href={`/admin2/funnel${range.days !== 30 ? `?days=${range.days}` : ''}`}>Screen by screen →</Link>}
          def="Strict: a visitor counts at a step only if they also reached every step above it. Visitor = one browser."
        >
          <FunnelBars stages={f.stages} prev={f.prevStages} />
        </Panel>

        <div className="a2-grid">
          <Panel
            title="Why people stopped"
            meta={<Link href="/admin2/reasons">All answers →</Link>}
            def={`${n(reasons.answers)} answers from ${n(reasons.promptViews)} prompts shown (${pctTxt(reasons.responsePct)} answered).`}
          >
            {reasons.byReason.length === 0 ? (
              <p className="a2-empty">No answers yet. The one-tap prompt appears when someone leaves the offer or cancels at Ziina.</p>
            ) : (
              <table className="a2-table">
                <tbody>
                  {reasons.byReason.slice(0, 6).map((r) => (
                    <tr key={r.reason}>
                      <td>{DROPOFF_REASON_LABELS[r.reason as DropoffReason] ?? r.reason}</td>
                      <td className="tnum a2-strong">{n(r.count)}</td>
                      <td className="tnum a2-muted">{pctTxt(r.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Payments" meta={<Link href="/admin2/revenue">Feed →</Link>} def="Payment intents created at Ziina in this range. Abandoned = still unpaid after an hour.">
            <table className="a2-table">
              <tbody>
                <tr><td>Intents created</td><td className="tnum a2-strong">{n(rev.state.created)}</td></tr>
                <tr><td>Paid</td><td className="tnum a2-strong">{n(rev.state.completed)}</td></tr>
                <tr><td>Abandoned at Ziina</td><td className="tnum">{n(rev.state.abandoned)}</td></tr>
                <tr><td>Cancelled at Ziina</td><td className="tnum">{n(rev.state.cancelled)}</td></tr>
                <tr><td>In progress (&lt;1h)</td><td className="tnum a2-muted">{n(rev.state.inFlight)}</td></tr>
                <tr>
                  <td>Completion rate</td>
                  <td className="tnum">
                    {pctTxt(rev.state.completionPct)}
                    {rev.state.created > 0 && rev.state.created < SMALL && <span className="a2-muted"> · small sample</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
        </div>
      </div>

      <Foot excluded={f.excludedVisitors} range={range} />
    </>
  );
}
