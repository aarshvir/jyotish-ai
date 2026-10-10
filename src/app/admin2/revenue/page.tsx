import { parseRange } from '@/lib/admin2/load';
import { funnelView, revenueView } from '@/lib/admin2/views';
import { Foot, Kpi, PageHead, Panel, Warnings, inr, n, pctTxt, when } from '../_ui';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

const TONE: Record<string, string> = { Paid: 'ok', Abandoned: 'bad', 'Cancelled at Ziina': 'warn', 'In progress': '' };

export default async function RevenuePage({ searchParams }: { searchParams: SP }) {
  const range = parseRange(searchParams);
  const f = await funnelView(range);
  const rev = await revenueView(range, f.ctx, f.payments);
  const s = rev.state;
  const p = rev.prevState;
  const top = f.bySlug.slice(0, 8);

  return (
    <>
      <PageHead title="Revenue & payments" sub="Money that actually arrived, and every checkout attempt at Ziina." range={range} path="/admin2/revenue" />
      <Warnings items={[...f.warnings, ...rev.warnings]} />

      <div className="a2-kpis k6">
        <Kpi label="Revenue" value={inr(s.revenueInr)} curr={s.revenueInr} prev={p.revenueInr} spark={rev.dailyRevenue} />
        <Kpi label="Payments" value={n(s.completed)} curr={s.completed} prev={p.completed} />
        <Kpi label="Checkouts at Ziina" value={n(s.created)} curr={s.created} prev={p.created} />
        <Kpi label="Abandoned at Ziina" value={n(s.abandoned + s.cancelled)} curr={s.abandoned + s.cancelled} prev={p.abandoned + p.cancelled} upIsGood={false} />
        <Kpi label="MRR" value={rev.mrr ? inr(rev.mrr.mrrInr) : '—'} />
        <Kpi label="Active subscriptions" value={rev.mrr ? n(rev.mrr.activeSubs) : '—'} />
      </div>

      <div className="a2-grid two">
        <Panel
          title="Payment feed"
          meta={`latest ${rev.feed.length}`}
          def="Each row is one Ziina payment intent. Abandoned = still unpaid an hour after it was created. Ziina sends this account no webhooks, so a payment is confirmed when the buyer returns or the nightly reconcile runs."
        >
          {rev.feed.length === 0 ? (
            <p className="a2-empty">No checkouts in this range.</p>
          ) : (
            <div className="a2-tablewrap">
              <table className="a2-table">
                <thead><tr><th>When (IST)</th><th className="l">Status</th><th className="l">Plan</th><th>Amount</th></tr></thead>
                <tbody>
                  {rev.feed.map((r) => (
                    <tr key={r.id + r.at}>
                      <td className="tnum">{when(r.at)}</td>
                      <td className="l">
                        <span className={`a2-pill ${TONE[r.label] ?? ''}`}>{r.label}</span>
                        {r.internal && <span className="a2-muted"> · internal</span>}
                      </td>
                      <td className="l a2-muted">{r.plan ?? '—'}</td>
                      <td className="tnum">{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="a2-grid">
          <Panel title="Subscription movement" def="New = first paid period started in range. Renewals = later periods. Lapsed = a period ended in range with no renewal (counted when the paid time runs out, not when someone says they will cancel).">
            {rev.mrr ? (
              <table className="a2-table">
                <tbody>
                  <tr><td>New subscribers</td><td className="tnum a2-strong">{n(rev.mrr.newInWindow)}</td></tr>
                  <tr><td>Renewals</td><td className="tnum a2-strong">{n(rev.mrr.renewalsInWindow)}</td></tr>
                  <tr><td>Lapsed</td><td className="tnum">{n(rev.mrr.lapsedInWindow)}</td></tr>
                  <tr><td>Active now</td><td className="tnum">{n(rev.mrr.activeSubs)}</td></tr>
                  <tr><td>MRR (annual ÷ 12)</td><td className="tnum a2-strong">{inr(rev.mrr.mrrInr)}</td></tr>
                </tbody>
              </table>
            ) : (
              <p className="a2-empty">Subscription tables not readable.</p>
            )}
          </Panel>
          <Panel title="Checkout completion" def="Paid ÷ intents that are no longer in progress.">
            <div className="a2-kpi-value tnum">{pctTxt(s.completionPct)}</div>
            <div className="a2-muted tnum" style={{ fontSize: '0.8125rem' }}>
              {n(s.completed)} paid of {n(s.created - s.inFlight)} finished attempts
            </div>
          </Panel>
        </div>
      </div>

      <div style={{ height: 16 }} />
      <Panel title="Revenue by funnel" def="RPC proxy = revenue ÷ visitors who arrived through that funnel. Full breakdown with sources on the Funnel page.">
        <table className="a2-table">
          <thead><tr><th>Funnel</th><th>Visitors</th><th>Payers</th><th>Revenue</th><th>Rev./visitor</th></tr></thead>
          <tbody>
            {top.map((r) => (
              <tr key={r.key}>
                <td className="l">{r.key}</td>
                <td className="tnum">{n(r.visitors)}</td>
                <td className="tnum">{n(r.payers)}</td>
                <td className="tnum a2-strong">{inr(r.revenueInr)}</td>
                <td className="tnum">{r.rpvInr === null ? '—' : `₹${r.rpvInr.toFixed(2)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Foot excluded={f.excludedVisitors} range={range} />
    </>
  );
}
