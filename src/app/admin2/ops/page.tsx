import Link from 'next/link';
import { loadCtx, parseRange } from '@/lib/admin2/load';
import { opsView } from '@/lib/admin2/views';
import { Foot, PageHead, Panel, Warnings, ago, n, usd, when } from '../_ui';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

function Dot({ ok }: { ok: boolean | null }) {
  return <span className={`a2-dot ${ok === null ? 'warn' : ok ? 'ok' : 'bad'}`} aria-hidden="true" />;
}
const yes = (v: boolean | null) => (v === null ? 'unknown' : v ? 'yes' : 'NO');

export default async function OpsPage({ searchParams }: { searchParams: SP }) {
  const range = parseRange(searchParams);
  const ctx = await loadCtx();
  const o = await opsView(range, ctx);
  const e = o.ephemeris;
  const ephOk = e.reachable && e.ok !== false && e.worker_thread_ok !== false && e.ayanamsa_ok !== false;

  return (
    <>
      <PageHead title="Reports & ops" sub="Report generation, what it costs, and whether the machinery is healthy." range={range} path="/admin2/ops" />
      <Warnings items={o.warnings} />

      <div className="a2-grid half">
        <Panel title="Health checks" def="Checked live when this page loaded.">
          <table className="a2-table">
            <tbody>
              <tr>
                <td><Dot ok={ephOk} />Chart engine /health</td>
                <td className="l">
                  {e.reachable ? (
                    <>ayanamsa_ok {yes(e.ayanamsa_ok)} · worker_thread_ok <span className={e.worker_thread_ok === false ? 'a2-pill bad' : ''}>{yes(e.worker_thread_ok)}</span> · {e.ms} ms</>
                  ) : (
                    <span className="a2-pill bad">{e.error ?? 'unreachable'}</span>
                  )}
                </td>
              </tr>
              {o.crons.map((c) => (
                <tr key={c.job}>
                  <td><Dot ok={c.lastAt ? !c.stale && c.ok !== false : null} />Cron · {c.job}</td>
                  <td className="l">
                    {c.lastAt ? `${c.ok ? 'ok' : `failed${c.detail ? ` (${c.detail})` : ''}`} · ${ago(c.lastAt, range.now)}` : 'no run recorded yet'}
                    <span className="a2-muted"> · {c.schedule}</span>
                  </td>
                </tr>
              ))}
              <tr>
                <td><Dot ok={o.tracking.lastEventAt ? range.now - Date.parse(o.tracking.lastEventAt) < 6 * 3_600_000 : false} />Event tracking</td>
                <td className="l">
                  last event {ago(o.tracking.lastEventAt, range.now)} · last funnel event {ago(o.tracking.lastCanonicalAt, range.now)}
                </td>
              </tr>
              {o.integrations.map((i) => (
                <tr key={i.key}>
                  <td><Dot ok={i.configured} />{i.key}</td>
                  <td className="l">{i.configured ? 'set' : <span className="a2-pill warn">not set — the feature silently does nothing</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Reports in range" def="Stuck = still generating with no progress for 15 minutes. Paid, not delivered = paid report that ended in an error (refund risk).">
          <table className="a2-table">
            <tbody>
              <tr><td>Created</td><td className="tnum a2-strong">{n(o.reports.total)}</td></tr>
              <tr><td>Complete</td><td className="tnum">{n(o.reports.complete)}</td></tr>
              <tr><td>Failed</td><td className="tnum">{o.reports.error ? <span className="a2-pill bad">{n(o.reports.error)}</span> : '0'}</td></tr>
              <tr><td>Generating now</td><td className="tnum">{n(o.reports.generating)}</td></tr>
              <tr><td>Stuck &gt;15 min</td><td className="tnum">{o.reports.stuck ? <span className="a2-pill bad">{n(o.reports.stuck)}</span> : '0'}</td></tr>
              <tr><td>Paid, not delivered</td><td className="tnum">{o.reports.paidNotDelivered ? <span className="a2-pill bad">{n(o.reports.paidNotDelivered)}</span> : '0'}</td></tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div style={{ height: 16 }} />
      <div className="a2-grid half">
        <Panel title="Generation cost (LLM)" def="From agent_runs.cost_usd_micro as recorded by the pipeline. Calls that did not record a cost count as $0, so this is a floor.">
          {o.cost ? (
            <>
              <table className="a2-table">
                <tbody>
                  <tr><td>Total in range</td><td className="tnum a2-strong">{usd(o.cost.totalUsd)}</td></tr>
                  <tr><td>Per report</td><td className="tnum">{usd(o.cost.perReportUsd)}</td></tr>
                  <tr><td>Model calls</td><td className="tnum">{n(o.cost.calls)}</td></tr>
                </tbody>
              </table>
              {o.cost.byModel.length > 0 && (
                <table className="a2-table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Model</th><th>Calls</th><th>Cost</th></tr></thead>
                  <tbody>
                    {o.cost.byModel.slice(0, 8).map((m) => (
                      <tr key={m.model}><td className="l">{m.model}</td><td className="tnum">{n(m.calls)}</td><td className="tnum">{usd(m.usd)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="a2-empty">No cost data available.</p>
          )}
        </Panel>

        <Panel title="Pipeline runs" def="report_runs: one row per generation attempt.">
          {o.runs ? (
            <>
              <table className="a2-table">
                <tbody>
                  <tr><td>Complete</td><td className="tnum a2-strong">{n(o.runs.complete)}</td></tr>
                  <tr><td>Error</td><td className="tnum">{n(o.runs.error)}</td></tr>
                  <tr><td>Timeout</td><td className="tnum">{n(o.runs.timeout)}</td></tr>
                  <tr><td>Running</td><td className="tnum">{n(o.runs.running)}</td></tr>
                </tbody>
              </table>
              {o.runs.topErrors.length > 0 && (
                <table className="a2-table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Error class</th><th>Count</th></tr></thead>
                  <tbody>
                    {o.runs.topErrors.map((x) => (
                      <tr key={x.label}><td className="l">{x.label}</td><td className="tnum">{n(x.count)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="a2-empty">Run tracking not available.</p>
          )}
        </Panel>
      </div>

      <div style={{ height: 16 }} />
      <Panel title="Recent failures" meta={`latest ${o.failures.length}`}>
        {o.failures.length === 0 ? (
          <p className="a2-empty">None in this range.</p>
        ) : (
          <div className="a2-tablewrap">
            <table className="a2-table">
              <thead><tr><th>When (IST)</th><th className="l">Status</th><th className="l">Plan</th><th>Report</th></tr></thead>
              <tbody>
                {o.failures.map((r) => (
                  <tr key={r.id}>
                    <td className="tnum">{when(r.at)}</td>
                    <td className="l"><span className="a2-pill bad">{r.status}</span></td>
                    <td className="l a2-muted">{r.plan ?? '—'}</td>
                    <td><Link href={`/report/${r.id}`}>open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Foot range={range} />
    </>
  );
}
