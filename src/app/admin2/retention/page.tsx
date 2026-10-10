import { loadCtx, parseRange } from '@/lib/admin2/load';
import { retentionView } from '@/lib/admin2/views';
import { Foot, PageHead, Panel, Warnings, n } from '../_ui';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;

const SMALL_COHORT = 10;

/** One-hue scale: deeper indigo = more of the cohort came back. */
function cellStyle(p: number): React.CSSProperties {
  if (p <= 0) return { color: 'var(--a2-ink-4)' };
  const a = Math.min(0.85, 0.08 + (p / 100) * 0.9);
  return { background: `rgba(74, 79, 168, ${a.toFixed(2)})`, color: a > 0.45 ? '#fff' : 'var(--a2-ink)' };
}

export default async function RetentionPage({ searchParams }: { searchParams: SP }) {
  const range = parseRange(searchParams);
  const ctx = await loadCtx();
  const r = await retentionView(range, ctx);
  const width = Math.max(0, ...r.rows.map((x) => x.retentionPct.length));

  return (
    <>
      <PageHead title="Retention" sub="Weekly sign-up cohorts: who came back in the weeks after signing up. Range buttons do not apply here; this always shows the last 10 weeks." range={range} path="/admin2/retention" />
      <Warnings items={r.warnings} />
      <Panel
        title="Cohorts by sign-up week"
        def={`A person is “back” in a week if they did anything on the site while signed in that week. Week 0 is the sign-up week. Cohorts under ${SMALL_COHORT} people are greyed: a percentage of 3 people is noise. The newest column of each row is still in progress.`}
      >
        {r.rows.length === 0 ? (
          <p className="a2-empty">No sign-ups in the last 10 weeks.</p>
        ) : (
          <div className="a2-tablewrap">
            <table className="a2-table a2-heat">
              <thead>
                <tr>
                  <th>Week of</th>
                  <th>People</th>
                  <th>Paid</th>
                  {Array.from({ length: width }, (_, i) => (
                    <th key={i} style={{ textAlign: 'center' }}>W{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row) => {
                  const small = row.cohortSize < SMALL_COHORT;
                  return (
                    <tr key={row.cohortWeek} style={small ? { opacity: 0.55 } : undefined}>
                      <td className="tnum">{new Date(row.cohortWeek).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td className="tnum a2-strong">{n(row.cohortSize)}</td>
                      <td className="tnum">{n(row.paid)}</td>
                      {Array.from({ length: width }, (_, i) => {
                        const v = row.retentionPct[i];
                        const last = i === row.retentionPct.length - 1;
                        return (
                          <td key={i} className="c tnum">
                            {v === undefined ? '' : (
                              <span style={cellStyle(v)} title={last ? 'Week still in progress' : undefined}>
                                {v}%{last ? '*' : ''}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Foot range={range} />
    </>
  );
}
