import { parseRange } from '@/lib/admin2/load';
import { funnelView, reasonsFrom } from '@/lib/admin2/views';
import { DROPOFF_REASON_LABELS, type DropoffReason } from '@/lib/analytics/events';
import { Foot, PageHead, Panel, Warnings, n, pctTxt, when } from '../_ui';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

const CONTEXT_LABELS: Record<string, string> = {
  paywall_exit: 'Left the offer page (desktop exit)',
  paywall_back: 'Tapped Back on the offer',
  handoff_cancel: 'Backed out before going to Ziina',
  checkout_cancelled: 'Returned from Ziina, payment cancelled',
};

export default async function ReasonsPage({ searchParams }: { searchParams: SP }) {
  const range = parseRange(searchParams);
  const f = await funnelView(range);
  const r = reasonsFrom(f.events, f.ctx, range, range.start);
  const reasonLabel = (k: string) => DROPOFF_REASON_LABELS[k as DropoffReason] ?? k;
  const max = Math.max(1, ...r.byReason.map((x) => x.count));

  return (
    <>
      <PageHead
        title="Drop-off reasons"
        sub="Answers to the optional one-tap “what stopped you?” prompt."
        range={range}
        path="/admin2/reasons"
        slugs={f.slugs}
      />
      <Warnings items={f.warnings} />

      <div className="a2-kpis">
        <div className="a2-kpi"><div className="a2-kpi-label">Prompts shown</div><div className="a2-kpi-value tnum">{n(r.promptViews)}</div></div>
        <div className="a2-kpi"><div className="a2-kpi-label">Answered</div><div className="a2-kpi-value tnum">{n(r.answers)}</div></div>
        <div className="a2-kpi"><div className="a2-kpi-label">Answer rate</div><div className="a2-kpi-value tnum">{pctTxt(r.responsePct)}</div></div>
        <div className="a2-kpi"><div className="a2-kpi-label">Said “no thanks”</div><div className="a2-kpi-value tnum">{n(r.dismissals)}</div></div>
      </div>

      <div className="a2-grid half">
        <Panel title="Reasons" def="Share of answers. People who close the page without answering are not counted here.">
          {r.byReason.length === 0 ? (
            <p className="a2-empty">No answers in this range yet.</p>
          ) : (
            <table className="a2-table">
              <tbody>
                {r.byReason.map((x) => (
                  <tr key={x.reason}>
                    <td>{reasonLabel(x.reason)}</td>
                    <td className="l a2-barcell"><span className="a2-bar" style={{ width: `${(x.count / max) * 100}%` }} /></td>
                    <td className="tnum a2-strong">{n(x.count)}</td>
                    <td className="tnum a2-muted">{pctTxt(x.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Where the prompt appeared">
          {r.byContext.length === 0 ? (
            <p className="a2-empty">Not shown yet.</p>
          ) : (
            <table className="a2-table">
              <thead><tr><th>Moment</th><th>Shown</th><th>Answered</th></tr></thead>
              <tbody>
                {r.byContext.map((c) => (
                  <tr key={c.context}>
                    <td className="l">{CONTEXT_LABELS[c.context] ?? c.context}</td>
                    <td className="tnum">{n(c.views)}</td>
                    <td className="tnum a2-strong">{n(c.answers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <div style={{ height: 16 }} />
      <Panel title="In their words" meta={`latest ${r.notes.length}`} def="Free text from “Something else”. Emails and phone numbers are masked before storage.">
        {r.notes.length === 0 ? (
          <p className="a2-empty">No written answers yet.</p>
        ) : (
          <ul className="a2-list">
            {r.notes.map((x, i) => (
              <li key={i}>
                <div style={{ color: 'var(--a2-ink)' }}>{x.text}</div>
                <div className="a2-muted">{when(x.at)} · {CONTEXT_LABELS[x.context] ?? x.context}</div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Foot excluded={f.excludedVisitors} range={range} />
    </>
  );
}
