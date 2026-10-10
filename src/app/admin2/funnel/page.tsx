import { parseRange } from '@/lib/admin2/load';
import { funnelView } from '@/lib/admin2/views';
import type { BreakdownRow } from '@/lib/admin2/metrics';
import { Foot, FunnelBars, PageHead, Panel, Warnings, inr, n, pctTxt, SMALL } from '../_ui';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

function Breakdown({ rows, label }: { rows: BreakdownRow[]; label: string }) {
  if (!rows.length) return <p className="a2-empty">Nothing in this range.</p>;
  return (
    <div className="a2-tablewrap">
      <table className="a2-table">
        <thead>
          <tr>
            <th>{label}</th>
            <th>Visitors</th>
            <th>Quiz starts</th>
            <th>Saw offer</th>
            <th>Payers</th>
            <th>Conv.</th>
            <th>Revenue</th>
            <th title="Revenue ÷ visitors. Stands in for revenue per click until ad-click counts are imported.">Rev./visitor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="l">{r.key}</td>
              <td className="tnum">{n(r.visitors)}</td>
              <td className="tnum">{n(r.quizStarts)}</td>
              <td className="tnum">{n(r.offers)}</td>
              <td className="tnum a2-strong">{n(r.payers)}</td>
              <td className="tnum">
                {pctTxt(r.convPct)}
                {r.visitors > 0 && r.visitors < SMALL && <span className="a2-muted">*</span>}
              </td>
              <td className="tnum a2-strong">{inr(r.revenueInr)}</td>
              <td className="tnum">{r.rpvInr === null ? '—' : `₹${r.rpvInr.toFixed(2)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LADDER_LABELS: Record<string, string> = {
  offer_view: 'Saw the offer',
  checkout_start: 'Started checkout',
  bump_taken: 'Took the order bump',
  upsell_view: 'Saw the upsell',
  upsell_accept: 'Accepted the upsell',
  upsell_decline: 'Declined the upsell',
  downsell_accept: 'Accepted the down-sell',
  refund: 'Refunded',
};

export default async function FunnelPage({ searchParams }: { searchParams: SP }) {
  const range = parseRange(searchParams);
  const f = await funnelView(range);
  const starters = f.stages.find((s) => s.key === 'quiz')?.count ?? 0;
  const exportQs = new URLSearchParams({ days: String(range.days), ...(range.includeInternal ? { internal: '1' } : {}) }).toString();

  return (
    <>
      <PageHead
        title="Funnel"
        sub="Visit → quiz → each screen → reveal → offer → checkout → paid."
        range={range}
        path="/admin2/funnel"
        slugs={f.slugs}
        sources={f.sources}
      />
      <Warnings items={f.warnings} />

      <div className="a2-grid two">
        <Panel
          title="Main steps"
          meta={range.slug || range.source ? [range.slug, range.source].filter(Boolean).join(' · ') : 'all funnels, all sources'}
          def="Strict funnel over unique visitors who first appeared in this range. Paid = a completed Ziina payment by an account this visitor signed in as, after their first visit."
        >
          <FunnelBars stages={f.stages} prev={f.prevStages} />
        </Panel>

        <Panel
          title="Quiz screen by screen"
          meta={`${n(starters)} started`}
          def="Share of quiz starters who reached each screen. Screens shown only for some answers (e.g. the partner questions) have lower reach by design; that is branching, not drop-off."
        >
          {f.steps.length === 0 ? (
            <p className="a2-empty">No quiz screens viewed in this range.</p>
          ) : (
            <div className="a2-tablewrap">
              <table className="a2-table">
                <thead>
                  <tr>
                    <th>Screen</th>
                    <th>Reached</th>
                    <th className="a2-barcell l">of starters</th>
                  </tr>
                </thead>
                <tbody>
                  {f.steps.map((s) => (
                    <tr key={s.step}>
                      <td className="l">{s.step.replace(/_/g, ' ')}</td>
                      <td className="tnum a2-strong">{n(s.reached)}</td>
                      <td className="l a2-barcell">
                        <span className="a2-bar" style={{ width: `${Math.max(2, (s.pctOfStart ?? 0) * 0.8)}%` }} />{' '}
                        <span className="tnum a2-muted">{pctTxt(s.pctOfStart)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div style={{ height: 16 }} />
      <div className="a2-grid">
        <Panel
          title="By funnel (slug)"
          meta={<a href={`/api/admin2/export?kind=slug&${exportQs}`}>Download CSV</a>}
          def="Revenue is credited to the funnel that first brought the paying account in this range. * fewer than 20 visitors: treat the rate as anecdotal."
        >
          <Breakdown rows={f.bySlug} label="Funnel" />
        </Panel>
        <Panel
          title="By source"
          meta={<a href={`/api/admin2/export?kind=source&${exportQs}`}>Download CSV</a>}
          def="Source = utm_source of the first visit in range; else a Meta/Google click id; else the referring site; else direct / unknown."
        >
          <Breakdown rows={f.bySource} label="Source" />
        </Panel>
        <Panel title="Offer ladder" def="Unique visitors per event. Bump, upsell and down-sell appear once the new quiz funnel sends them.">
          <table className="a2-table">
            <tbody>
              {Object.entries(f.ladder).map(([k, v]) => (
                <tr key={k}>
                  <td>{LADDER_LABELS[k] ?? k}</td>
                  <td className="tnum a2-strong">{n(v)}</td>
                  <td className="tnum a2-muted">
                    {k !== 'offer_view' && f.ladder.offer_view ? `${pctTxt(Math.round((v / f.ladder.offer_view) * 1000) / 10)} of offer views` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Foot excluded={f.excludedVisitors} range={range} />
    </>
  );
}
